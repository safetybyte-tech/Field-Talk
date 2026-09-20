import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';
import { modules, root } from './load-typescript.mjs';
import { record, user } from '../fixtures/record.mjs';

// Actual PostgreSQL migration and actual Worker; only auth and Resend are fakes.
export async function deliveryHarness() {
  const db = new PGlite();
  await db.exec(`
    create role anon; create role authenticated; create role service_role;
    create schema auth; create table auth.users(id uuid primary key);
    insert into auth.users values ('${user.id}');
    create table public.talks (
      id uuid primary key, user_id uuid references auth.users(id), title text, content text, date date,
      location text, project_number text, weather text, supervisor text, supervisor_email text,
      attendees jsonb, recipients jsonb, created_at timestamptz default now(), submitted_at timestamptz
    );
  `);
  await db.exec(readFileSync(`${root}/supabase/migrations/20260920120000_talk_deliveries.sql`, 'utf8'));
  const authenticatedUser = structuredClone(user);
  const provider = new Map();
  const attempts = [];
  const faults = { lookup: false, reserve: false, acknowledge: false, complete: false, loseProviderResponse: false, providerStatus: 200 };
  const loader = modules(async (url, opts) => {
    if (url.endsWith('/auth/v1/user')) return Response.json(authenticatedUser);
    if (url.includes('/rest/v1/rpc/')) {
      const name = url.split('/').at(-1);
      const args = JSON.parse(opts.body);
      const fault = { find_talk_delivery: 'lookup', reserve_talk_delivery: 'reserve', acknowledge_talk_delivery: 'acknowledge', complete_talk_delivery: 'complete' }[name];
      if (!fault) throw new Error(`Unexpected RPC ${name}`);
      if (faults[fault]) return Response.json({ message: 'Injected database failure' }, { status: 503 });
      try {
        const params = Object.entries(args);
        const result = await db.query(`select public.${name}(${params.map(([key], i) => `${key} => $${i + 1}`).join(',')}) as result`, params.map(([, value]) => typeof value === 'object' ? JSON.stringify(value) : value));
        if (name === 'acknowledge_talk_delivery') return new Response(null, { status: 204 });
        return Response.json(result.rows[0].result);
      } catch (error) { return Response.json({ message: error.message }, { status: 400 }); }
    }
    if (url === 'https://api.resend.com/emails') {
      const key = opts.headers['Idempotency-Key'];
      attempts.push({ key, body: opts.body });
      if (faults.providerStatus !== 200) return Response.json({ error: 'Provider unavailable' }, { status: faults.providerStatus });
      if (provider.has(key) && provider.get(key).body !== opts.body) return Response.json({ error: 'Different payload for key' }, { status: 409 });
      if (!provider.has(key)) provider.set(key, { id: `mail-${provider.size + 1}`, body: opts.body });
      if (faults.loseProviderResponse) throw new Error('Connection closed after acceptance');
      return Response.json({ id: provider.get(key).id });
    }
    throw new Error(`Unexpected network: ${url}`);
  });
  const worker = loader('worker/src/index.ts', '\nexport { buildTalkEmail };');
  const metadata = loader('src/utils/talkMetadata.ts');
  const env = { SUPABASE_URL: 'https://supabase.invalid', SUPABASE_SERVICE_ROLE_KEY: 'mock', RESEND_API_KEY: 'mock', RESEND_FROM_EMAIL: 'mock@example.com', CORS_ORIGIN: 'http://localhost' };
  const seed = async (talk = record()) => {
    await db.query('insert into public.talks (id,user_id,title,content,date,location,project_number,weather,supervisor,supervisor_email,attendees,recipients) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) on conflict (id) do nothing', [talk.id,user.id,talk.title,metadata.encodeTalkContent(talk),talk.date,talk.location,talk.projectNumber,talk.weather,talk.supervisor,talk.supervisorEmail,JSON.stringify(talk.attendees),JSON.stringify(talk.recipients)]);
  };
  const savedTalk = async () => {
    const { rows: [row] } = await db.query('select * from public.talks limit 1');
    const decoded = metadata.decodeTalkContent(row.content);
    return { ...decoded.metadata, id: row.id, title: row.title, content: decoded.content, date: new Date(row.date).toISOString().slice(0,10), location: row.location, projectNumber: row.project_number, weather: row.weather, supervisor: row.supervisor, supervisorEmail: row.supervisor_email, attendees: row.attendees, recipients: row.recipients, createdAt: Date.parse(row.created_at), submittedAt: row.submitted_at ? Date.parse(row.submitted_at) : undefined, deliveryPending: !row.submitted_at && decoded.metadata.deliveryPending };
  };
  const saveDraft = async talk => {
    await db.query('update talks set title=$2,content=$3,date=$4,location=$5,project_number=$6,weather=$7,supervisor=$8,supervisor_email=$9,attendees=$10,recipients=$11 where id=$1', [talk.id,talk.title,metadata.encodeTalkContent(talk),talk.date,talk.location,talk.projectNumber,talk.weather,talk.supervisor,talk.supervisorEmail,JSON.stringify(talk.attendees),JSON.stringify(talk.recipients)]);
    return savedTalk();
  };
  await seed();
  return { user: authenticatedUser, db, provider, attempts, faults, worker, seed, savedTalk, saveDraft, close: () => db.close(), send: (talk, pdf, routePath = '/v2/send-talk') => worker.default.fetch(new Request(`http://localhost${routePath}`, { method: 'POST', headers: { Authorization: 'Bearer mock', 'Content-Type': 'application/json' }, body: JSON.stringify({ talk, pdf }) }), env) };
}
