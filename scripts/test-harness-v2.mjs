import assert from 'node:assert/strict';
import { build } from 'esbuild';

async function load(entry) {
  const result = await build({entryPoints:[entry],bundle:true,write:false,format:'esm',platform:'node'});
  return import('data:text/javascript;base64,'+Buffer.from(result.outputFiles[0].text).toString('base64'));
}
const {default:worker} = await load('worker/src/index.ts');
const {parseHarnessReview,harnessMessages} = await load('src/utils/harness.ts');
const {encodeTalkContent,decodeTalkContent} = await load('src/utils/talkMetadata.ts');
const env = {ENABLE_HARNESS_V2:'true',DAILY_LIMIT:'20',SUPABASE_URL:'https://qa.invalid',SUPABASE_SERVICE_ROLE_KEY:'fake',OPENAI_API_KEY:'fake',CORS_ORIGIN:'https://qa.invalid'};
const content = {i:'Review the plan.',hazards:['Falling objects'],practices:['Inspect tools'],ppe:['Wear hard hats'],sif:['Keep clear of suspended loads'],manual:['Use lifting aids'],q:['Where is the exclusion zone?'],citations:[]};
let mode='grounded', audit=0, calls=0;
const json = value => new Response(JSON.stringify(value),{headers:{'Content-Type':'application/json'}});
globalThis.fetch = async (url,options={}) => {
  calls++;
  if(url.endsWith('/auth/v1/user')) return json({id:'qa'});
  if(url.endsWith('/rpc/get_daily_ai_usage')) return json(mode==='limit'?20:0);
  if(url.endsWith('/embeddings')) return mode==='unavailable'?new Response('',{status:503}):json({data:[{embedding:[0]}]});
  if(url.endsWith('/rpc/match_osha_standards')) return json(mode==='no_match'?[]:[
    {citation:'1926.753',subpart_title:'Steel Erection',source_url:'https://www.ecfr.gov/current/title-29/section-1926.753'},
    {citation:'1926.1431',subpart_title:'Cranes and Derricks in Construction',source_url:'https://www.ecfr.gov/current/title-29/section-1926.1431'},
    {citation:'1926.501',source_url:'https://www.ecfr.gov/current/title-29/section-1926.501',text:'Use fall protection.'}]);
  if(url.endsWith('/responses')) { assert.equal(JSON.parse(options.body).store,false); return json({output:[{type:'message',content:[{type:'output_text',text:JSON.stringify(content)}]}]}); }
  if(url.endsWith('/harness_v2_runs')) { audit++; return new Response(null,{status:mode==='audit_failure'?503:201}); }
  if(url.endsWith('/ai_usage')) return new Response(null,{status:201});
  throw Error('Unexpected request '+url);
};
const request=()=>new Request('https://qa.invalid/v2/generate-talk',{method:'POST',headers:{Authorization:'Bearer fake','Content-Type':'application/json'},body:JSON.stringify({workDescription:'Review the site plan'})});
assert.equal((await worker.fetch(request(),{...env,ENABLE_HARNESS_V2:'false'})).status,404);
mode='limit'; assert.equal((await worker.fetch(request(),env)).status,429);
for(mode of ['grounded','no_match','unavailable','audit_failure']) {
  const response=await worker.fetch(request(),env); assert.equal(response.status,200);
  const result=await response.json(); const review=parseHarnessReview(result.harness); assert.ok(review);
  assert.equal(review.retrieval.status,mode==='audit_failure'?'grounded':mode);
  assert.equal(review.persisted,mode!=='audit_failure');
  assert.ok(!review.retrieval.citations.includes('1926.753'));
  assert.ok(!review.retrieval.citations.includes('1926.1431'));
  if(mode!=='grounded') assert.ok(harnessMessages(review).length);
  assert.deepEqual(decodeTalkContent(encodeTalkContent({content:result.content,harness:review})).metadata.harness,review);
}
assert.equal(audit,4); assert.ok(calls);
assert.equal(parseHarnessReview({version:'harness-v2',retrieval:null}),undefined);
assert.equal(parseHarnessReview({}),undefined);
assert.equal(decodeTalkContent('Legacy text').content,'Legacy text');
console.log('PASS: V2 disabled, rate limit, grounded, no-match, unavailable, audit failure, review persistence, malformed trace, legacy content.');
