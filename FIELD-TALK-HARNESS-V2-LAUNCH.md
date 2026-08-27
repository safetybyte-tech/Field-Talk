# Field Talk V2 launch playbook

This is the step-by-step path from the current repository state to a live,
reviewed Harness V2 deployment.

## Current state

- Harness V2 code, audit migration, sync tooling, and corpus are committed in this repository; deployment remains opt-in.
- The production Worker configuration keeps `ENABLE_HARNESS_V2=false`.
- The frontend only uses V2 when `VITE_USE_HARNESS_V2=true`.
- Local mocked smoke cases pass for the disabled gate, daily limit, grounded
  generation, no-match retrieval, and unavailable retrieval paths.
- A real authenticated V2 run has not yet been completed.
- The repository includes the approved OSHA 1926 markdown corpus (378 files),
  ready for the controlled sync step below. Grounded retrieval still requires
  applying the migration and syncing that corpus to the target Supabase project.

Use a separate staging Worker and frontend build first. Keep the existing V1
deployment untouched until the acceptance checks pass.

## 1. Prepare the working tree

From the repository root:

```sh
git status --short --branch
git diff --check
npm ci
npm run lint
npm run build

cd worker
npm ci
./node_modules/.bin/tsc --noEmit
cd ..
```

Review the V2 changes, then commit them before deploying:

```sh
git add src/components/TalkEditor.tsx \
  worker/src/index.ts \
  worker/wrangler.toml \
  worker/README-harness-v2.md \
  supabase/migrations/20260806120000_harness_v2_runs.sql
git commit -m "Add opt-in Harness V2 generation path"
```

Do not commit `.env`, service-role keys, OpenAI keys, or other secrets.

## 2. Prepare Supabase

Use the Supabase SQL Editor or the Supabase CLI. The repository does not
currently include a linked Supabase project configuration, so the SQL Editor is
the simplest route.

### 2.1 Apply the database migrations

Run these files in order:

1. `supabase/migrations/20260704120000_osha_standards.sql`
2. `supabase/migrations/20260806120000_harness_v2_runs.sql`

If the OSHA migration is already applied, only run the Harness V2 migration.

Verify the schema:

```sql
select to_regclass('public.osha_standards') as osha_table,
       to_regclass('public.harness_v2_runs') as harness_table;

select count(*) as indexed_standards
from public.osha_standards;
```

`harness_table` must be `public.harness_v2_runs`. The standards count should be
greater than zero before grounded tests; the committed corpus contains 378
markdown standards and appendices.

### 2.2 Load the OSHA corpus

The approved OSHA 1926 markdown corpus is committed in `data/osha-1926/`.
Each file carries the frontmatter described in
[`scripts/README-osha-sync.md`](scripts/README-osha-sync.md).

Create a local, uncommitted sync environment file:

```sh
cat > .env.sync.local <<'EOF'
SUPABASE_URL=https://<project-ref>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
OPENAI_API_KEY=<openai-api-key>
OPENAI_EMBEDDING_MODEL=text-embedding-3-small
EOF
```

Validate the corpus without writing data:

```sh
node --env-file=.env.sync.local \
  scripts/sync-osha-standards.mjs --dry-run
```

If the dry run reports the expected standards, perform the sync:

```sh
node --env-file=.env.sync.local \
  scripts/sync-osha-standards.mjs
```

The service-role key is used only by this local sync and the Worker. Never put
it in a `VITE_*` variable or frontend bundle.

## 3. Authenticate and configure Cloudflare

Install/use the Worker dependency from `worker/`, then authenticate Wrangler:

```sh
cd worker
npx wrangler login
npx wrangler whoami
```

Create a separate staging Worker. The exact Worker hostname will be printed by
Wrangler after deployment. Set the required secrets on that Worker:

```sh
npx wrangler secret put OPENAI_API_KEY --name fieldtalk-ai-harness-v2
npx wrangler secret put SUPABASE_SERVICE_ROLE_KEY --name fieldtalk-ai-harness-v2
npx wrangler secret put RESEND_API_KEY --name fieldtalk-ai-harness-v2
```

