import { defineConfig, mergeConfig, type ViteUserConfig } from 'vite-plus/test/config';

/** Vitest settings with the 100% coverage thresholds (Testing Standards). */
export function createVitestConfig(overrides: ViteUserConfig = {}): ViteUserConfig {
  return mergeConfig(
    defineConfig({
      test: {
        include: ['src/**/*.test.ts', 'test/**/*.test.ts'],
        coverage: {
          provider: 'v8',
          include: ['src/**/*.ts'],
          exclude: ['src/**/*.test.ts', 'src/**/*.d.ts'],
          reporter: ['text', 'json-summary'],
          thresholds: { lines: 100, branches: 100, functions: 100, statements: 100 },
        },
      },
    }),
    overrides,
  );
}
