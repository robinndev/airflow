-- Commission notices get a header button of their own (the order clipboard),
-- apart from the guest book's likes, comments and follows, so a popular
-- artist's requests don't drown in applause (Sabrina, 2026-10-14; option (b)
-- picked by the project lead, 2026-10-15).
--
-- message_pulse() keeps its first four columns, so browsers still running the
-- previous build keep working, but `notes_*` now count the guest book only;
-- the new `orders_*` count commission notices (new requests, quotes and
-- answers, cancels, payments, deliveries), up to 100 unread like the others.
-- The live broadcast (private.announce_notification) already carries the
-- kind, so the browser routes live notices the same way.

drop function public.message_pulse();

create function public.message_pulse()
returns table (
  unread integer,
  latest timestamptz,
  notes_unread integer,
  notes_latest timestamptz,
  orders_unread integer,
  orders_latest timestamptz
)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    (count(*) filter (
      where c.last_sender_id <> (select auth.uid())
        and m.archived_at is null
        and (m.last_read_at is null or m.last_read_at < c.last_message_at)
    ))::integer,
    max(c.last_message_at) filter (where c.last_sender_id <> (select auth.uid())),
    (select count(*) from (
      select 1 from public.notifications n
      where n.recipient_id = (select auth.uid()) and n.read_at is null
        and n.kind not in ('commission_request', 'request_update')
      limit 100
    ) unread_notes)::integer,
    (select max(n.updated_at) from public.notifications n
      where n.recipient_id = (select auth.uid())
        and n.kind not in ('commission_request', 'request_update')),
    (select count(*) from (
      select 1 from public.notifications n
      where n.recipient_id = (select auth.uid()) and n.read_at is null
        and n.kind in ('commission_request', 'request_update')
      limit 100
    ) unread_orders)::integer,
    (select max(n.updated_at) from public.notifications n
      where n.recipient_id = (select auth.uid())
        and n.kind in ('commission_request', 'request_update'))
  from public.conversation_members m
  join public.conversations c on c.id = m.conversation_id
  where m.user_id = (select auth.uid())
    and c.last_message_at is not null;
$$;

revoke execute on function public.message_pulse() from public, anon;
grant execute on function public.message_pulse() to authenticated;
