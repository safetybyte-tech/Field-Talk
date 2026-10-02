import assert from 'node:assert/strict';
import test from 'node:test';
import { modules } from './helpers/load-typescript.mjs';
import { record, user } from './fixtures/record.mjs';

const recovery = modules()('src/utils/draftRecovery.ts');
const review = modules()('src/utils/recordReview.ts');
const accountB = '00000000-0000-4000-8000-000000000099';
const store = () => {
  const values = new Map();
  return { values, getItem: key => values.get(key) || null, setItem: (key, value) => values.set(key, value), removeItem: key => values.delete(key) };
};

test('latest unsigned edit survives a new journal instance and stays under its account', () => {
  const memory = store();
  const first = recovery.createDraftJournal(memory, () => 10);
  const original = record();
  first.save(user.id, { ...original, notes: 'first' }, recovery.talkVersion(original));
  first.save(user.id, { ...original, notes: 'latest after connection loss' }, recovery.talkVersion(original));
  const reopened = recovery.createDraftJournal(memory, () => 20);
  assert.equal(reopened.list(user.id)[0].talk.notes, 'latest after connection loss');
  assert.equal(reopened.list(accountB).length, 0);
  assert.equal(recovery.recoveryState(reopened.list(user.id)[0], original), 'ready');
});

test('storage quota and corrupt data fail visibly without claiming a durable copy', () => {
  const memory = store();
  memory.setItem = () => { throw new Error('quota exceeded'); };
  const journal = recovery.createDraftJournal(memory);
  assert.throws(() => journal.save(user.id, record(), null), /quota exceeded/);
  memory.values.set(`field-talk-recovery-v1:${user.id}`, '{not JSON');
  assert.throws(() => journal.list(user.id), /JSON/);
});

test('newer, removed and signed server records block overwrite', () => {
  const original = record();
  const changed = { ...original, notes: 'local edit' };
  const base = recovery.talkVersion(original);
  assert.doesNotThrow(() => recovery.assertCurrentServer(changed, base, original));
  assert.throws(() => recovery.assertCurrentServer(changed, base, { ...original, title: 'newer server title' }), /server record changed/);
  assert.throws(() => recovery.assertCurrentServer(changed, base, null), /server record changed/);
  assert.throws(() => recovery.assertCurrentServer(changed, base, review.signRecord(original, user)), /server record changed/);
  assert.equal(recovery.recoveryState({ version: 1, accountId: user.id, state: 'draft', talk: changed, baseVersion: base, savedAt: 1 }, { ...original, title: 'newer server title' }), 'conflict');
});

test('signed, pending and filed copies cannot reappear as editable drafts', () => {
  const memory = store();
  const journal = recovery.createDraftJournal(memory);
  const signed = review.signRecord(record(), user);
  assert.equal(journal.save(user.id, signed, null).state, 'signed');
  assert.equal(recovery.recoveryState(journal.list(user.id)[0], record()), 'signed');
  const pending = { ...signed, deliveryPending: true };
  journal.save(user.id, pending, null);
  assert.equal(recovery.recoveryState(journal.list(user.id)[0], record()), 'pending-delivery');
  assert.throws(() => journal.save(user.id, record(), null), /Delivery status/);
  journal.save(user.id, { ...pending, submittedAt: Date.now() }, null);
  assert.equal(journal.list(user.id).length, 0);
});

test('pending delivery requires an unchanged account record and current sign-off', () => {
  const original = record();
  const signed = review.signRecord(original, user);
  const pending = { ...signed, deliveryPending: true };
  const base = recovery.talkVersion(original);
  assert.doesNotThrow(() => recovery.assertCurrentDelivery(pending, base, original));
  assert.doesNotThrow(() => recovery.assertCurrentDelivery(pending, base, pending));
  assert.doesNotThrow(() => recovery.assertCurrentDelivery(pending, base, signed));
  assert.throws(() => recovery.assertCurrentDelivery(pending, base, { ...original, notes: 'new server edit' }), /Delivery was not started/);
  assert.throws(() => recovery.assertCurrentDelivery(pending, base, null), /Delivery was not started/);
  assert.throws(() => recovery.assertCurrentDelivery({ ...pending, title: 'tampered' }, base, original), /Delivery was not started/);
});
