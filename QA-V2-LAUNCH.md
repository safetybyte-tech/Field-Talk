# V2 launch validation

## Fixes

- Live V2 route returned 404 despite its runtime flag being enabled. Deployed the existing V2 backend code; authenticated generation now returns 200 and saves audit rows.
- Frontend discarded V2 review information. Added a response-validated review panel derived from retrieval, validation, and persistence results, and preserved it with saved draft metadata. Missing or malformed V2 traces now fail explicitly.
- Semantic retrieval mixed specialized regulations into unrelated work. Added scope exclusions for steel erection, personnel hoisting, crane-specific rules, power transmission/distribution, and underground construction. Expanded candidate retrieval before filtering; strengthened citation-support and task-fidelity instructions. V1 retrieval is unchanged.
- Corpus sync failed on dense text exceeding the embedding token limit. Added bounded retry for explicit input-length failures, preserving full stored regulatory text. All 377 records were indexed and verified.

## Verification

- Frontend lint, TypeScript check, and production build passed.
- Mocked V2 tests cover disabled route, rate limit, grounded/no-match/unavailable retrieval, audit failure, malformed trace, saved review round-trip, legacy content, and specialized citation exclusions.
- Live synthetic excavation, crane, and roof requests returned grounded results and persisted audit records. Initial crane citation-scope failure was reproduced and corrected in a subsequent API run. An additional excavation scope exclusion is under validation.
- Unauthenticated live generation returns 401.
- Preview frontend is published for browser acceptance. Production frontend remains V1 pending browser checks and final approval criteria.

## Remaining

- Complete browser generation, save/reopen, sign-off, and test-email delivery for all three stories on V2.
- Recheck the final scoped Worker, push the code, then enable the production frontend flag only after acceptance passes.
- Dependency installation reports 28 audit findings in the existing lockfile; no broad dependency upgrade was attempted in this scoped release.
- Automated checks and citation filtering are not a professional safety/compliance approval.
