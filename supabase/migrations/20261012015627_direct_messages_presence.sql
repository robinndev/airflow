-- Direct messages: presence in a conversation ("Here now" while the other
-- person has it open). Presence travels over the same private
-- `chat:<conversation id>` topic as typing hints, so the two people in a
-- conversation may now share presence there too. Your `inbox:<user id>`
-- topic stays broadcast-only (database triggers write to it).

drop policy "People hear their inbox and their chats" on realtime.messages;
drop policy "People send typing hints in their chats" on realtime.messages;

create policy "People hear their inbox and their chats"
  on realtime.messages for select
  to authenticated
  using (
    (
      realtime.messages.extension = 'broadcast'
      and (select realtime.topic()) = 'inbox:' || (select auth.uid())::text
    )
    or (
      realtime.messages.extension in ('broadcast', 'presence')
      and exists (
        select 1 from public.conversations c
        where (select auth.uid()) in (c.user_a, c.user_b)
          and 'chat:' || c.id::text = (select realtime.topic())
      )
    )
  );

create policy "People send typing hints and presence in their chats"
  on realtime.messages for insert
  to authenticated
  with check (
    realtime.messages.extension in ('broadcast', 'presence')
    and exists (
      select 1 from public.conversations c
      where (select auth.uid()) in (c.user_a, c.user_b)
        and 'chat:' || c.id::text = (select realtime.topic())
    )
  );
