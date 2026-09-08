import { readFileSync } from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { runInNewContext } from 'node:vm';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
export const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const require = createRequire(path.join(root, 'package.json'));
export function modules(fetch = () => { throw new Error('Unexpected network call'); }) {
  const cache = new Map();
  return function load(relative, extra = '') {
    const filename = path.resolve(root, relative);
    if (cache.has(filename)) return cache.get(filename);
    const exports = {};
    const source = readFileSync(filename, 'utf8') + extra;
    const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
    runInNewContext(code, { exports, require: id => id.startsWith('.') ? load(path.resolve(path.dirname(filename), `${id}.ts`)) : require(id), fetch, URL, Request, Response, Headers, console, Date, TextEncoder, TextDecoder, setTimeout, clearTimeout }, { filename });
    cache.set(filename, exports); return exports;
  };
}