`RESEND_API_KEY` is only needed for sending completed talks. `SUPABASE_URL` is
not currently listed in `worker/wrangler.toml`, so provide it as a deployment
variable.

Deploy V2 with the browser origin that will host the staging frontend:

```sh
export SUPABASE_URL='https://<project-ref>.supabase.co'
export STAGING_FRONTEND_ORIGIN='https://<staging-frontend-domain>'

npx wrangler deploy --name fieldtalk-ai-harness-v2 \
  --var "SUPABASE_URL:${SUPABASE_URL}" \
  --var "CORS_ORIGIN:${STAGING_FRONTEND_ORIGIN}" \
  --var 'ENABLE_HARNESS_V2:true' \
  --var 'HARNESS_V2_DAILY_LIMIT:5' \
  --var 'HARNESS_V2_PROMPT_VERSION:2026-08-06'
```

Keep the production Worker’s `ENABLE_HARNESS_V2=false` until staging passes.

Check basic reachability:

```sh
export STAGING_WORKER_URL='https://fieldtalk-ai-harness-v2.<account>.workers.dev'

curl -i -X OPTIONS "$STAGING_WORKER_URL/v2/generate-talk" \
  -H "Origin: $STAGING_FRONTEND_ORIGIN"
```

Expected result: HTTP `204` with CORS headers. A POST without a bearer token
should return HTTP `401`; that confirms the route is protected.

## 4. Build a V2 frontend for staging

Create an uncommitted Vite mode file at `.env.harness-v2.local`:

```sh
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<public-anon-key>
VITE_WORKER_URL=https://fieldtalk-ai-harness-v2.<account>.workers.dev
VITE_USE_HARNESS_V2=true
```

Build it with the V2 mode:

```sh
npm run build -- --mode harness-v2
```

Deploy the resulting `dist/` directory using the project’s existing frontend
host. The repository does not contain a frontend deployment command, so use
the provider already serving either `toolbox.safetynetdispatch.com` or
`toolbox.nickrogoff.com`. If the host is Cloudflare Pages, the equivalent is:

```sh
npx wrangler pages deploy dist --project-name <pages-project-name>
```

Make sure the deployed hostname exactly matches `CORS_ORIGIN` on the staging
Worker.

## 5. Get a test access token

Sign in through the staging frontend with a dedicated test account. In the
browser’s authenticated session, obtain the Supabase access token through the
normal application auth flow. Do not paste the token into source control.

For API-only checks, place it only in the current shell:

```sh
export FIELD_TALK_TEST_ACCESS_TOKEN='<short-lived-test-access-token>'
```

## 6. Run the real V2 acceptance cases

Run a request like this for each test case:

```sh
curl -sS -X POST "$STAGING_WORKER_URL/v2/generate-talk" \
  -H "Authorization: Bearer $FIELD_TALK_TEST_ACCESS_TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{
    "workDescription": "Roof work using ladders near an unprotected edge",
    "context": {
      "trade": "Roofing",
      "location": "Test project",
      "weather": "Clear"
    }
  }'
```

Record the response and inspect these fields:

- `harness.retrieval.status`
- `harness.retrieval.sourceCount`
- `harness.retrieval.citations`
- `harness.riskSignals`
- `harness.validation`
- `harness.persisted`
- `content`

Use at least this matrix:

| Case | Input | Expected result |
| --- | --- | --- |
| Grounded fall work | Roof, ladder, edge, or elevated work | `200`; `grounded`; relevant OSHA citation; no unexpected citation; `persisted: true` |
| Grounded excavation | Trenching or excavation | `200`; `grounded`; excavation SIF controls present |
| Grounded electrical | Energized panel or electrical work | `200`; `grounded`; electrical controls present |
| No match | A construction description outside the loaded OSHA corpus | `200`; `no_match`; no OSHA citation claims |
| Retrieval unavailable | Temporarily point a staging Worker at an invalid Supabase URL or mock failure | `200`; `unavailable`; review-required retrieval warning |
| Rate limit | Submit six requests for one test user | First five allowed; sixth returns `429` |
| Persistence | Query the audit table after successful runs | Matching rows exist with request, retrieval, validation, model, prompt version, and output |

