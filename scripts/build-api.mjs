import * as esbuild from 'esbuild';
import { createRequire } from 'module';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const require = createRequire(join(__dirname, '../package.json'));
const { dependencies } = require('../package.json');

await esbuild.build({
  entryPoints: ['api/_boot.ts'],
  bundle: true,
  platform: 'node',
  format: 'esm',
  outfile: 'api/boot.js',
  external: Object.keys(dependencies || {}),  // 只打包项目内代码，所有 node_modules 都 external
  tsconfig: './tsconfig.json',               // 自动读取 paths 别名（@db、@contracts）
  banner: {
    js: 'import { createRequire } from "module";const require = createRequire(import.meta.url);'
  },
});