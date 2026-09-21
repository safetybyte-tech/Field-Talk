> Current status: the deeper defects and delivery blocker below have been addressed in the repeat/fix loop. See [BUG-LOG.md](BUG-LOG.md) and [ACCEPTANCE-RESULTS.md](ACCEPTANCE-RESULTS.md) for final results and remaining live acceptance requirements. This report retains the original pass history.

# Release-readiness pass — September 19, 2026

**Historical report:** the remaining-issues list and test counts below describe the initial pass. The duplicate-delivery defect, dependency advisories, missing icons and account/history findings were subsequently fixed. Automated regression gates pass and production deployment is complete. [ACCEPTANCE-RESULTS.md](ACCEPTANCE-RESULTS.md) is the current source for rollout evidence and outstanding real-service/device checks.

## Scope and disposition

Assessed current GitHub main (`2d1bcd4`) in an isolated checkout. The original local main was older and contained extensive uncommitted work; none of that work was reset, included in this PR, or deployed. No repository/ancestor AGENTS.md or CLAUDE.md was present. Reviewed package scripts, existing tests, the V2 Worker README, environment examples, application flows, storage, authentication, and delivery code. Used the mobile-interaction and change-impact skill workflows; their repository-specific `scripts/agent-checks` utilities do not exist here, so Playwright and project checks supply validation.

This PR fixes reproducible frontend persistence and mobile problems without redesigning the product or changing the generation/safety-review contracts. It is ready for code review, not an unconditional production release approval: delivery recovery and live integration/device acceptance remain outstanding below.

## Reproduced problems and fixes

| Priority | Reproduction / problem | Fix and regression coverage |
| --- | --- | --- |
| P1 | Edit saved notes, then tap Home: the old App prop overwrote the latest editor state. Records/Profile discarded pending edits too. | All editor navigation saves the live editor state and waits for success. Failed saves keep the page and content open. |
| P1 | Fail a save while pressing Next: the editor advanced without recording the step and raised an unhandled rejection. | Await save, keep the current step on failure, expose an announced error and retry. Generation/template saves use the same path. |
| P1 | Double-click Save on a new draft while the insert takes 700 ms: multiple rows were created. | Serialize save entry, disable editing/actions while saving, and retain the database ID for subsequent updates. |
| P1 | A recent-attendee update failed after a successful save/send: the completed main operation was reported as failed. | Update the confirmed record directly; recent-crew refresh is best effort and cannot turn delivery success into a send retry. |
| P2 | Long recipient addresses overflow at 375/390 px. Inputs, account IDs, and records also have intrinsic sizing risks. | Constrain shrinking inputs, wrap long text, preserve checkbox widths, enlarge relevant touch targets, and allow safe-area padding under the fixed footer. |
| P2 | “All here” leaves returning crew unchecked. | Include all displayed attendees, including recent names. Correct the misleading claim that yesterday's crew is prechecked. |
| P2 | Invalid or duplicate recipient addresses enter the record and fail only at send time. | Validate at entry, retain the inputs for correction, and reject duplicate email addresses. |
| P2 | More than ten submitted records exist, but the rest have no path in Records. | Remove the silent ten-record truncation. A test opens record twelve. |
| P2 | Records loading fails and the dashboard appears empty. | Show an error and Retry instead of the empty dashboard. |
| P2 | Offline banner and draft labels promise local persistence and automatic sending, neither of which exists. | State the actual reconnect/save behavior; show pending/saving/saved feedback, including on phones; warn before closing unsaved edits where supported. |
| P2 | Production lockfile has DOMPurify and ws advisories. | Update only these two compatible transitive packages; production audit is now clear. |

The initial seven Chromium tests produced five application failures before fixes: stale Home save, failed-save progression, duplicate insertion, and overflow at each phone width. The final suite passes. Initial missing browser runtimes and incorrect auth-test selectors were test-setup issues, corrected before final validation.

Post-send navigation keeps the filed record submitted, and the success page now returns home explicitly instead of a timer interrupting subsequent user navigation.

## Validation

