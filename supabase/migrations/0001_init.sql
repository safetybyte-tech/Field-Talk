-- Field Talk — initial schema
-- Recreates the full database for a fresh Supabase project.
-- Paste into the Supabase SQL editor (or run via the Supabase CLI) on a new project.
--
-- Reconstructed from the application code:
--   profiles          -> src/utils/auth.ts
--   talks             -> src/utils/storage.ts
--   recent_attendees  -> src/utils/storage.ts
--   logs              -> src/utils/logger.ts
--   ai_usage + RPC    -> worker/src/index.ts
--
-- Safe to re-run: tables use IF NOT EXISTS and policies are dropped first.

-- gen_random_uuid() lives in pgcrypto (preinstalled on Supabase, but be explicit).
create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- profiles
-- One row per auth user. Written by auth.updateProfile() and auto-created on
-- signup by the handle_new_user() trigger below.
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  name         text,
  username     text,
  trade        text,
  custom_trade text,
  created_at   timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles
  for insert with check (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

-- ---------------------------------------------------------------------------
-- talks
-- attendees/recipients are stored as JSON arrays (see storage.talkToRow).
-- `date` is the YYYY-MM-DD work date string from the form.
-- ---------------------------------------------------------------------------
create table if not exists public.talks (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users (id) on delete cascade,
  title            text,
  content          text,
  date             date,
  location         text,
  project_number   text,
  weather          text,
  supervisor       text,
  supervisor_email text,
  attendees        jsonb not null default '[]'::jsonb,
  recipients       jsonb not null default '[]'::jsonb,
  submitted_at     timestamptz,
  created_at       timestamptz not null default now()
);

create index if not exists talks_user_id_created_at_idx
  on public.talks (user_id, created_at desc);

alter table public.talks enable row level security;

drop policy if exists "talks_owner_all" on public.talks;
create policy "talks_owner_all" on public.talks
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- recent_attendees
-- Upserted on (user_id, name) by storage.saveRecentAttendees.
-- ---------------------------------------------------------------------------
create table if not exists public.recent_attendees (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users (id) on delete cascade,
  name         text not null,
  last_used_at timestamptz not null default now(),
  unique (user_id, name)
);

create index if not exists recent_attendees_user_last_used_idx
  on public.recent_attendees (user_id, last_used_at desc);

alter table public.recent_attendees enable row level security;

drop policy if exists "recent_attendees_owner_all" on public.recent_attendees;
create policy "recent_attendees_owner_all" on public.recent_attendees
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- logs
-- Fire-and-forget analytics. talk_id is TEXT, not a FK: the client logs events
-- against client-side draft ids (e.g. "talk_1718...") before a talk is ever
-- persisted, so it cannot be a uuid foreign key.
-- ---------------------------------------------------------------------------
create table if not exists public.logs (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references auth.users (id) on delete cascade,
  talk_id    text,
  event_name text not null,
  payload    jsonb,
  created_at timestamptz not null default now()
);

create index if not exists logs_talk_id_idx on public.logs (talk_id);

alter table public.logs enable row level security;

drop policy if exists "logs_owner_all" on public.logs;
create policy "logs_owner_all" on public.logs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- ai_usage
-- Written/read ONLY by the Cloudflare Worker using the service-role key, which
-- bypasses RLS. RLS is enabled with no policies, so anon/authenticated clients
-- have no access.
-- ---------------------------------------------------------------------------
create table if not exists public.ai_usage (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  tokens_used integer not null default 0,
  created_at  timestamptz not null default now()
);

create index if not exists ai_usage_user_created_idx
  on public.ai_usage (user_id, created_at);

alter table public.ai_usage enable row level security;

-- ---------------------------------------------------------------------------
-- get_daily_ai_usage(p_user_id)
-- Returns the number of AI generations the user has made today (UTC), used by
-- the Worker to enforce DAILY_LIMIT. Counts rows, not summed tokens, to match
-- the "N AI generations per day" limit.
-- ---------------------------------------------------------------------------
create or replace function public.get_daily_ai_usage(p_user_id uuid)
returns integer
language sql
security definer
set search_path = public
as $$
  select count(*)::int
  from public.ai_usage
  where user_id = p_user_id
    and created_at >= date_trunc('day', now() at time zone 'utc');
$$;

-- ---------------------------------------------------------------------------
-- handle_new_user()
-- Auto-creates a profiles row when a user signs up, copying username/name from
-- the signup metadata (auth.register passes them in options.data).
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, name, username)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'name', ''),
    coalesce(new.raw_user_meta_data ->> 'username', split_part(new.email, '@', 1))
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