For every generated talk, manually check that:

1. The content is practical and task-specific.
2. OSHA citations appear only when retrieved and are linked to the official
   eCFR URL.
3. High-risk work has appropriate SIF controls.
4. `review_required` warnings are visible and understandable.
5. No secrets, prompt text, or irrelevant source instructions appear in output.

Verify persistence in the Supabase SQL Editor:

```sql
select created_at,
       model,
       prompt_version,
       retrieval->>'status' as retrieval_status,
       validation,
       risk_signals
from public.harness_v2_runs
order by created_at desc
limit 20;
```

## 7. Promote to the production Worker

Only after staging acceptance passes:

1. Confirm the production Supabase migration and OSHA corpus are present.
2. Confirm production Worker secrets are set.
3. Deploy the reviewed commit using the production Worker name
   `fieldtalk-ai`.
4. Keep `ENABLE_HARNESS_V2=false` for the first production deploy.
5. Build and deploy the existing frontend with `VITE_USE_HARNESS_V2` unset or
   `false`; verify the existing V1 flow.
6. Enable the V2 Worker route with `ENABLE_HARNESS_V2=true`.
7. Deploy a small V2 frontend audience or staging hostname with
   `VITE_USE_HARNESS_V2=true`.
8. Repeat the grounded and persistence checks against production, using the
   dedicated test account.

Existing V1 users remain on V1 unless their frontend build has
`VITE_USE_HARNESS_V2=true`. The Worker flag is still required, so both flags
must be deliberately enabled before a browser uses V2.

## 8. Roll back quickly

If V2 behaves unexpectedly:

1. Rebuild the frontend with `VITE_USE_HARNESS_V2=false` or remove the flag.
2. Redeploy the frontend.
3. Set the Worker variable back to `ENABLE_HARNESS_V2=false` and redeploy.
4. Leave `harness_v2_runs` data in place for diagnosis unless retention policy
   requires removal.

The V2 route is isolated from V1, so disabling the frontend flag is the fastest
user-facing rollback.

## Troubleshooting

| Symptom | Likely cause | Fix |
| --- | --- | --- |
| `404 Harness V2 is not enabled` | Worker flag is false | Deploy the staging Worker with `ENABLE_HARNESS_V2=true` |
| `401 Invalid or expired token` | Missing/expired Supabase session | Sign in again and use a fresh test token |
| `retrieval.status = unavailable` | Worker cannot reach Supabase/OpenAI, or a secret is missing | Check Worker logs, `SUPABASE_URL`, service key, and OpenAI key |
| `retrieval.status = no_match` for normal OSHA work | Corpus is empty, embeddings are missing, or threshold is too high | Check row count/embeddings and rerun the corpus sync |
| `persisted = false` | Harness migration missing or service-role write failed | Apply the migration and inspect Worker/Supabase logs |
| Browser CORS error | Frontend origin is absent from `CORS_ORIGIN` | Match the deployed hostname exactly |
| V2 button does not appear | Frontend was built without the V2 flag | Rebuild with `VITE_USE_HARNESS_V2=true` |

## Final launch checklist

- [ ] V2 changes reviewed and committed.
- [ ] Frontend lint/build pass.
- [ ] Worker TypeScript check passes.
- [ ] OSHA migration applied.
- [ ] Harness V2 migration applied.
- [ ] OSHA corpus loaded and embeddings present.
- [ ] Staging Worker deployed with V2 enabled.
- [ ] Staging frontend built with V2 enabled.
- [ ] Dedicated test account created.
- [ ] Grounded, no-match, unavailable, rate-limit, and persistence cases pass.
- [ ] Production V1 flow verified.
- [ ] Production rollback path tested or documented.
- [ ] Production frontend and Worker deployment owners identified.
