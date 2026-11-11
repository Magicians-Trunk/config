import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { defineRule, type ESTree } from 'vite-plus/lint/plugins';

function workspaceRoot(file: string): string | undefined {
  for (let dir = dirname(file); ; dir = dirname(dir)) {
    if (existsSync(join(dir, 'pnpm-workspace.yaml'))) return dir;
    if (dirname(dir) === dir) return undefined;
  }
}

/** `services/<name>` for any path inside that SERVICE. */
function serviceOfPath(root: string, path: string): string | undefined {
  const [folder, name, ...rest] = relative(root, path).split(sep);
  return folder === 'services' && rest.length > 0 ? `services/${name}` : undefined;
}

/** Each SERVICE's package name, read from its `package.json`. */
function servicePackages(root: string): Map<string, string> {
  const services = join(root, 'services');
  const packages = new Map<string, string>();
  if (!existsSync(services)) return packages;
  for (const name of readdirSync(services)) {
    const manifest = join(services, name, 'package.json');
    if (!existsSync(manifest)) continue;
    const pkg: { name?: unknown } = JSON.parse(readFileSync(manifest, 'utf8'));
    if (typeof pkg.name === 'string') packages.set(pkg.name, `services/${name}`);
  }
  return packages;
}

function packageName(specifier: string): string {
  const parts = specifier.split('/');
  return (specifier.startsWith('@') ? parts.slice(0, 2) : parts.slice(0, 1)).join('/');
}

/**
 * SERVICEs talk over their TRANSPORT LAYERS, so code outside a SERVICE never imports code from
 * inside it.  Shared code belongs in `packages/*`.
 */
export const noCrossServiceImports = defineRule({
  meta: {
    type: 'problem',
    docs: { description: 'Disallow importing code from inside another SERVICE' },
    schema: [],
    messages: {
      crossService:
        '{{from}} cannot import from {{to}}.  SERVICEs talk over their TRANSPORT LAYERS; share code through packages/*.',
    },
  },
  create(context) {
    const root = workspaceRoot(context.filename);
    if (root === undefined) return {};
    const from = serviceOfPath(root, context.filename);
    let packages: Map<string, string> | undefined;

    const check = (source: ESTree.Expression | null) => {
      if (source?.type !== 'Literal' || typeof source.value !== 'string') return;
      const specifier = source.value;
      const to = specifier.startsWith('.')
        ? serviceOfPath(root, resolve(dirname(context.filename), specifier))
        : (packages ??= servicePackages(root)).get(packageName(specifier));
      if (to === undefined || to === from) return;
      context.report({
        node: source,
        messageId: 'crossService',
        data: { from: from ?? 'this package', to },
      });
    };

    return {
      ImportDeclaration: (node) => check(node.source),
      ExportNamedDeclaration: (node) => check(node.source),
      ExportAllDeclaration: (node) => check(node.source),
      ImportExpression: (node) => check(node.source),
    };
  },
});
