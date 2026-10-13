-- Requests to the demo artists (src/lib/profile/mock-db.ts) are stored too,
-- so a buyer's /requests is real for every request they send. Demo artists
-- have no account: such a request names the artist by `demo_artist` (and the
-- service by `demo_service_id`) instead of `artist_id`, takes no slot, and
-- nobody answers it (the postcard says so). Drop both columns with the demo
-- data.

alter table public.commission_requests
  alter column artist_id drop not null,
  add column demo_artist text check (demo_artist ~ '^[a-z0-9_][a-z0-9_.]{1,18}[a-z0-9_]$'),
  add column demo_service_id text check (char_length(demo_service_id) <= 40),
  add constraint commission_requests_one_artist check ((artist_id is null) <> (demo_artist is null)),
  add constraint commission_requests_demo_has_no_service check (demo_artist is null or service_id is null);

create index commission_requests_demo_artist_idx on public.commission_requests (demo_artist) where demo_artist is not null;

grant select (demo_artist, demo_service_id) on public.commission_requests to authenticated;

-- Nobody to notify on a demo artist's side.
create or replace function private.notify_commission_request()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  details jsonb := jsonb_build_object(
    'service', new.service_title,
    'status', new.status,
    'estimate_usd', coalesce(new.quote_usd, new.estimate_usd),
    'brief', left(new.description, 160)
  );
begin
  if new.artist_id is null or new.buyer_id = new.artist_id then
    return null;
  end if;

  if tg_op = 'INSERT' then
    insert into public.notifications (recipient_id, kind, actor_id, request_id, data)
    values (new.artist_id, 'commission_request', new.buyer_id, new.id, details);
  elsif new.status in ('waitlisted', 'declined', 'quoted', 'in_progress', 'delivered', 'expired') then
    insert into public.notifications (recipient_id, kind, actor_id, request_id, data)
    values (new.buyer_id, 'request_update', new.artist_id, new.id, details);
  elsif new.status in ('cancelled', 'paid') then
    insert into public.notifications (recipient_id, kind, actor_id, request_id, data)
    values (new.artist_id, 'request_update', new.buyer_id, new.id, details);
  end if;
  return null;
end;
$$;