- `npm run lint`: passed.
- `npm run typecheck`: passed.
- `npm test`: 22 passed; includes generation/retrieval fallback, citation support, approval invalidation/persistence, worker send rejection, and PDF/email semantics.
- `npm run build`: passed, including service-worker generation. Existing >500 kB chunk and stale Browserslist-data warnings remain.
- `npm run test:browser -- --workers=2`: 32 passed (16 scenarios in Chromium and WebKit); no uncaught page errors.
- `npm audit --omit=dev`: zero reported vulnerabilities at validation time.
- `git diff --check`: passed.
- Added a GitHub Actions workflow for lint, type checking, unit/worker tests, build, and both browser engines.

The browser flows cover login, signup, profile/password changes, logout, password-reset request/recovery UI, loading failure/retry, template fallback when generation fails, typed generation, editing, crew, recipients, sign-off, PDF download, mail failure/retry, filing, and record reopening. Auth/storage are fixture boundaries; generation and mail responses are intercepted. This proves frontend control flow, not real email receipt, database/RLS configuration, token delivery, or live model output. Existing worker tests independently exercise worker requests with mocked upstream services.

## Mobile and changed-path verification

Both engines passed at 375, 390, 768, and 1280 px, with 844 px viewport height. Verified editor steps, attendance controls, recipient entry, records, and profile for no document-level horizontal scrolling. Tests scroll to sign-off and confirm it sits above the fixed footer. Screenshots from phone and desktop sizes were visually reviewed: text wraps, controls remain visible, and the footer leaves the final sign-off reachable. Login/signup/recovery and profile actions also ran at phone widths.

Home → dashboard, Records → outbox, Profile → account, New → editor, editor steps 1/2/3, template selection, PDF download, send success/failure, and saved-record reopening remain reachable. Header exits from the editor now require a confirmed save. No external routes, worker endpoints, or citation links changed. Artifact screenshots are regenerated under `test-results/` and uploaded by CI; local traces are retained for failures.

This is desktop Chromium/WebKit at mobile viewport sizes, not a physical iPhone/Android test. Touch hardware, real virtual keyboards, browser chrome, safe-area insets on a notched device, background suspension, and real microphone transcription need device acceptance.

## Remaining issues, in priority order

1. **P1 — Durable delivery recovery is still missing.** `api.submitTalk` emails first and then writes the submitted record. If the database write fails after mail acceptance, the UI can report failure after mail has gone out. Each new attempt gets a new timestamp, and the worker's provider idempotency key includes it; an ambiguous retry may send twice. The September 20 controlled failure-injection test reproduces duplicate sends in Chromium and WebKit; no live duplicate emails were sent. Resolve with a persisted submission attempt/delivery state and a stable retry identity across reloads, plus provider acceptance/DB-failure integration tests. The PR handles recent-list failures but does not claim transactional delivery.
2. **P1 — Live release acceptance remains required.** Use a dedicated staging account to verify real Supabase login/signup confirmation/recovery, RLS, generation, sign-off, received email/PDF, and database reopening. No production writes, messages, configuration changes, or deployment were performed during this pass.
3. **P2 — Offline work is not durable.** There is no local draft store or delivery queue. Browser close/background eviction can lose unsaved edits, and unload prompts are not reliable on mobile. Copy now accurately reflects this limitation; offline storage needs a separately designed recovery path.
4. **P2 — Development dependency advisories remain.** Full `npm audit` reports 26 (16 high, 7 moderate, 3 low), all outside the production-only audit. They include Vite/esbuild/build-tool chains. Schedule a controlled toolchain upgrade with build/PWA regression checks; this PR avoids a broad dependency migration. Do not expose the development server to untrusted networks.
5. **P2 — PWA install assets are incomplete.** `vite.config.ts` references `/icon-192.png` and `/icon-512.png`, which are absent from tracked public assets. Installed-app acceptance requires appropriate icons and actual device testing.
6. **P2 — Additional account/history edges need follow-up.** Initial auth-session rejection, cross-account auth events while requests are in flight, individual open/delete failures, and large-history pagination are not covered by this change. The dashboard quarter count also omits a year/end-of-quarter bound. These are inspection findings, not claimed passing scenarios.

Generated safety content still requires human review. No professional safety-content audit was performed, and the existing review/sign-off safeguards remain unchanged.
