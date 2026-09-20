import assert from 'node:assert/strict';
import test from 'node:test';
import { deliveryHarness } from './helpers/delivery-harness.mjs';
import { modules } from './helpers/load-typescript.mjs';
import { record, user } from './fixtures/record.mjs';
const review = modules()('src/utils/recordReview.ts');
const signed = () => review.signRecord(record(), user);

for (const phase of ['reserve', 'acknowledge', 'complete', 'loseProviderResponse']) test(`recover ${phase} failure without duplicate delivery`, async t => {
  const h = await deliveryHarness(); t.after(h.close);
  h.faults[phase] = true;
  assert.equal((await h.send(signed())).status, 503);
  assert.equal((await h.savedTalk()).submittedAt, undefined);
  const attemptsBefore = h.attempts.length;
  h.faults[phase] = false;
  // Reopen persisted data after a reload, not an in-memory retry token.
  const retry = phase === 'reserve' ? signed() : await h.savedTalk();
  const response = await h.send(retry);
  assert.equal(response.status, 200, await response.clone().text());
  const result = (await response.json()).talk;
  assert.ok(result.submittedAt);
  assert.equal(h.provider.size, 1);
  assert.ok((await h.savedTalk()).submittedAt);
  if (phase === 'complete') assert.equal(h.attempts.length, attemptsBefore);
  if (h.attempts.length > 1) assert.deepEqual(h.attempts[0], h.attempts[1]);
  assert.equal((await h.send(result)).status, 200);
  assert.equal(h.provider.size, 1);
});

test('concurrent submissions share one immutable payload and receipt', async t => {
  const h = await deliveryHarness(); t.after(h.close);
  const responses = await Promise.all([h.send(signed()), h.send(signed())]);
  for (const response of responses) assert.equal(response.status, 200, await response.clone().text());
  assert.equal(h.provider.size, 1);
  assert.equal((await h.db.query('select count(*) from talk_deliveries')).rows[0].count, 1);
  if (h.attempts.length > 1) assert.deepEqual(h.attempts[0], h.attempts[1]);
});

test('expired uncertain delivery refuses provider call; accepted delivery can still file', async t => {
  const h = await deliveryHarness(); t.after(h.close);
  h.faults.acknowledge = true;
  assert.equal((await h.send(signed())).status, 503);
  await h.db.exec("update talk_deliveries set created_at = now() - interval '25 hours'");
  h.faults.acknowledge = false;
  const response = await h.send(await h.savedTalk());
  assert.equal(response.status, 503);
  assert.match((await response.json()).error, /reconciliation/);
  assert.equal(h.attempts.length, 1);
  // Simulate operator reconciliation against the provider receipt.
  await h.db.query('select acknowledge_talk_delivery($1,id,$2) from talk_deliveries', [user.id,'mail-1']);
  assert.equal((await h.send(await h.savedTalk())).status, 200);
  assert.equal(h.attempts.length, 1);
});

test('pending snapshot cannot be edited, deleted, forged as filed or submitted as another version', async t => {
  const h = await deliveryHarness(); t.after(h.close);
  h.faults.complete = true;
  await h.send(signed());
  await assert.rejects(h.db.exec("update talks set title='Changed'"), /cannot be changed/);
  await assert.rejects(h.db.exec('delete from talks'), /pending/);
  await assert.rejects(h.db.exec('update talks set submitted_at=now()'), /cannot be changed/);
  assert.equal((await h.send(review.signRecord({ ...record(), title: 'Changed' },user))).status, 409);
  assert.equal(h.provider.size, 1);
});

test('ownership and service-only database permissions prevent forged sends', async t => {
  const h = await deliveryHarness(); t.after(h.close);
  await h.db.exec(`insert into auth.users values ('00000000-0000-4000-8000-000000000099'); update talks set user_id='00000000-0000-4000-8000-000000000099'`);
  assert.equal((await h.send(signed())).status, 503);
  assert.equal(h.attempts.length, 0);
  for (const role of ['anon','authenticated']) {
    await h.db.exec(`set role ${role}`);
    await assert.rejects(h.db.exec('select * from talk_deliveries'), /permission denied/);
    await assert.rejects(h.db.query('select complete_talk_delivery($1,$2)',[user.id,record().id]), /permission denied/);
    await h.db.exec('reset role');
  }
});


test('new delivery requires the current signer name; pending recovery survives profile rename', async t => {
  const h = await deliveryHarness(); t.after(h.close);
  const forged = review.signRecord(record(), { ...user, name: 'Someone else' });
  assert.equal((await h.send(forged)).status, 503);
  assert.equal(h.attempts.length, 0);
  h.faults.complete = true;
  await h.send(signed());
  h.user.user_metadata.name = 'Updated profile name';
  h.faults.complete = false;
  const response = await h.send(await h.savedTalk());
  assert.equal(response.status, 200);
  assert.equal((await response.json()).talk.approvedBy, user.name);
  assert.equal(h.attempts.length, 1);
});


test('pending recovery uses the durable reviewed snapshot rather than regenerating current content', async t => {
  const h = await deliveryHarness(); t.after(h.close);
  h.faults.complete = true;
  await h.send(signed());
  h.faults.complete = false;
  const response = await h.send({ ...(await h.savedTalk()), content: 'Changed locally without signing' });
  assert.equal(response.status, 200);
  assert.equal((await response.json()).talk.content, record().content);
  assert.equal(h.attempts.length, 1);
});


test('old clients must refresh before sending; mixed-version rollout cannot send through the legacy endpoint', async t => {
  const h = await deliveryHarness(); t.after(h.close);
  const response = await h.send(signed(), undefined, '/send-talk');
  assert.equal(response.status, 426);
  assert.match((await response.json()).error, /reloading/);
  assert.equal(h.provider.size, 0);
});
