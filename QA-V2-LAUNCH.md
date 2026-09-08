# V2 launch validation

## Fixes

- Live V2 route returned 404 despite its runtime flag being enabled. Deployed the existing V2 backend code; authenticated generation now returns 200 and saves audit rows.
- Frontend discarded V2 review information. Added a response-validated review panel derived from retrieval, validation, and persistence results, and preserved it with saved draft metadata. Missing or malformed V2 traces now fail explicitly.
- Semantic retrieval mixed specialized regulations into unrelated work. Added scope exclusions for steel erection, personnel hoisting, crane-specific rules, power transmission/distribution, and underground construction. Expanded candidate retrieval before filtering; strengthened citation-support and task-fidelity instructions. V1 retrieval is unchanged.
- Corpus sync failed on dense text exceeding the embedding token limit. Added bounded retry for explicit input-length failures, preserving full stored regulatory text. All 377 records were indexed and verified.
- Browser attachment QA found missing exported reference links and cramped PDF header spacing. Added shared official-source URL filtering to PDF/HTML/email exports, preserved V2 warnings in PDFs, and corrected font measurement/header spacing. Regression fixture verifies URL annotations and unsafe-URL exclusion.

## Verification

- Frontend lint, TypeScript check, and production build passed.
- Mocked V2 tests cover disabled route, rate limit, grounded/no-match/unavailable retrieval, audit failure, malformed trace, saved review round-trip, legacy content, and specialized citation exclusions.
- Live synthetic excavation, crane, and roof requests returned grounded results and persisted audit records. Initial crane and excavation citation-scope failures were reproduced and corrected in subsequent API runs.
- Unauthenticated live generation returns 401.
- Three desktop browser stories completed login, V2 generation, crew/site entry, synthetic sign-off, sending, inbox receipt, and saved-record reopening. All three PDF attachments were received. After the export fix, all three records were resent through the UI and the corrected PDFs downloaded for visual verification. The excavation review warning survived save/reopen and export; it is a review signal, not an application error.
- Main contains d92ccda. The export follow-up is tested on the preview and awaits push approval. Production frontend remains V1 until that follow-up is published and the frontend flag is enabled.

## Remaining

- Publish the export follow-up, enable the production frontend flag, rebuild, and verify the live site actually uses V2.
- Scope: desktop typed-input functional testing, not microphone/mobile/offline validation or an exhaustive safety-content audit. Generated drafts may require edits; automated checks are not proof that every requested topic was covered.
- Dependency installation reports 28 audit findings in the existing lockfile; no broad dependency upgrade was attempted in this scoped release.
- Automated checks and citation filtering are not a professional safety/compliance approval.
