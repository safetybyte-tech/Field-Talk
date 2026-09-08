# Field Talk V2 review fixes

Verified 2026-09-08 against a separate checkout of GitHub main at `2c40d995d4ae44c5548d1068b793a2c5a58dd955`. This patch does not modify production settings or the original working directory. Production deployment and real inbox delivery are not part of the completed verification.

## Findings and reproducible acceptance checks

| Finding | Severity | Fix and verification |
| --- | --- | --- |
| Approval survives substantive edits | P1 | Sign a record, then change content, notes, topic, location, weather, attendance or selected recipients. Approval must clear. Context/content edits also mark generation stale. Navigation alone preserves sign-off. Tests cover persistence and reject legacy Boolean-only approval. |
| Risk screening misses ordinary task words or accepts noun-only controls | P1 | Test excavation, excavating, trenching, shoring, electrical work and rigging. Empty or noun-only SIF actions now trigger review. Empty structured SIF blocks signing; current warnings require acknowledgement. |
| Truncated OSHA evidence omits critical trench provisions | P1 | Inspect the V2 prompt for 1926.651: egress, spoil placement, rain inspections and water controls survive. Relevant paragraphs near the end of long sources are included. Priority source fetch is tested when semantic matches are empty. |
| Send endpoint accepts unsigned records or unrelated caller PDFs | P1 | POST unsigned, modified, wrong-identity and malformed synthetic records to the mocked handler: rejected before delivery. A signed record with an unrelated attachment causes the server to generate its own PDF from the validated record. |
| Ordinary HVAC lift receives assembly/disassembly citation | P2 | Query an ordinary HVAC crane lift with no steel erection/personnel hoisting: assembly, steel erection, personnel hoisting and on-crane fall-protection sources are excluded. Explicit crane assembly remains eligible. Unverifiable supporting quotes are stripped and flagged. |
| Email omits PDF warnings and approval details | P2 | Generate HTML, plain-text email and PDF from the same synthetic record. All retain shared warning and sign-off language. Worker-side PDF generation runs successfully in local workerd. |
| Unsigned PDF claims approval | P2 | Export unsigned and signed records: unsigned PDF says DRAFT - NOT APPROVED and explicitly records no sign-off. Signed PDF shows the authenticated user's self-attestation and UTC timestamp. Both variants rendered and visually inspected across two pages. |
| Mobile controls clip safety text and constrain corrections | P2 | At 375, 390 and 768px, editable safety statements expand without clipping or page overflow. Remove buttons measure 44x44px. Add a fifth hazard and text longer than 80 characters; all remains editable. Keyboard typing retains spaces. |

## Checks completed

- `npm test`: 22 passing tests, including mocked generation and send endpoints; unexpected network requests fail tests.
- `npm run lint`: passes without warnings.
- `npx tsc --noEmit -p tsconfig.app.json` and `npx tsc --noEmit -p worker/tsconfig.json`: pass.
- `npm run build`: passes. Existing dependency-age and bundle-size advisory warnings remain.
- Wrangler dry-run bundle and `node tests/worker-runtime.mjs`: pass; real local workerd generates a valid 12,269-byte PDF.
- `git diff --check`: passes.
- Browser fixture: `npm run dev -- --host 127.0.0.1 --port 5178`, then `/tests/fixtures/review.html`. Use local-only Supabase/Worker environment values. Tested step navigation, acknowledgement gating, successful sign-off, invalidation on topic edit, empty-SIF blocking, mobile wrapping, and extra/long items. Fixture saves locally in React state and mocks submission; no email is sent.
- PDF fixtures: `FIELD_TALK_QA_OUTPUT=/tmp/fieldtalk-proof npm test`; inspect `signed.pdf`, `unsigned.pdf`, and matching email files.

## Release notes and limits

Ship frontend and Worker together: sending now requires an exact approved record snapshot and the Worker creates the attachment. Existing records lacking the snapshot must be reviewed and signed again. No migration or new secret is required. Preserve live Worker variables during deployment; the repository's existing V2 flag default is not evidence of the current production setting.

Automated screening and quote matching cannot establish that every safety control or citation is correct for every job. They expose omissions and unsupported citations for human review. Sign-off is an authenticated self-attestation tied to the current record, not a cryptographic signature or an immutable third-party approval receipt. Physical iOS/Android devices, microphone permissions, and actual inbox delivery were not tested in this patch verification. No production settings or live code were changed.
