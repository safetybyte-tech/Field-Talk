# Harness V2 experiment

Harness V2 is an evidence-first test path. It does not alter the V1 generator,
its route, prompt, or response contract.

## What it adds

- `POST /v2/generate-talk`, separate from `/` and `/generate-talk`.
- Retrieval health (`grounded`, `no_match`, or `unavailable`) instead of V1's
  silent fallback.
- Deterministic high-risk/SIF and length checks returned in a `harness` trace.
- An isolated `harness_v2_runs` audit table.
- `store: false` on the V2 OpenAI Responses request.

## Enable a test deployment

1. Apply `supabase/migrations/20260806120000_harness_v2_runs.sql`.
2. Set the Worker variables for the test deployment:

   ```text
   ENABLE_HARNESS_V2=true
   HARNESS_V2_DAILY_LIMIT=5
   HARNESS_V2_PROMPT_VERSION=2026-08-06
   # Optional: HARNESS_V2_MODEL=<evaluated model snapshot>
   ```

3. Build the test frontend with:

   ```text
   VITE_USE_HARNESS_V2=true
   ```

Without both flags, existing users remain on V1. The browser flag only changes
which endpoint it calls; the Worker flag remains the authoritative gate.

## Test acceptance

For each experimental run, review the returned retrieval state, risk signals,
validation warnings, citations, and the matching `harness_v2_runs` record. Do
not promote V2 until its evaluated cases meet the acceptance criteria defined
for retrieval, SIF coverage, citation precision, and review-required behavior.
