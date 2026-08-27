-- Isolated audit trail for the opt-in Harness V2 experiment.
-- The production V1 generator does not read or write this table.

create table if not exists public.harness_v2_runs (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  request jsonb not null,
  retrieval jsonb not null,
  validation jsonb not null,
  risk_signals jsonb not null default '[]'::jsonb,
  model text not null,
  prompt_version text not null,
  output jsonb not null
);

create index if not exists harness_v2_runs_user_created_idx
  on public.harness_v2_runs (user_id, created_at desc);

alter table public.harness_v2_runs enable row level security;

-- Users may inspect their own experimental runs once a reviewer UI is added.
create policy "Users can read own Harness V2 runs"
  on public.harness_v2_runs for select
  using (auth.uid() = user_id);

-- Writes are made only by the authenticated Worker through the service role.
revoke insert, update, delete on public.harness_v2_runs from anon, authenticated;
