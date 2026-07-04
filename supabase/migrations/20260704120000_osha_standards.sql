-- OSHA 29 CFR Part 1926 standards corpus for retrieval-grounded talk generation.
-- Source text is unofficial (parsed from eCFR-derived markdown); every row keeps
-- a source_url back to the official eCFR section so citations are verifiable.

create extension if not exists vector;

create table if not exists public.osha_standards (
  id bigint generated always as identity primary key,
  citation text not null unique,          -- e.g. "1926.501"
  subpart text,                           -- e.g. "M"
  subpart_title text,                     -- e.g. "Fall Protection"
  industry text,                          -- e.g. "construction"
  source_url text not null,               -- eCFR link for verification
  text text not null,                     -- full regulatory text (unofficial)
  content_hash text not null,             -- sha256 of source content; lets the sync script skip unchanged rows
  embedding vector(1536),                 -- OpenAI text-embedding-3-small
  updated_at timestamptz not null default now()
);

comment on table public.osha_standards is
  'Unofficial OSHA 29 CFR Part 1926 text with embeddings. Verify against source_url (eCFR) before relying on it.';

-- Only the service role (Worker + sync script) touches this table.
alter table public.osha_standards enable row level security;

-- HNSW index for cosine similarity search.
create index if not exists osha_standards_embedding_idx
  on public.osha_standards
  using hnsw (embedding vector_cosine_ops);

-- Similarity search used by the Cloudflare Worker before talk generation.
create or replace function public.match_osha_standards(
  query_embedding vector(1536),
  match_threshold double precision default 0.40,
  match_count integer default 4
)
returns table (
  citation text,
  subpart text,
  subpart_title text,
  source_url text,
  text text,
  similarity double precision
)
language sql
stable
as $$
  select
    s.citation,
    s.subpart,
    s.subpart_title,
    s.source_url,
    s.text,
    1 - (s.embedding <=> query_embedding) as similarity
  from public.osha_standards s
  where s.embedding is not null
    and 1 - (s.embedding <=> query_embedding) >= match_threshold
  order by s.embedding <=> query_embedding
  limit greatest(match_count, 1);
$$;

-- Lock the RPC down to the service role; end users never call it directly.
revoke execute on function public.match_osha_standards(vector, double precision, integer) from public;
revoke execute on function public.match_osha_standards(vector, double precision, integer) from anon;
revoke execute on function public.match_osha_standards(vector, double precision, integer) from authenticated;
grant execute on function public.match_osha_standards(vector, double precision, integer) to service_role;
