import assert from 'node:assert/strict';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { modules, root } from './helpers/load-typescript.mjs';
import { record, content, user } from './fixtures/record.mjs';
const load = modules();
const review = load('src/utils/recordReview.ts');
const safety = load('src/utils/safetyReview.ts');
const evidence = load('worker/src/evidence.ts');
const documents = load('src/utils/talkDocument.ts');
const metadata = load('src/utils/talkMetadata.ts');

for (const [word, risk] of [['excavation', 'excavation'], ['excavating', 'excavation'], ['trenching', 'excavation'], ['shoring', 'excavation'], ['electrical work', 'electrical'], ['rigging suspended loads', 'lifting']]) test(`detects ${word}`, () => assert.ok(safety.getRiskSignals(word).includes(risk)));

test('empty and noun-only SIF fail screening, actionable controls pass', () => {
  for (const sif of [[], ['Trench'], ['Electrical hazard']]) {
    const checks = safety.validateHarnessV2Talk({ ...content, sif }, ['excavation'], 'grounded');
    assert.equal(checks.find(c => c.id === 'sif_coverage').status, 'review_required');
  }
  assert.equal(safety.validateHarnessV2Talk(content, ['excavation'], 'grounded').find(c => c.id === 'sif_coverage').status, 'pass');
});
test('power-line clearance controls count as electrical prevention', () => {
  const c = { ...content, sif: ['Maintain required clearance from power lines using the site control plan', 'Stop the lift if clearance cannot be confirmed'] };
  assert.equal(safety.validateHarnessV2Talk(c, ['electrical'], 'grounded').find(c => c.id === 'sif_coverage').status, 'pass');
});
test('omitted trench egress, spoil, inspection and water controls are flagged', () => {
  const c = { ...content, practices: [], sif: ['Install an adequate protective system'], manual: [] };
  const ids = safety.validateHarnessV2Talk(c, ['excavation'], 'grounded', 'Wet trench after rain').filter(c => c.status === 'review_required').map(c => c.id);
  for (const id of ['excavation_egress', 'excavation_spoil', 'excavation_inspection', 'excavation_water']) assert.ok(ids.includes(id));
});
test('approval is bound to content, context, attendance, distribution and current warnings', () => {
  const signed = review.signRecord(record(), user);
  assert.ok(review.hasCurrentApproval(signed));
  for (const change of [{ title: 'Different work' }, { content: JSON.stringify({ ...content, sif: [] }) }, { notes: 'Changed work' }, { location: 'Elsewhere' }, { weather: 'Storm' }, { attendees: [] }, { recipients: [] }, { date: '2026-09-09' }]) {
    assert.equal(review.hasCurrentApproval({ ...signed, ...change }), false);
    const edited = review.changeRecord(signed, change);
    assert.equal(edited.approved, false); assert.equal(edited.approvedBy, undefined); assert.equal(edited.approvedRecord, undefined);
    if (['title', 'content', 'notes', 'location', 'weather'].some(key => key in change)) assert.equal(edited.harness.editedSinceGeneration, true);
  }
  assert.ok(review.hasCurrentApproval({ ...signed, draftStep: 2, submittedAt: Date.now() }));
  const edited = review.changeRecord(signed, { content: JSON.stringify({ ...content, sif: [] }) });
  assert.ok(review.reviewMessages(edited).some(m => m.includes('Edited since generation')));
  assert.ok(review.reviewMessages(edited).some(m => m.includes('Add serious injury')));
});
test('approval metadata survives persistence; legacy Boolean alone cannot certify a record', () => {
  const signed = review.signRecord(record(), user);
  const decoded = metadata.decodeTalkContent(metadata.encodeTalkContent(signed));
  assert.ok(review.hasCurrentApproval({ ...record(), ...decoded.metadata, content: decoded.content }));
  assert.equal(review.hasCurrentApproval({ ...record(), approved: true, approvedBy: user.name, approvedAt: Date.now() }), false);
});
test('task source selection preserves later excavation provisions', () => {
  const text = readFileSync(path.join(root, 'data/osha-1926/1926.651.md'), 'utf8').replace(/^---[\s\S]*?---\s*/, '');
  const prompt = evidence.buildV2StandardsPrompt([{ citation: '1926.651', subpart_title: 'Excavations', text }], record().notes);
  for (const term of ['25 feet', '2 feet', 'rainstorm', 'water']) assert.ok(prompt.includes(term), term);
  assert.match(prompt, /Specific excavation requirements/i);
});
test('long sources include relevant late paragraphs without slicing paragraphs', () => {
  const paragraphs = Array.from({ length: 120 }, (_, i) => `(${i}) Unrelated clause ${'background '.repeat(25)}`);
  paragraphs.push('(k) Inspect after every rainstorm and verify safe egress within 25 feet.');
  const selected = evidence.selectEvidence({ text: paragraphs.join('\n\n') }, 'trench rainstorm', 4000);
  assert.ok(selected.includes(paragraphs.at(-1)));
});
test('ordinary HVAC lift excludes assembly and negated specialized sources', () => {
  const query = 'HVAC mobile crane lift near roof edge, not structural steel erection and no personnel hoisting';
  for (const [citation, subpart_title] of [['1926.1404', 'Cranes and Derricks in Construction'], ['1926.754', 'Steel Erection'], ['1926.1431', 'Cranes and Derricks in Construction'], ['1926.1423', 'Cranes and Derricks in Construction']]) assert.equal(evidence.isApplicableStandard({ citation, subpart_title }, query), false, citation);
  assert.ok(evidence.isApplicableStandard({ citation: '1926.1404', subpart_title: 'Cranes and Derricks in Construction' }, 'Assembling a mobile crane boom'));
  assert.ok(evidence.isApplicableStandard({ citation: '1926.1431', subpart_title: 'Cranes and Derricks in Construction' }, 'Crane hoisting personnel in a personnel platform'));
});

