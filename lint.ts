import type { OxlintConfig } from 'vite-plus/lint';

/** Oxlint settings for every package and SERVICE.  Spread into `lint` in `vite.config.ts`. */
export const lint = {
  categories: { correctness: 'error', suspicious: 'error' },
  plugins: ['eslint', 'typescript', 'unicorn', 'oxc', 'import', 'vitest', 'vue'],
  jsPlugins: [
    { name: 'vite-plus', specifier: 'vite-plus/oxlint-plugin' },
    { name: 'magicians', specifier: '@magicians/config/oxlint-plugin' },
  ],
  rules: {
    'magicians/no-cross-service-imports': 'error',
    'vite-plus/prefer-vite-plus-imports': 'error',
    'no-console': ['error', { allow: ['warn', 'error'] }],
    'typescript/restrict-template-expressions': ['error', { allowNumber: true }],
    // Internal imports are relative, so a file reads the same in any app or out of The Trunk.
    // Only Nuxt's own virtual modules may use `#`.
    'no-restricted-imports': [
      'error',
      {
        patterns: [
          {
            group: ['~/*', '~~/*', '@/*', '#*', '!#imports', '!#app', '!#components'],
            message: 'Import internal files by relative path, not through an alias.',
          },
        ],
      },
    ],
  },
  ignorePatterns: ['**/dist/**', '**/coverage/**', '**/.nuxt/**', '**/.output/**'],
  options: { typeAware: true },
} satisfies OxlintConfig;
