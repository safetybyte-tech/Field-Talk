# Field Talk

A React/Vite toolbox-talk editor backed by Supabase and a Cloudflare Worker for generation and email delivery.

## Local development

Use Node.js 22 or later. Run `npm ci`, copy `.env.example` to `.env`, and configure the Supabase URL/public anon key and Worker URL for your development environment. Run `npm run dev`. Never put Supabase service-role, OpenAI, or Resend secrets in frontend variables.

The optional `VITE_USE_HARNESS_V2=true` flag selects V2 generation. The corresponding Worker setup is described in [worker/README-harness-v2.md](worker/README-harness-v2.md).

## Validation

```sh
npm ci
npm run lint
npm run typecheck
npm test
npm run build
npx playwright install chromium webkit
npm run test:browser
npm run test:mobile
```

On Linux, install browser system dependencies with `npx playwright install --with-deps chromium webkit`.

Browser tests start their own local Vite server at port 4173. They run the real App and components with synthetic auth/storage boundaries and intercepted generation/mail responses. They require no credentials, never send email, and do not write to live accounts. The fixtures are development-only entry points, outside the production build. Screenshots and failure traces are written to `test-results/`; CI uploads them as `browser-validation`.

See [RELEASE-READINESS.md](RELEASE-READINESS.md) for the pass results, reproduced defects, and remaining release risks.

## Release acceptance gates

`npm run test:acceptance` exercises email acceptance followed by a failed database write and retry. **It currently fails:** the retry sends twice. The separate **Delivery release gate** CI job makes this unresolved defect visible; a green ordinary regression suite is not release approval.

`npm run build` now requires `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, and `VITE_WORKER_URL`. Configure all three for Cloudflare **Preview** as well as Production, using the corresponding environment's public frontend values. Never put service-role secrets in these variables. CI uses fake endpoints only for compilation and does not publish that bundle.

See [ACCEPTANCE-RESULTS.md](ACCEPTANCE-RESULTS.md) for the deeper pass, environment blockers, and physical-device checklist.

### Delivery recovery and release checks

Sending now uses `/v2/send-talk` and requires the delivery migration before the updated Worker. Apply and validate `supabase/migrations/20260920120000_talk_deliveries.sql` in staging, deploy the Worker, then the configured frontend. Old clients are asked to reload. There is no fallback to the old send-then-file API.

The Worker persists the signed snapshot and exact email payload before sending. Accepted deliveries can finish filing without another email; uncertain deliveries beyond the safe retry window require receipt reconciliation. Follow the rollout, access requirements and reconciliation notes in [ACCEPTANCE-RESULTS.md](ACCEPTANCE-RESULTS.md). [BUG-LOG.md](BUG-LOG.md) tracks reproduced defects and their regression checks.

Additional server checks:

```sh
npm ci --prefix worker
npm run typecheck:worker
npm run test:worker-runtime
npm audit
npm audit --prefix worker
```

`npm test` runs delivery transitions in local PGlite PostgreSQL. `npm run test:acceptance` connects the real App and Worker to that database and a fake email provider. It sends no real mail. Browser and mobile suites can be repeated with `-- --repeat-each=2`. The CI workflows run the regression gates and retain failure evidence.
