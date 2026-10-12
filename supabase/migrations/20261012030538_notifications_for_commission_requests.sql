-- Notifications for commission requests (*_listings.sql): the artist hears
-- about a new request and about a buyer cancelling; the buyer hears when the
-- artist accepts, waitlists or declines. Requests are written with the
-- secret key from Server Actions, so the trigger is the one place this
-- happens. Each notice keeps a snapshot of what it's about (service, status,
-- the start of the brief), and goes when the request is deleted.

alter table public.notifications
  add column request_id uuid references public.commission_requests (id) on delete cascade;

create index notifications_request_id_idx on public.notifications (request_id) where request_id is not null;

create function private.notify_commission_request()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  details jsonb := jsonb_build_object(
    'service', new.service_title,
    'status', new.status,
    'estimate_usd', new.estimate_usd,
    'brief', left(new.description, 160)
  );
begin
  if new.buyer_id = new.artist_id then
    return null;
  end if;

  if tg_op = 'INSERT' then
    insert into public.notifications (recipient_id, kind, actor_id, request_id, data)
    values (new.artist_id, 'commission_request', new.buyer_id, new.id, details);
  elsif new.status in ('waitlisted', 'declined', 'accepted') then
    insert into public.notifications (recipient_id, kind, actor_id, request_id, data)
    values (new.buyer_id, 'request_update', new.artist_id, new.id, details);
  elsif new.status = 'cancelled' then
    insert into public.notifications (recipient_id, kind, actor_id, request_id, data)
    values (new.artist_id, 'request_update', new.buyer_id, new.id, details);
  end if;
  return null;
end;
$$;

revoke all on function private.notify_commission_request() from public, anon, authenticated;

create trigger commission_requests_notify_new
  after insert on public.commission_requests
  for each row execute function private.notify_commission_request();

create trigger commission_requests_notify_status
  after update of status on public.commission_requests
  for each row
  when (old.status is distinct from new.status)
  execute function private.notify_commission_request();