function sendWorker() {
  const deliveries = [];
  const loader = modules(async (url, opts) => {
    if (url.endsWith('/auth/v1/user')) return Response.json(user);
    if (url === 'https://api.resend.com/emails') { deliveries.push(JSON.parse(opts.body)); return Response.json({ id: 'mock-only' }); }
    throw new Error(`Unexpected network: ${url}`);
  });
  const worker = loader('worker/src/index.ts', '\nexport { buildTalkEmail };');
  const env = { SUPABASE_URL: 'https://supabase.invalid', SUPABASE_SERVICE_ROLE_KEY: 'mock', RESEND_API_KEY: 'mock', RESEND_FROM_EMAIL: 'mock@example.com', CORS_ORIGIN: 'http://localhost' };
  return { deliveries, worker, send: (talk, pdf) => worker.default.fetch(new Request('http://localhost/send-talk', { method: 'POST', headers: { Authorization: 'Bearer mock', 'Content-Type': 'application/json' }, body: JSON.stringify({ talk, pdf }) }), env) };
}
test('server rejects unsigned, stale, forged-identity and malformed records before delivery', async () => {
  const { send, deliveries } = sendWorker();
  const signed = review.signRecord(record(), user);
  for (const bad of [record(), { ...signed, title: 'tampered' }, review.signRecord(record(), { ...user, id: 'another-user' }), review.signRecord(record(), { ...user, name: 'Somebody Else' }), { ...signed, approvedBy: 4 }, { ...signed, attendees: null }]) assert.ok((await send(bad)).status >= 400);
  assert.equal(deliveries.length, 0);
});
test('server generates its own valid PDF and email from the same approved record', async () => {
  const { send, deliveries } = sendWorker();
  const signed = review.signRecord(record(), user);
  assert.equal((await send(signed, { filename: 'unrelated.pdf', content: 'bm90IGEgUERG' })).status, 200);
  assert.equal(deliveries.length, 1);
  const pdf = Buffer.from(deliveries[0].attachments[0].content, 'base64');
  assert.equal(pdf.subarray(0, 5).toString(), '%PDF-');
  assert.match(deliveries[0].text, /QA Reviewer - Signed/);
  assert.match(deliveries[0].text, /QA wet trench review/);
});
test('PDF, HTML and text carry matching review/sign-off semantics', () => {
  const { worker } = sendWorker();
  const unsigned = { ...record(), content: JSON.stringify({ ...content, sif: ['Install protective systems'], practices: [] }) };
  const email = worker.buildTalkEmail(unsigned);
  const html = documents.buildTalkDocumentHtml(unsigned);
  for (const text of [html, email.html, email.text]) {
    for (const message of review.reviewMessages(unsigned)) assert.ok(text.includes(message));
    assert.ok(text.includes(review.UNSIGNED_STATEMENT));
    assert.ok(!text.includes('reviewed and approved by'));
  }
  const pdf = documents.createTalkPdf(unsigned).output();
  assert.match(pdf, /DRAFT - NOT APPROVED/);
  assert.match(pdf, /\/URI \(https:\/\/www.ecfr.gov/);
  if (process.env.FIELD_TALK_QA_OUTPUT) {
    mkdirSync(process.env.FIELD_TALK_QA_OUTPUT, { recursive: true });
    for (const [name, talk] of [['unsigned', unsigned], ['signed', review.signRecord(unsigned, user)]]) {
      writeFileSync(path.join(process.env.FIELD_TALK_QA_OUTPUT, `${name}.pdf`), Buffer.from(documents.createTalkPdf(talk).output('arraybuffer')));
      writeFileSync(path.join(process.env.FIELD_TALK_QA_OUTPUT, `${name}-email.html`), worker.buildTalkEmail(talk).html);
      writeFileSync(path.join(process.env.FIELD_TALK_QA_OUTPUT, `${name}-email.txt`), worker.buildTalkEmail(talk).text);
    }
  }
});
