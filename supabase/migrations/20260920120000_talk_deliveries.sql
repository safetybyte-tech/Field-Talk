-- Apply before deploying the Worker and frontend. Only the Worker/service role
-- can reserve, acknowledge or complete a delivery. One delivery per talk ID.
create table public.talk_deliveries (
  id uuid primary key default gen_random_uuid(),
  talk_id uuid not null unique,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  talk jsonb not null,
  content text not null,
  payload text not null,
  provider_id text,
  filed_at timestamptz
);
-- No FK to talks: keep the receipt after deletion so a talk ID cannot be resent.
alter table public.talk_deliveries enable row level security;
revoke all on public.talk_deliveries from public, anon, authenticated;
grant all on public.talk_deliveries to service_role;

create function public.reserve_talk_delivery(p_user_id uuid, p_talk jsonb, p_content text, p_payload text, p_signer_name text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  existing public.talks%rowtype;
  receipt public.talk_deliveries%rowtype;
begin
  select * into existing from public.talks where id = (p_talk->>'id')::uuid and user_id = p_user_id for update;
  if not found then raise exception 'Saved talk not found for this account.'; end if;
  select * into receipt from public.talk_deliveries where talk_id = existing.id;
  if found then
    if receipt.user_id <> p_user_id or receipt.talk->>'approvedRecord' is distinct from p_talk->>'approvedRecord' then
      raise exception 'Delivery already started for another version. Reopen the saved record to check its delivery.';
    end if;
    return to_jsonb(receipt);
  end if;
  if nullif(p_signer_name, '') is null or p_talk->>'approvedBy' is distinct from p_signer_name then raise exception 'Sign with your current profile name before sending.'; end if;
  if existing.submitted_at is not null then raise exception 'This record is already filed.'; end if;
  -- Preserve the signed version before any provider request. A reload can retry it.
  update public.talks set title = p_talk->>'title', content = p_content,
    date = (p_talk->>'date')::date, location = p_talk->>'location',
    project_number = p_talk->>'projectNumber', weather = p_talk->>'weather',
    supervisor = p_talk->>'supervisor', supervisor_email = p_talk->>'supervisorEmail',
    attendees = p_talk->'attendees', recipients = p_talk->'recipients'
    where id = existing.id;
  p_talk := jsonb_set(p_talk, '{createdAt}', to_jsonb((extract(epoch from existing.created_at) * 1000)::bigint));
  insert into public.talk_deliveries (talk_id, user_id, talk, content, payload)
    values (existing.id, p_user_id, p_talk, p_content, p_payload) returning * into receipt;
  return to_jsonb(receipt);
end;
$$;

create function public.acknowledge_talk_delivery(p_user_id uuid, p_delivery_id uuid, p_provider_id text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if nullif(p_provider_id, '') is null then raise exception 'Missing provider receipt.'; end if;
  update public.talk_deliveries set provider_id = p_provider_id
    where id = p_delivery_id and user_id = p_user_id and (provider_id is null or provider_id = p_provider_id);
  if not found then raise exception 'Delivery receipt not found or inconsistent.'; end if;
end;
$$;

create function public.complete_talk_delivery(p_user_id uuid, p_delivery_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare receipt public.talk_deliveries%rowtype;
begin
  select * into receipt from public.talk_deliveries where id = p_delivery_id and user_id = p_user_id for update;
  if not found or receipt.provider_id is null then raise exception 'Delivery is not confirmed.'; end if;
  if receipt.filed_at is null then
    update public.talks set submitted_at = to_timestamp((receipt.talk->>'submittedAt')::double precision / 1000)
      where id = receipt.talk_id and user_id = p_user_id;
    if not found then raise exception 'Saved record is missing; delivery needs reconciliation.'; end if;
    update public.talk_deliveries set filed_at = now() where id = receipt.id;
  end if;
  return receipt.talk || '{"deliveryPending": false}'::jsonb;
end;
$$;

-- Prevent another tab from replacing/deleting an in-flight signed snapshot.
-- Filing may only change submitted_at to the receipt's canonical timestamp.
create function public.protect_talk_delivery() returns trigger
language plpgsql security definer set search_path = public as $$
declare receipt public.talk_deliveries%rowtype;
begin
  select * into receipt from public.talk_deliveries where talk_id = old.id;
  if found then
    if tg_op = 'DELETE' then
      if receipt.filed_at is null then raise exception 'Delivery is pending. Check its delivery before deleting this record.'; end if;
    elsif (to_jsonb(new) - 'submitted_at' - 'updated_at') is distinct from (to_jsonb(old) - 'submitted_at' - 'updated_at')
      or (new.submitted_at is distinct from old.submitted_at and
        (receipt.provider_id is null or new.submitted_at is distinct from to_timestamp((receipt.talk->>'submittedAt')::double precision / 1000))) then
      raise exception 'Delivery has started. Reopen the saved record to check its delivery; its signed content cannot be changed.';
    end if;
  end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;
create trigger protect_talk_delivery before update or delete on public.talks
  for each row execute function public.protect_talk_delivery();

revoke all on function public.reserve_talk_delivery(uuid, jsonb, text, text, text), public.acknowledge_talk_delivery(uuid, uuid, text), public.complete_talk_delivery(uuid, uuid), public.protect_talk_delivery() from public, anon, authenticated;
grant execute on function public.reserve_talk_delivery(uuid, jsonb, text, text, text), public.acknowledge_talk_delivery(uuid, uuid, text), public.complete_talk_delivery(uuid, uuid) to service_role;


create function public.find_talk_delivery(p_user_id uuid, p_talk_id uuid)
returns jsonb language sql stable security definer set search_path = public as $$
  select to_jsonb(receipt) from public.talk_deliveries receipt where user_id = p_user_id and talk_id = p_talk_id;
$$;
revoke all on function public.find_talk_delivery(uuid, uuid) from public, anon, authenticated;
grant execute on function public.find_talk_delivery(uuid, uuid) to service_role;
