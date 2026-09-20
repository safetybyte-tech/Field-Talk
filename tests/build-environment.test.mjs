import assert from 'node:assert/strict';
import test from 'node:test';
import { modules } from './helpers/load-typescript.mjs';
const { validateBuildEnvironment } = modules()('scripts/buildEnvironment.ts');
const valid = { VITE_SUPABASE_URL: 'https://supabase.invalid', VITE_SUPABASE_ANON_KEY: 'fixture-only', VITE_WORKER_URL: 'https://worker.invalid' };
for (const key of Object.keys(valid)) test(`build rejects missing ${key}`, () => {
  assert.throws(() => validateBuildEnvironment({ ...valid, [key]: ' ' }), new RegExp(key));
});
test('build rejects malformed service URLs without printing credential values', () => {
  assert.throws(() => validateBuildEnvironment({ ...valid, VITE_WORKER_URL: 'not-a-url' }), /VITE_WORKER_URL/);
  assert.throws(() => validateBuildEnvironment({ ...valid, VITE_SUPABASE_URL: 'https://secret:password@host.invalid' }), error => !error.message.includes('secret'));
});
test('build accepts configured public service endpoints', () => validateBuildEnvironment(valid));
