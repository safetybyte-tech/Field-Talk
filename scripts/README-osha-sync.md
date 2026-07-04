# OSHA standards sync

`sync-osha-standards.mjs` loads the OSHA 29 CFR Part 1926 markdown corpus into
the Supabase `osha_standards` table and generates an embedding per standard so
the Cloudflare Worker can retrieve relevant standards before generating a talk.

The source text is **unofficial** (derived from eCFR). Every row carries a
`source_url` back to the official eCFR section — the product must always link
citations to it.

## One-time setup

1. Apply the migration (creates the `vector` extension, the `osha_standards`
   table, and the `match_osha_standards` RPC):

   ```sh
   supabase db push
   # or paste supabase/migrations/20260704120000_osha_standards.sql into the
   # Supabase SQL editor
   ```

2. Put the 304 standard markdown files in `data/osha-1926/` (one file per
   standard, YAML frontmatter with `citation`, `subpart`, `subpart_title`,
   `industry`, `source_url`, followed by the regulatory text).

3. Create a `.env` at the repo root (never commit it):

   ```sh
   SUPABASE_URL=https://<project-ref>.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=<service role key>
   OPENAI_API_KEY=<openai key>
   ```

## Running a sync

```sh
node --env-file=.env scripts/sync-osha-standards.mjs
```

Requires Node 20+. Flags:

| Flag | Effect |
| --- | --- |
| `--source <dir>` | Corpus directory (default `data/osha-1926`) |
| `--dry-run` | Show what would be synced/pruned without writing |
| `--force` | Re-embed and upsert everything, even unchanged rows |
| `--prune` | Delete rows whose citation no longer exists in the source |

## Re-syncing after source changes

Just run the same command again. The script hashes each standard's content and
skips rows whose hash matches what is already in the table, so only new or
edited standards are re-embedded (this keeps OpenAI cost near zero for small
edits). Use `--prune` if you removed files; use `--force` if you change the
embedding model.

The embedding model is `text-embedding-3-small` (1536 dims) and must match
what the Worker uses at query time (`OPENAI_EMBEDDING_MODEL` in
`worker/wrangler.toml`). If you switch models, update both and re-run with
`--force`.

## Tuning retrieval

The Worker calls `match_osha_standards` with a cosine-similarity threshold
(`OSHA_MATCH_THRESHOLD`, default `0.40`) and a result cap (`OSHA_MATCH_COUNT`,
default `4`) — both set in `worker/wrangler.toml`. If irrelevant standards show
up on vague descriptions, raise the threshold toward `0.5`; if clearly relevant
standards are missed, lower it toward `0.3`.
