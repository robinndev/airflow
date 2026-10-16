-- Refunds that wait on the artist's Stripe balance, who asked for each, and
-- the team's money permissions (roadmap: team roles brief, `money.refund`).
--
-- A sale lands on the artist's own Stripe account, so a refund comes out of
-- their balance. When it's empty, Stripe keeps the refund pending and sends
-- it as soon as the balance covers it: `refund_pending` until then. Refunds
-- are asked for by the artist (Artiflow or their Stripe Dashboard), by the
-- team (/admin/payments, `money.refund`), or automatically (a payment for
-- something that had moved on).

alter table public.payments drop constraint payments_status_check;
alter table public.payments
  add constraint payments_status_check check (status in ('open', 'paid', 'failed', 'expired', 'refund_pending', 'refunded', 'disputed'));

alter table public.payments
  add column refund_source text check (refund_source in ('artist', 'team', 'dashboard', 'auto')),
  add column refund_reason text check (char_length(refund_reason) <= 500),
  add column refund_requested_by uuid references public.profiles (id) on delete set null,
  add column refund_requested_at timestamptz;

-- Who refunded a commission: its artist, the team, or the artist from Stripe's Dashboard.
alter table public.commission_requests
  add column refunded_by text check (refunded_by in ('artist', 'team', 'dashboard'));

grant select (refunded_by) on public.commission_requests to authenticated;

-- The buyer's refund notice says who refunded it.
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
  elsif new.status = 'refunded' then
    insert into public.notifications (recipient_id, kind, actor_id, request_id, data)
    values (
      new.buyer_id, 'request_update', new.artist_id, new.id,
      details || jsonb_strip_nulls(jsonb_build_object('refund_note', left(new.refund_note, 240), 'refunded_by', new.refunded_by))
    );
  elsif new.status = 'cancelled' then
    insert into public.notifications (recipient_id, kind, actor_id, request_id, data)
    values (
      new.artist_id, 'request_update', new.buyer_id, new.id,
      details || jsonb_strip_nulls(jsonb_build_object(
        'cancel_reason', new.cancel_reason,
        'cancel_note', left(new.cancel_note, 240),
        'was_quoted', old.status = 'quoted'
      ))
    );
  elsif new.status = 'paid' then
    insert into public.notifications (recipient_id, kind, actor_id, request_id, data)
    values (new.artist_id, 'request_update', new.buyer_id, new.id, details);
  end if;
  return null;
end;
$$;

-- The team's money permissions, given by name (`npm run team -- grant @handle money.refund`).
alter table public.team_members
  add column permissions text[] not null default '{}'
    check (permissions <@ array['money.refund', 'money.hold']::text[]);

-- The project lead holds refunds to start with.
update public.team_members set permissions = array['money.refund']
where user_id = (select id from public.profiles where handle = 'robindev');
