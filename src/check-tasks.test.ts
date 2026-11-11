import { mkdirSync, mkdtempSync, realpathSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vite-plus/test';
import { checkTasks } from './check-tasks.ts';

/**
 * A workspace where `packages/app` depends on `packages/ui` and `packages/config`, and `ui` on
 * `config` too, each linked into `node_modules` as pnpm links them, beside a registry package.
 */
function workspace(): string {
  const root = realpathSync(mkdtempSync(join(tmpdir(), 'check-tasks-')));
  writeFileSync(join(root, 'pnpm-workspace.yaml'), 'packages:\n  - packages/*\n');
  const add = (name: string, dependsOn: string[]) => {
    const folder = join(root, 'packages', name);
    mkdirSync(join(folder, 'node_modules'), { recursive: true });
    const dependencies = {
      typescript: '6.0.3',
      ...Object.fromEntries(dependsOn.map((other) => [other, 'workspace:*'])),
    };
    writeFileSync(join(folder, 'package.json'), JSON.stringify({ name, dependencies }));
    for (const other of dependsOn)
      symlinkSync(join(root, 'packages', other), join(folder, 'node_modules', other));
  };
  add('config', []);
  add('ui', ['config']);
  add('app', ['ui', 'config']);
  return join(root, 'packages', 'app');
}

describe('checkTasks', () => {
  it('caches each command on the package, its workspace dependencies and the root config', () => {
    const { test } = checkTasks(workspace(), { test: 'vp test run' });
    expect(test?.command).toBe('vp test run');
    expect(test?.cache.output).toEqual([]);
    const patterns = test?.cache.input.map((glob) => ('pattern' in glob ? glob.pattern : ''));
    expect(patterns).toEqual(
      expect.arrayContaining([
        'packages/app/**',
        'packages/ui/**',
        'packages/config/**',
        'pnpm-lock.yaml',
        '!**/node_modules/**',
        '!**/release/**',
        '!**/Chart.lock',
      ]),
    );
    expect(test?.cache.input.every((glob) => 'base' in glob && glob.base === 'workspace')).toBe(
      true,
    );
  });

  it('caches a build on the files it reads, never on generated ones', () => {
    const { build } = checkTasks(workspace(), { build: 'nuxt build' });
    expect(build?.cache.input[0]).toEqual({ auto: true });
    expect(
      build?.cache.input
        .slice(1)
        .every((glob) => 'pattern' in glob && glob.pattern.startsWith('!')),
    ).toBe(true);
  });

  it('lists a package depended on twice once', () => {
    const { test } = checkTasks(workspace(), { test: 'vp test run' });
    const config = test?.cache.input.filter(
      (glob) => 'pattern' in glob && glob.pattern === 'packages/config/**',
    );
    expect(config).toHaveLength(1);
  });

  it('caches a package that is its own workspace on its whole folder', () => {
    const folder = mkdtempSync(join(tmpdir(), 'check-tasks-'));
    writeFileSync(join(folder, 'pnpm-workspace.yaml'), '');
    writeFileSync(join(folder, 'package.json'), '{}');
    const { test } = checkTasks(folder, { test: 'vp test run' });
    expect(test?.cache.input[0]).toEqual({ pattern: '**', base: 'workspace' });
  });

  it('needs a workspace', () => {
    expect(() => checkTasks('/', { test: 'vp test run' })).toThrow('/ is not in a workspace');
  });
});
