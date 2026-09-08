// Executes PDF generation inside workerd, not Node's jsPDF implementation.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { build } from 'esbuild';
import { record, user } from './fixtures/record.mjs';
const require = createRequire(new URL('../worker/package.json', import.meta.url));
const { Miniflare } = require('miniflare');
const output = await build({ stdin: { contents: `import {createTalkPdfAttachment} from './src/utils/talkDocument'; import {signRecord} from './src/utils/recordReview'; export default {fetch() { const attachment=createTalkPdfAttachment(signRecord(${JSON.stringify(record())},${JSON.stringify(user)})); return Response.json(attachment); }};`, resolveDir: process.cwd() }, bundle: true, write: false, format: 'esm', platform: 'browser', target: 'es2022' });
const mf = new Miniflare({ modules: true, script: output.outputFiles[0].text, compatibilityDate: '2024-01-01' });
try {
  const response = await mf.dispatchFetch('http://localhost/pdf');
  assert.equal(response.status, 200);
  const attachment = await response.json();
  assert.match(attachment.filename, /\.pdf$/);
  const pdf = Buffer.from(attachment.content, 'base64');
  assert.equal(pdf.subarray(0, 5).toString(), '%PDF-');
  assert.match(pdf.toString(), /QA Reviewer/);
  console.log(`workerd PDF generation passed (${pdf.length} bytes)`);
} finally { await mf.dispose(); }
