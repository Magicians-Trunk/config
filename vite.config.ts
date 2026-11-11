import { defineConfig } from 'vite-plus';
import { fmt } from './fmt.ts';
import { lint } from './lint.ts';
import { checkTasks } from './src/check-tasks.ts';

/** This package's checks, as Vite Tasks cached on what they read, and its lint and format rules. */
export default defineConfig({
  lint,
  fmt,
  run: {
    tasks: checkTasks(import.meta.dirname, {
      build: 'tsc -p tsconfig.build.json',
      typecheck: 'tsc -p .',
      test: 'vp test run --coverage',
      lint: 'vp lint',
    }),
  },
});
