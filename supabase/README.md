# Supabase setup

The Field Talk database schema is defined in
[`migrations/0001_init.sql`](./migrations/0001_init.sql). The original project
was deleted while paused, so this file is the source of truth for recreating it.

## Recreate the project from scratch

1. **Create a new Supabase project** at https://supabase.com/dashboard.
2. **Apply the schema.** Open the project's **SQL Editor**, paste the contents
   of `migrations/0001_init.sql`, and run it. (Or, with the Supabase CLI:
   `supabase db push`.) The script is safe to re-run.
3. **Grab your keys** from **Project Settings → API**:
   - Project URL (`https://<ref>.supabase.co`)
   - `anon` public key
   - `service_role` key (server-side only — never ship to the browser)

## Wire up the environment variables

These are **build-time** variables for the Vite frontend — they get inlined
into the bundle, so the site **must be rebuilt/redeployed after you set them.**
A missing value does not fail the build; it crashes at runtime when the app
loads (blank page). See `src/utils/supabase.ts`.

### Frontend (Cloudflare Pages → Settings → Environment variables, Production)

| Variable | Value |
| --- | --- |
| `VITE_SUPABASE_URL` | your project URL |
| `VITE_SUPABASE_ANON_KEY` | your `anon` public key |
| `VITE_WORKER_URL` | the deployed Cloudflare Worker URL |

After saving, **trigger a new deployment** so the values are baked in.

### Worker (Cloudflare → Worker → Settings → Variables, or `wrangler secret put`)

The Worker (`worker/`) talks to Supabase with the service-role key, which
bypasses RLS to read/write the `ai_usage` table.

| Variable | Notes |
| --- | --- |
| `SUPABASE_URL` | your project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | **secret** — `wrangler secret put SUPABASE_SERVICE_ROLE_KEY` |
| `OPENAI_API_KEY` | **secret** |
| `CORS_ORIGIN` | site origin, e.g. `https://fieldtalk.nickrogoff.com` (in `wrangler.toml`) |
| `DAILY_LIMIT` | AI generations per user per day (in `wrangler.toml`) |

For local frontend dev, copy `.env.example` to `.env` and fill in the same
`VITE_*` values.

## What the schema contains

| Object | Purpose |
| --- | --- |
| `profiles` | Per-user name/username/trade. Auto-created on signup via the `on_auth_user_created` trigger. |
| `talks` | Saved toolbox talks (attendees/recipients stored as JSONB). |
| `recent_attendees` | Attendee-name autocomplete, unique per `(user_id, name)`. |
| `logs` | Fire-and-forget event analytics. `talk_id` is TEXT (client draft ids aren't UUIDs). |
| `ai_usage` | One row per AI generation, used for rate limiting. Worker-only access. |
| `get_daily_ai_usage(p_user_id)` | Returns today's generation count for `DAILY_LIMIT` enforcement. |

Row-level security is enabled on every table. User-facing tables restrict rows
to `auth.uid() = user_id`; `ai_usage` has no client policies (service-role only).

## Avoiding a repeat

Free-tier projects auto-pause after ~7 days of inactivity and are deleted
(with no backups) after ~90 days paused. To prevent another loss, either keep
the project active or upgrade to Pro (no auto-pause + daily backups).
