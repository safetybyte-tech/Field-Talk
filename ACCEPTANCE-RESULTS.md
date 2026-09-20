# Deeper release acceptance — September 20, 2026

**Disposition: not ready to release.** The deeper pass found a reproducible delivery-retry defect and an unusable staging build. Real account/inbox and physical-device acceptance are still pending access. No real email, signup, reset, account mutation, or production deployment was performed in this follow-up.

## Delivery recovery: FAIL

Run `npm run test:acceptance` (Chromium and WebKit). This runs the real App/API with simulated mail acceptance and database failures. It is a separate release gate, intentionally fails on the current implementation, and is not skipped or marked as an expected failure.

1. Open the saved synthetic draft, progress through crew, acknowledge review items, and sign.
2. `/send-talk` returns success, representing an accepted email.
3. Fail the subsequent `storage.saveTalk` call.
4. Observe an error and zero filed records.
5. Restore storage and retry.
6. **Observed in both engines:** two accepted mail requests with different `submittedAt` values, followed by one filed record. **Required:** one mail request, followed by successful recovery/filing of that delivery.

Because the worker's idempotency key incorporates `submittedAt`, this is not protected by its existing key. This test confirms the previously inspection-only P1 issue. The separate **Delivery release gate** CI workflow exposes the failure. Traces and compact delivery evidence are retained in `acceptance-results/` and uploaded by CI.

A safe fix needs durable submission identity and accepted/uncertain/filed state shared across retries and reloads, including handling the provider's idempotency-retention window. An in-memory flag or blindly moving the database write before email would not solve both missing-record and duplicate-email outcomes. No unverified backend/schema redesign is included in this testing follow-up.

## Staging deployment: BLOCKED; build guard fixed

Cloudflare lists `https://f4c61a2a.toolbox-talk.pages.dev` as the preview for PR commit `02e33ab`. Its main bundle (`index-DlD3pI45.js`) defines both Supabase configuration values as `void 0` and immediately throws `Missing Supabase environment variables`. No configured Worker URL appears in that bundle either. This preview cannot execute real signup, login, or generation.

The build now checks all three required frontend variables and rejects missing/malformed configuration before producing an unusable deployment. Tests cover each missing variable and invalid service URLs without exposing credentials. A build with synthetic endpoints succeeds; an unconfigured build fails with the expected clear error.

To unblock: configure the Cloudflare Preview environment with a designated test Supabase URL/public anon key and Worker URL, or explicitly authorize a synthetic account against the live services. Production settings and secrets have not been copied or changed. A test inbox/account is also needed for confirmation/reset links and receipt/PDF verification. The auto-created preview from the original PR push is not a production deployment.

## Mobile: emulation and device limitations

The original 32-check suite already passed Chromium/WebKit at 375, 390, 768, and 1280 pixels. This follow-up adds touch-enabled Pixel 5/Chromium and iPhone 13/WebKit profiles, a 420-pixel reduced viewport to approximate keyboard space, recipient entry, sign-off, and unavailable-dictation fallback. These are automated approximations, not real OS keyboards or speech recognition.

Initial Android emulation: both new cases passed. Initial iPhone emulation: WebKit timed out during browser/page setup, before Field Talk loaded. Subsequent environment interruption removed the cached browser executables; the runtimes were restored in a temporary test directory for a final rerun. **Final rerun: all 4 new mobile-emulation checks passed (2 in each device profile).** This resolves the browser-runtime setup failure, but does not replace physical-phone acceptance.

Physical-device discovery found a paired iPhone 17 Pro Max, but its state was **unavailable**. No Android device tooling was installed. An iPhone 16e/iOS 26.2 simulator booted, but the computer-control service could not capture its screen (`failedToCreateImageDestination`), so no simulator keyboard/dictation pass is claimed. The test simulator was shut down afterward.

## Real integrations: NOT RUN

Still required with a working test environment and mailbox:

- Signup confirmation, returning login, logout, actual password-reset links, and expired-link rejection.
- Real generation followed by manual content edits, crew/recipients, sign-off, send, received PDF inspection, and database reopening.
- Physical iPhone Safari and Android Chrome with real keyboard, portrait/landscape, permission-denied and real dictation, background/resume, and lost/recovered connectivity.

Automatic approval review rejected opening the pre-existing signed-in production tab because staging authorization did not cover exposure of that private live account. The existing session was not inspected and no workaround was used. A request for a staging URL/inbox or explicit synthetic-production approval remains pending.

## Physical-device checklist

Use only synthetic records clearly labeled QA. On each phone:

1. Sign in; generate or select a template; edit a long topic and task notes with the keyboard open.
2. Add/check crew, enter site/weather, add a long email address, and rotate portrait/landscape. All controls must remain reachable without sideways page scrolling.
3. Deny microphone access and verify typed entry still works; separately allow dictation and verify the actual transcript and stop behavior.
4. Review flags, sign, download/read the PDF, send to the test inbox, and reopen the filed record.
5. Briefly background and return. Disable connectivity, attempt a save, restore connectivity, and retry while preserving edits. Closing the app offline is not supported as durable draft storage.
6. Record phone/OS/browser, observed results, screenshots, and any failed step. Keep the duplicate-delivery failure injection confined to a controlled test service.

## Follow-up validation

- Lint and TypeScript: passed.
- Unit/worker/configuration tests: 27 passed.
- Configured production build: passed with synthetic service endpoints; no bundle was published from this local command.
- Unconfigured build: failed as required with all missing variable names.
- Ordinary browser regression suite: 32 passed again after the build-guard change.
- Additional device emulation: 4 passed after browser-runtime restoration.
- Delivery-failure acceptance: 2 failed on the duplicate-send assertion, one per engine. This is a release blocker, not a passing check.
- Real auth/inbox, expired-token, physical microphone/keyboard: pending the access described above.
