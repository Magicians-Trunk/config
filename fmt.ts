import type { OxfmtConfig } from 'vite-plus/fmt';

/** Oxfmt settings for every package and SERVICE.  Spread into `fmt` in `vite.config.ts`. */
export const fmt = {
  singleQuote: true,
  trailingComma: 'all',
  printWidth: 100,
  sortPackageJson: false,
  ignorePatterns: [
    'pnpm-lock.yaml',
    'pnpm-workspace.yaml',
    // Every .md is generated from Scrivener, or hand-written input to a tool.
    '**/*.md',
    '**/dist/**',
    '**/coverage/**',
    '**/.nuxt/**',
    '**/.output/**',
  ],
} satisfies OxfmtConfig;
