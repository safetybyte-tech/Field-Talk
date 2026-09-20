# Release-readiness bug loop — September 20, 2026

Scope: existing product, synthetic local accounts/services. Earlier draft/mobile fixes are in RELEASE-READINESS.md. Live staging and physical phones remain external acceptance prerequisites; a clean bounded test run is not proof that no other bugs exist.

| ID | Priority | Reproduction / observed failure | Resolution and regression evidence |
| --- | --- | --- | --- |
| RR-01 | P1 | Email accepted, filing fails, retry delivers a second email in Chromium and WebKit. | Fixed: durable server receipt; exact provider payload/key reused; acknowledged delivery skips provider on retry; atomic filing; reload recovery; 23-hour cutoff for uncertain sends. Actual PostgreSQL + Worker fault tests and both browser engines pass. |
| RR-02 | P1 | Preview build without service variables deploys a bundle that immediately throws. | Build guard fixed in prior commit; missing/invalid-variable tests pass. Actual Preview service configuration remains externally blocked. |
| RR-03 | P1 | Rejected session lookup leaves spinner; account switch retains editor and late old-account responses. | Both cases failed before fixes. Session/version guards clear account state and discard stale results. Browser regressions pass. |
| RR-04 | P2 | Quarter count includes prior years/later quarters; See all is inert. | Failed before fix. Date-only quarter boundaries and a real records button pass in both engines. Canonical source is saved talk date/submitted state. |
| RR-05 | P2 | Opening/deleting a record rejects without feedback. | Failed before fix. Recoverable action errors preserve records until confirmed deletion. Both engines pass; logout/recent-crew failures also handled. |
| RR-06 | P2 | Newly entered crew are all temporary and never remembered. | Failed before fix. New named crew are remembered; unique trimmed upserts avoid duplicate-key failures. Browser/storage tests pass. |
| RR-07 | P2 | Confirmation-required signup reports failure despite account creation; expired links lack actionable feedback. | Confirmation result keeps user at sign-in with inbox instructions, clears password, and expired-link UI offers reset. Browser tests pass; real inbox links remain a live acceptance prerequisite. |
| RR-08 | P1 | Reopened filed records expose editing/sending controls. | Filed view is read-only with PDF access. Server receipt prevents another delivery for the same record. Browser/Worker tests pass. |
| RR-09 | P2 | PWA references missing 192/512 icons and favicon references missing vite.svg. | Generated PNGs from the existing microphone SVG; favicon/apple-touch-icon fixed. Asset dimensions and production PWA build pass. |
| RR-10 | P2 | Profile save's delayed return can navigate away from a new draft after leaving profile. | Cancel timer on unmount and ignore late profile result. Regression crosses the former timer deadline with a new draft open. |
| RR-11 | P2 | Supabase default row cap silently truncates larger histories. | Stable paginated reads. 1,001-row and failed-second-page tests pass. |
| RR-12 | P2 | Root/Worker dependency audits report advisories. | Patched compatible dependencies plus Vite 6.4.3 and aligned Worker tooling. Audit reports zero vulnerabilities in both projects. Lint/runtime incompatibilities exposed by upgrades were fixed and retested. |
| RR-13 | P2 | Synchronous speech startup failure escapes the UI; repeated starts can overlap recognition sessions. | Startup errors become usable typed fallback; one active session; cleanup ignores late events. Simulated permission-denied startup and partial-transcript stop pass in both phone profiles. Actual microphones remain untested. |
| RR-14 | P1 | Mixed frontend/Worker versions could use old send-then-file semantics during rollout. | Versioned /v2/send-talk endpoint; legacy /send-talk returns 426 before sending. No unsafe fallback. Legacy-client rejection regression passes. |
| RR-15 | P2 | PR review: unchanged saved draft cannot leave Home/Records/Profile when an unnecessary save fails. | Reproduced all three failures; clean drafts now leave without a write. Both-engine navigation regressions pass. |
| RR-16 | P2 | PR review: saving an older record prepends it ahead of newer records. | Shared saved-record merge retains createdAt descending / ID tie order and replaces temporary IDs. Record-order tests pass. |
| RR-17 | P1 | Opening a legacy filed record with a blank supervisor substitutes the current profile into its PDF. | Reproduced in a downloaded PDF. Prevent all automatic field fills on filed/pending snapshots; both-engine PDF-content regression passes. |

## Iterations and stop condition

1. Kept the original duplicate-delivery assertion as a failing release gate; reproduced two accepted emails.
2. Implemented durable delivery and actual PostgreSQL/Worker fault injection; retry, reload and lost responses pass with one provider acceptance.
3. Added five UI defect reproductions: all failed before fixes, then all ten engine runs passed.
4. Expanded auth, filed-record, pagination, timer, install-asset, dependency and speech checks. Fixed the lint/Miniflare compatibility failures introduced by dependency patching.
5. Read open GitHub issues (none) and existing PR review threads; reproduced/fixed both reported findings (RR-15/16).
6. Reproduced/fixed automatic supervisor substitution in a legacy filed PDF (RR-17).
7. Ran two full browser passes (96 checks), repeated delivery checks (16), repeated mobile checks (12), and a final browser pass after endpoint hardening. No known failing local regression remains. Exact final results and external blockers are in ACCEPTANCE-RESULTS.md.

## External acceptance still open

- Configure Preview with designated test Supabase/Worker values and a test inbox.
- Apply/verify the migration against that environment's actual talks schema, then deploy Worker and frontend in the documented order.
- Real confirmation/reset/expired-link, generation, received email/PDF and persisted-record checks.
- Physical iPhone Safari/Android Chrome keyboards, microphones, rotation and background/connectivity recovery.

These were not silently marked passed, and production was not changed.
