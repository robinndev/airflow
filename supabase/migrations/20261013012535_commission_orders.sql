-- Commission orders: a request (*_listings.sql) carries on through the whole
-- commission. The artist answers with a quote (price, due date, a note, an
-- expiry); the buyer pays (stubbed: checkout waits on the payments provider,
-- so until then only the team marks an order paid, `npm run orders`); the
-- artist starts, moves it sketch -> lineart -> flats -> render and delivers.
--
--   pending | waitlisted -> quoted -> paid -> in_progress -> delivered
--   any open state -> declined (artist) | cancelled (buyer) ; quoted -> expired
--
-- Every write goes through Server Actions with the secret key (no write
-- grants), which check who's asking and that the step is allowed. A quote
-- that expires, like a decline or a cancel, gives the service's slot back.
-- The artist's private note is the one column the buyer can't read.

-- Earlier "accepted" meant "I'll quote you"; quotes replace it.
update public.commission_requests set status = 'pending' where status = 'accepted';

alter table public.commission_requests drop constraint commission_requests_status_check;
alter table public.commission_requests
  add constraint commission_requests_status_check check (status in (
    'pending', 'waitlisted', 'quoted', 'paid', 'in_progress', 'delivered', 'declined', 'cancelled', 'expired'
  ));

alter table public.commission_requests
  add column quote_usd numeric(8, 2) check (quote_usd is null or quote_usd between 1 and 10000),
  add column quote_note text check (char_length(quote_note) <= 1000),
  add column due_date date,
  add column quoted_at timestamptz,
  add column quote_expires_at timestamptz,
  add column paid_at timestamptz,
  add column started_at timestamptz,
  add column step text check (step in ('sketch', 'lineart', 'flats', 'render')),
  add column delivered_at timestamptz,
  -- { images: [{ path, width, height, palette }], note } in the artist's deliveries folder.
  add column delivery jsonb check (delivery is null or jsonb_typeof(delivery) = 'object'),
  -- What the artist says when declining.
  add column answer_note text check (char_length(answer_note) <= 500),
  add column paused boolean not null default false,
  add column archived_by_artist boolean not null default false,
  -- Private to the artist: no select grant below.
  add column artist_note text check (char_length(artist_note) <= 2000),
  add constraint commission_requests_quote_complete check (status <> 'quoted' or (quote_usd is not null and quote_expires_at is not null));

create index commission_requests_quote_expires_at_idx on public.commission_requests (quote_expires_at) where status = 'quoted';

-- Buyers and artists read their requests, minus the artist's private note
-- (the queue reads it with the secret key after checking the session).
revoke select on public.commission_requests from authenticated;
grant select (
  id, buyer_id, artist_id, service_id, service_title, package, addons, estimate_usd, description, reference_links,
  deadline, usage, budget, terms_snapshot, status, holds_slot, created_at, updated_at,
  quote_usd, quote_note, due_date, quoted_at, quote_expires_at, paid_at, started_at, step, delivered_at, delivery,
  answer_note, paused, archived_by_artist
) on public.commission_requests to authenticated;

-- An expired quote gives its slot back, like a decline or a cancel; so does
-- moving a request to the waitlist (waitlisted requests never hold a slot).
create or replace function private.release_service_slot()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.updated_at := now();
  if old.holds_slot and new.status in ('declined', 'cancelled', 'expired', 'waitlisted') then
    new.holds_slot := false;
    update public.services
    set slots_taken = greatest(0, slots_taken - 1),
        status = case when filled_at is not null and status = when_full then 'open' else status end,
        filled_at = null
    where id = old.service_id;
  end if;
  return new;
end;
$$;

-- Quotes past their expiry. Run before reading the queue or the buyer's
-- requests (no job runner yet); only the secret key can call it.
create function public.expire_commission_quotes()
returns integer
language sql
security definer
set search_path = ''
as $$
  with expired as (
    update public.commission_requests
    set status = 'expired'
    where status = 'quoted' and quote_expires_at < now()
    returning 1
  )
  select count(*)::integer from expired;
$$;

revoke execute on function public.expire_commission_quotes() from public, anon, authenticated;

-- Notifications (*_notifications_for_commission_requests.sql), now for the
-- whole order: the buyer hears about the answer, the quote, the start, the
-- delivery and an expired quote; the artist about new requests, cancels and
-- payment.
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
  if new.buyer_id = new.artist_id then
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
