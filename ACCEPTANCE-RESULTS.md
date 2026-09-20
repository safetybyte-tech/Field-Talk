# Release acceptance — September 20, 2026

**Local regression scope is passing; live release acceptance remains blocked.** The original duplicate-email reproduction is now fixed and protected by real Worker/PostgreSQL failure tests. See BUG-LOG.md for each issue, its reproduction and regression evidence. No real email, signup/reset mutation, live database migration, Worker deployment or production frontend deployment was performed.

## Final validation

- Lint; frontend and Worker TypeScript checks: passed.
- Unit, generation, review-integrity, storage, configuration and actual PostgreSQL delivery tests: 44 passed.
- Complete browser suite: 54 passed in the final Chromium/WebKit run; two preceding full passes also passed (96 checks).
- Delivery acceptance: 16 passed (four scenarios × two engines × two runs), using the actual App, Worker and PostgreSQL migration, with fake auth and provider boundaries.
- Mobile interaction: 12 passed (three cases × Pixel 5/Chromium and iPhone 13/WebKit × two runs). Includes touch, reduced keyboard space, landscape/portrait transitions, long recipient wrapping, sign-off, unsupported/denied speech fallback and partial-transcript stop.
- PDF creation inside Cloudflare workerd: passed.
- Frontend production build with synthetic service endpoints and Worker dry-run deployment bundle: passed. Local bundles were not deployed.
- Missing-environment build fails clearly, as required. PWA icons/favicon resolve to real assets.
- Root and Worker dependency audits: zero vulnerabilities at validation time.
- Git whitespace/diff check: passed.

The browser suites use controlled service boundaries. The delivery suite executes the migration in PGlite PostgreSQL against a fixture of the existing talks schema; this does not prove compatibility with an unseen deployed schema or its other policies/triggers. Browser emulation and fake speech APIs do not replace physical-device testing.

## Delivery recovery contract

`/v2/send-talk` verifies new sign-off and ownership, reserves an immutable signed snapshot plus the exact email/PDF payload in PostgreSQL, sends using the receipt's stable provider key, acknowledges the provider receipt, then files the talk. The browser displays success only after server-confirmed filing. No browser database write follows email acceptance.

Retries/reloads use the same stored payload. After provider acknowledgement, retry only finishes filing. Uncertain requests cannot be resent automatically once 23 hours have elapsed; support must reconcile the receipt. This leaves a margin within [Resend's 24-hour idempotency window](https://resend.com/docs/dashboard/emails/idempotency-keys). Concurrent requests, failed reservation/acknowledgement/filing, lost provider/browser responses, expired uncertain state, ownership, service-only permissions, snapshot locking and profile-name changes are covered.

Pending records stay read-only and recoverable; filed records cannot be edited or resent. The legacy `/send-talk` endpoint rejects old clients with a reload instruction. The new frontend never falls back to it. This prevents an old/new deployment mix from reintroducing the unsafe sequence.

## Required rollout — not executed

1. Configure a designated test Supabase instance and Worker plus a usable test inbox. Apply `supabase/migrations/20260920120000_talk_deliveries.sql` to staging after checking its existing talks schema and policies. This migration assumes the pre-existing talks table used by storage.ts; that base schema is not in this repository.
2. Deploy the Worker with the new migration present, preserving the intended live/test secrets, allowed origins and feature flags. Do not blindly replace the deployed Harness V2 settings with wrangler.toml defaults.
3. Deploy the frontend with `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` and `VITE_WORKER_URL` set for that environment. Existing clients must reload before sending; new clients pointed at an older Worker get an error rather than a legacy send.
4. Exercise real signup confirmation, login/logout, reset and expired links. Generate, edit, sign and send a synthetic talk to the test inbox; inspect its PDF and reopen the filed database record.
5. Complete physical iPhone/Android checks below before promoting to production.

The receipt table contains signed record data and email/PDF payloads. It has RLS with no public/authenticated access; service-only RPCs perform mutations. Keep receipts when records are removed so their IDs cannot be resent. Include receipt data in the application's access/retention procedures.

For an old uncertain delivery, verify its exact idempotency key/provider receipt before any action. If provider acceptance is verified, a service-role operator can call `acknowledge_talk_delivery` with the verified provider ID, then `complete_talk_delivery`; both enforce ownership. Do not reset timestamps, delete pending receipts, invent provider IDs or blindly create another copy. If no acceptance can be established, investigation remains necessary. The automated suite covers that deliberate refusal to resend.

## Staging and access blockers

The PR preview inspected earlier (`https://f4c61a2a.toolbox-talk.pages.dev`, commit 02e33ab) bundled missing Supabase values and threw at startup. The build now rejects that configuration, but designated Preview service values have not been supplied or copied from production. A staging URL/inbox or explicit authorization for a new synthetic production account is still pending.

Automatic approval review rejected opening the pre-existing signed-in production tab because staging authorization did not cover that private live account. The session was not inspected and no workaround was used.

A paired iPhone 17 Pro Max was unavailable. Android device tooling was absent. An iPhone simulator booted but screen capture failed, so no simulator acceptance is claimed; that simulator was shut down. No real microphone or OS-keyboard acceptance is claimed.

## Physical acceptance checklist

On an available iPhone/Safari and Android/Chrome, record phone/OS/browser and use clearly labeled synthetic data:

1. Sign in; generate or select a template; type long notes with the real keyboard open.
2. Add/check crew, site/weather and a long recipient address; rotate and verify controls remain reachable without sideways scrolling.
3. Deny microphone permission and type instead; separately allow real dictation and verify transcript/stop behavior.
4. Review, sign, read/download the PDF, send to the test inbox and reopen the filed record.
5. Background/resume, lose connectivity during save, restore it and retry without losing edits. Offline closing is not supported as durable draft storage; the UI tells users to keep the page open.
6. Run real confirmation/reset/expired-link checks with the test mailbox. Preserve evidence without exposing account secrets.
