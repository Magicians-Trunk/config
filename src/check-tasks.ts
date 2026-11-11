import { existsSync, readFileSync, realpathSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';

/** The commands a package's checks run, by task name: `build`, `typecheck`, `test` and the like. */
export type CheckCommands = Record<string, string>;

/** A glob resolved from the workspace root, as Vite Task takes it. */
interface WorkspaceGlob {
  pattern: string;
  base: 'workspace';
}

/** What installing, building and testing write: never an input. */
const generated = [
  'node_modules',
  'coverage',
  'dist',
  '.nuxt',
  '.output',
  '.data',
  'storybook-static',
  'release',
  'desktop-out',
  'charts',
  // Python tooling's environment and caches (uv, ruff, pytest, coverage).
  '.venv',
  '.ruff_cache',
  '.pytest_cache',
  '__pycache__',
  '.coverage',
];

/** Workspace files every package's checks read: pinned versions, root config, the Node version. */
const workspaceFiles = [
  'pnpm-lock.yaml',
  'pnpm-workspace.yaml',
  'vite.config.ts',
  'tsconfig.json',
  '.node-version',
];

const glob = (pattern: string): WorkspaceGlob => ({ pattern, base: 'workspace' });

/** Vite Task's own record of the files a task reads. */
const readFiles = { auto: true } as const;

function workspaceRoot(from: string): string {
  for (let folder = from; ; folder = dirname(folder)) {
    if (existsSync(join(folder, 'pnpm-workspace.yaml'))) return folder;
    if (dirname(folder) === folder) throw new Error(`${from} is not in a workspace`);
  }
}

/** The package folder and the folders of every workspace package it depends on, at any depth. */
function packageFolders(folder: string, found = new Set<string>()): Set<string> {
  if (found.has(folder)) return found;
  found.add(folder);
  const manifest = JSON.parse(readFileSync(join(folder, 'package.json'), 'utf8'));
  const dependencies: Record<string, string> = {
    ...manifest.dependencies,
    ...manifest.devDependencies,
  };
  for (const [name, version] of Object.entries(dependencies)) {
    if (version.startsWith('workspace:')) {
      packageFolders(realpathSync(join(folder, 'node_modules', name)), found);
    }
  }
  return found;
}

/**
 * Vite Task definitions for a package's checks, cached on what they read: the package, every
 * workspace package it depends on, and the workspace's lockfile and root config.  A change to any
 * of them runs the task again; nothing is restored from the cache but its output to the terminal.
 * `build` is cached on the files it actually reads, as Vite Task records them: a SERVICE's build
 * uses only part of the packages it depends on (never service-kit's CLI builder), and building
 * again for a change it never reads makes a new image for nothing.
 */
export function checkTasks(packageFolder: string, commands: CheckCommands) {
  const root = workspaceRoot(packageFolder);
  const excluded = [...generated.map((folder) => glob(`!**/${folder}/**`)), glob('!**/Chart.lock')];
  const input = [
    ...[...packageFolders(packageFolder)].map((folder) => glob(join(relative(root, folder), '**'))),
    ...workspaceFiles.map(glob),
    ...excluded,
  ];
  return Object.fromEntries(
    Object.entries(commands).map(([name, command]) => [
      name,
      {
        command,
        cache: { input: name === 'build' ? [readFiles, ...excluded] : input, output: [] },
      },
    ]),
  );
}
