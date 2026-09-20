import assert from 'node:assert/strict';
import test from 'node:test';
import { modules } from './helpers/load-typescript.mjs';
import { record, user } from './fixtures/record.mjs';
const metadata = modules()('src/utils/talkMetadata.ts');
const row = id => ({ id, title: 'Saved record', content: metadata.encodeTalkContent({ ...record(), deliveryPending: true }), date: '2026-09-08', created_at: '2026-09-08T12:00:00Z', submitted_at: null });
function storageWith(supabase) { return modules(undefined, { 'src/utils/supabase.ts': { supabase } })('src/utils/storage.ts').storage; }

test('records paginate beyond the server row limit using a stable ordering', async () => {
  const calls = [];
  const records = Array.from({ length: 1001 }, (_, i) => row(`talk-${i}`));
  const query = { select: () => query, eq: (column, id) => { assert.equal(column, 'user_id'); assert.equal(id, user.id); return query; }, order: (column, opts) => { calls.push([column,opts]); return query; }, range: async (from,to) => ({ data: records.slice(from,to+1) }) };
  const storage = storageWith({ from: () => query });
  const result = await storage.getTalks(user.id);
  assert.equal(result.length, 1001);
  assert.equal(result.at(-1).id, 'talk-1000');
  assert.deepEqual(JSON.parse(JSON.stringify(calls)), [['created_at',{ ascending:false }],['id',{ ascending:true }],['created_at',{ ascending:false }],['id',{ ascending:true }]]);
});

test('failed later page does not report partial history as complete', async () => {
  const query = { select: () => query, eq: () => query, order: () => query, range: async from => from ? ({ error: new Error('Page unavailable') }) : ({ data: Array.from({length:1000},(_,i) => row(i)) }) };
  await assert.rejects(storageWith({ from: () => query }).getTalks(user.id), /Page unavailable/);
});

test('filed database rows clear the pending flag and returning crew upserts are unique', async () => {
  let upsert;
  const query = { select: () => query, eq: () => query, single: async () => ({ data: { ...row('filed'), submitted_at:'2026-09-08T13:00:00Z' } }), upsert: async rows => { upsert = rows; return {}; } };
  const storage = storageWith({ from: () => query });
  assert.equal((await storage.getTalk('filed')).deliveryPending, false);
  await storage.saveRecentAttendees([{ name:' Crew ',present:true }, { name:'Crew',present:true }, {name:'Visitor',isTemporary:true},{name:'  '}],user.id);
  assert.equal(upsert.length, 1);
  assert.equal(upsert[0].name, 'Crew');
});
