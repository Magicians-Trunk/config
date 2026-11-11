import { mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { RuleTester } from 'vite-plus/lint/plugins-dev';
import { afterAll, describe, it } from 'vite-plus/test';
import plugin from './oxlint-plugin.ts';

RuleTester.describe = describe;
RuleTester.it = it;
RuleTester.itOnly = it.only;

const root = realpathSync(mkdtempSync(join(tmpdir(), 'boundary-')));
writeFileSync(join(root, 'pnpm-workspace.yaml'), 'packages: []\n');
const folders = {
  'services/alpha': '@magicians/alpha',
  'services/beta': 'beta-server',
  'services/aiathome': '@magicians/aiathome',
  'packages/kit': '@magicians/kit',
};
for (const [folder, name] of Object.entries(folders)) {
  mkdirSync(join(root, folder, 'src'), { recursive: true });
  writeFileSync(join(root, folder, 'package.json'), JSON.stringify({ name }));
}
mkdirSync(join(root, 'services/no-manifest'));
mkdirSync(join(root, 'services/unnamed'));
writeFileSync(join(root, 'services/unnamed/package.json'), '{}');

const noServices = realpathSync(mkdtempSync(join(tmpdir(), 'no-services-')));
writeFileSync(join(noServices, 'pnpm-workspace.yaml'), 'packages: []\n');
const outside = realpathSync(mkdtempSync(join(tmpdir(), 'no-workspace-')));
afterAll(() => {
  for (const folder of [root, noServices, outside]) rmSync(folder, { recursive: true });
});

const alpha = join(root, 'services/alpha/src/index.ts');
const kit = join(root, 'packages/kit/src/index.ts');
const litellm = join(root, 'services/aiathome/apps/litellm/hooks.ts');

new RuleTester().run('no-cross-service-imports', plugin.rules['no-cross-service-imports']!, {
  valid: [
    { filename: alpha, code: "import { x } from './local.ts';" },
    { filename: alpha, code: "import { db } from '../db/client.ts';" },
    { filename: alpha, code: "import { contract } from '@magicians/kit';" },
    { filename: alpha, code: "import { z } from 'zod';" },
    { filename: alpha, code: "import { self } from '@magicians/alpha/contract';" },
    { filename: alpha, code: 'const m = await import(name);' },
    { filename: alpha, code: 'export const value = 1;' },
    { filename: litellm, code: "import { app } from '../../server/app.ts';" },
    { filename: kit, code: "import { x } from '../../kit/src/x.ts';" },
    { filename: join(root, 'vite.config.ts'), code: "import { y } from './services';" },
    { filename: join(noServices, 'packages/a/x.ts'), code: "import { y } from 'beta-server';" },
    { filename: join(outside, 'file.ts'), code: "import { y } from '@magicians/alpha';" },
  ],
  invalid: [
    {
      filename: alpha,
      code: "import { db } from '../../beta/src/db.ts';",
      errors: [
        { messageId: 'crossService', data: { from: 'services/alpha', to: 'services/beta' } },
      ],
    },
    {
      filename: alpha,
      code: "import { client } from 'beta-server/db';",
      errors: [
        { messageId: 'crossService', data: { from: 'services/alpha', to: 'services/beta' } },
      ],
    },
    {
      filename: litellm,
      code: "export * from '@magicians/alpha';",
      errors: [
        { messageId: 'crossService', data: { from: 'services/aiathome', to: 'services/alpha' } },
      ],
    },
    {
      filename: alpha,
      code: "export { a } from '../../aiathome/apps/litellm/a.ts';",
      errors: [{ messageId: 'crossService' }],
    },
    {
      filename: kit,
      code: "const m = await import('@magicians/alpha');",
      errors: [{ messageId: 'crossService', data: { from: 'this package', to: 'services/alpha' } }],
    },
  ],
});
