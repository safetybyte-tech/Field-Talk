import test from 'node:test';
import assert from 'node:assert/strict';
import { modules } from './helpers/load-typescript.mjs';
import { record } from './fixtures/record.mjs';
const { mergeSavedTalk } = modules()('src/utils/talkRecords.ts');

test('saving an older record retains creation order and the newest unfinished draft', () => {
  const newer = { ...record(), id:'newer', createdAt:300 };
  const older = { ...record(), id:'older', createdAt:100 };
  const filed = { ...record(), id:'filed', createdAt:200, submittedAt:500 };
  const result = mergeSavedTalk([newer,filed,older], { ...older, title:'Edited older draft' });
  assert.deepEqual(Array.from(result, item => item.id), ['newer','filed','older']);
  assert.equal(result.find(item => !item.submittedAt).id, 'newer');
  assert.equal(result[2].title, 'Edited older draft');
});

test('first persistence replaces a temporary identity without duplicate records', () => {
  const temporary = { ...record(), id:'talk_temporary',createdAt:300 };
  const saved = { ...temporary,id:'persisted-uuid' };
  const result = mergeSavedTalk([temporary, { ...record(),id:'old',createdAt:100 }],saved,temporary.id);
  assert.deepEqual(Array.from(result,item => item.id), ['persisted-uuid','old']);
  assert.equal(mergeSavedTalk(result,saved).length,2);
});
