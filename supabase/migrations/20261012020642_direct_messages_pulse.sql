-- Direct messages: the inbox "pulse". Realtime connections are capped per
-- plan (Pro: 500 at once), so a browser only keeps a WebSocket while its chat
-- window is open. The rest of the time it asks this, every few seconds, over
-- plain HTTP: how many conversations are unread, and when the newest message
-- from someone else arrived. Only when that changes does it load the inbox.
--
-- Runs as the caller (security invoker), so row level security decides what
-- it counts: only the caller's own conversations.

create function public.message_pulse()
returns table (unread integer, latest timestamptz)
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
    max(c.last_message_at) filter (where c.last_sender_id <> (select auth.uid()))
  from public.conversation_members m
  join public.conversations c on c.id = m.conversation_id
  where m.user_id = (select auth.uid())
    and c.last_message_at is not null;
$$;

revoke execute on function public.message_pulse() from public, anon;
grant execute on function public.message_pulse() to authenticated;
