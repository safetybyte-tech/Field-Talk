import assert from 'node:assert/strict';
import test from 'node:test';
import { modules } from './helpers/load-typescript.mjs';
import { content, user } from './fixtures/record.mjs';

const quote = 'A stairway, ladder, ramp or other safe means of egress shall be located in trench excavations';
const source = { citation: '1926.651', subpart: 'P', subpart_title: 'Excavations', source_url: 'https://www.ecfr.gov/current/title-29/section-1926.651', text: `# 1926.651 Specific excavation requirements\n\n(c) ${quote} that are 4 feet or more in depth so as to require no more than 25 feet of lateral travel for employees.` };
async function generate({ retrieval = 'grounded', supported = true } = {}) {
  let prompt;
  let priorityFetched = false;
  const load = modules(async (url, options) => {
    if (url.endsWith('/auth/v1/user')) return Response.json(user);
    if (url.endsWith('/get_daily_ai_usage')) return Response.json(0);
    if (url.endsWith('/embeddings')) return retrieval === 'unavailable' ? new Response('', { status: 503 }) : Response.json({ data: [{ embedding: [0.1] }] });
    if (url.endsWith('/match_osha_standards')) return Response.json([]);
    if (url.includes('/osha_standards?')) { priorityFetched = true; return Response.json(retrieval === 'grounded' ? [source] : []); }
    if (url.endsWith('/responses')) {
      prompt = JSON.parse(options.body).input[0].content;
      const generated = { ...content, practices: ['Provide safe ladder egress within 25 feet (1926.651)'], citations: [{ citation: '1926.651', sections: ['practices'], supporting_quote: supported ? quote : 'This invented quote is not in the retrieved source.' }] };
      return Response.json({ output: [{ type: 'message', content: [{ type: 'output_text', text: JSON.stringify(generated) }] }], usage: { total_tokens: 100 } });
    }
    if (url.endsWith('/harness_v2_runs') || url.endsWith('/ai_usage')) return new Response(null, { status: 201 });
    throw new Error(`Unexpected network: ${url}`);
  });
  const worker = load('worker/src/index.ts').default;
  const response = await worker.fetch(new Request('http://localhost/v2/generate-talk', { method: 'POST', headers: { Authorization: 'Bearer mock', 'Content-Type': 'application/json' }, body: JSON.stringify({ workDescription: 'Excavating a wet trench after rain' }) }), { SUPABASE_URL: 'https://supabase.invalid', SUPABASE_SERVICE_ROLE_KEY: 'mock', OPENAI_API_KEY: 'mock', ENABLE_HARNESS_V2: 'true' });
  assert.equal(response.status, 200);
  const result = await response.json();
  return { ...result, content: JSON.parse(result.content), prompt, priorityFetched };
}
test('V2 fetches priority evidence when semantic matches are empty and retains supported citations', async () => {
  const result = await generate();
  assert.equal(result.priorityFetched, true);
  assert.equal(result.harness.retrieval.status, 'grounded');
  assert.ok(result.prompt.includes('25 feet'));
  assert.equal(result.content.citations[0].citation, '1926.651');
  assert.deepEqual(result.content.citations[0].sections, ['practices']);
  assert.match(result.content.practices[0], /1926.651/);
});
test('V2 removes invented supporting quotes from inline citations and flags review', async () => {
  const result = await generate({ supported: false });
  assert.equal(result.content.citations.length, 0);
  assert.ok(!JSON.stringify(result.content).includes('1926.651'));
  assert.ok(result.harness.validation.some(c => c.id === 'citation_support' && c.status === 'review_required'));
});
for (const retrieval of ['no_match', 'unavailable']) test(`V2 exposes ${retrieval} and removes unsupported citations`, async () => {
  const result = await generate({ retrieval });
  assert.equal(result.harness.retrieval.status, retrieval);
  assert.equal(result.content.citations.length, 0);
  assert.ok(result.prompt.includes('No OSHA source was retrieved'));
});
