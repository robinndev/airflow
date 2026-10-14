-- Why a buyer cancelled. Taking back a request (or saying no to a quote)
-- now asks for a reason, and the artist sees it: in the notification and on
-- the closed order. A cancel with no word left artists guessing, and made
-- bait requests (ask, hold the slot, vanish) free.
--
-- The reason is one of a short list (src/lib/commissions/cancel.ts), plus an
-- optional note ("something else" needs one; the Server Action checks that).
-- Orders cancelled before this have neither, so the columns stay nullable.

alter table public.commission_requests
  add column cancel_reason text check (cancel_reason in ('changed_mind', 'price', 'timing', 'other_artist', 'mistake', 'other')),
  add column cancel_note text check (char_length(cancel_note) <= 500),
  add constraint commission_requests_cancel_reason_only_when_cancelled
    check (status = 'cancelled' or (cancel_reason is null and cancel_note is null));

-- Both sides read them (the buyer wrote them; the artist is told why).
grant select (cancel_reason, cancel_note) on public.commission_requests to authenticated;

-- The artist's notification carries the reason and the note.
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
