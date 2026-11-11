import { definePlugin } from 'vite-plus/lint/plugins';
import { noCrossServiceImports } from './no-cross-service-imports.ts';

/** The `magicians` Oxlint plugin. */
export default definePlugin({
  meta: { name: 'magicians' },
  rules: { 'no-cross-service-imports': noCrossServiceImports },
});
