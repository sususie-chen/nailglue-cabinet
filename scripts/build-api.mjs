import * as esbuild from 'esbuild';
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
const deps = Object.keys(pkg.dependencies || {});

await esbuild.build({
  entryPoints: [join(root, 'api/_boot.ts')],
  bundle: true,
  platform: 'node',
  format: 'esm',
  outfile: join(root, 'api/boot.js'),
  external: deps,
  alias: {
    '@db': join(root, 'db'),
    '@contracts': join(root, 'contracts'),
  },
  banner: {
    js: 'import { createRequire } from "module";const require = createRequire(import.meta.url);'
  },
});