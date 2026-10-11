-- Direct messages: one conversation per pair of people (buyer ↔ artist, or
-- artist ↔ artist), with pictures, read receipts and live delivery.
--
-- A conversation is between two accounts (`user_a` < `user_b`, so a pair has
-- exactly one), or between an account and a demo artist (`demo_handle`). The
-- demo artists in src/lib/profile/mock-db.ts have no account, so nobody reads
-- what's sent to them; drop the column with the demo data.
--
-- Each person's own state (read up to, archived) lives in
-- `conversation_members`, one row per account, made by a trigger.
--
-- Live delivery uses Realtime Broadcast with authorization:
--   inbox:<user id>          new messages and read receipts, sent by triggers;
--                            only its owner can listen.
--   chat:<conversation id>   typing hints between the two people in it.
--
-- Pictures go to the private `messages` bucket, in
-- <conversation id>/<sender id>/<file>; only the two people can see them.

create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  user_a uuid not null references public.profiles (id) on delete cascade,
  user_b uuid references public.profiles (id) on delete cascade,
  demo_handle text check (demo_handle ~ '^[a-z0-9_][a-z0-9_.]{1,18}[a-z0-9_]$'),
  started_by uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  -- The newest message, for the inbox (kept by a trigger).
  last_message_at timestamptz,
  last_message_body text,
  last_sender_id uuid,
  constraint conversations_two_sides check ((user_b is null) <> (demo_handle is null)),
  constraint conversations_ordered check (user_b is null or user_a < user_b),
  constraint conversations_starter check (started_by = user_a or started_by = coalesce(user_b, user_a))
);

create unique index conversations_pair_key on public.conversations (user_a, user_b) where user_b is not null;
create unique index conversations_demo_key on public.conversations (user_a, demo_handle) where demo_handle is not null;
create index conversations_user_a_idx on public.conversations (user_a);
create index conversations_user_b_idx on public.conversations (user_b) where user_b is not null;
create index conversations_started_by_created_at_idx on public.conversations (started_by, created_at desc);

create table public.conversation_members (
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  -- Null until they first open it.
  last_read_at timestamptz,
  archived_at timestamptz,
  primary key (conversation_id, user_id)
);

create index conversation_members_user_id_idx on public.conversation_members (user_id);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  sender_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  body text not null default '' check (char_length(body) <= 2000),
  -- Up to four pictures: [{path, width, height}, …] in the `messages` bucket.
  images jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  constraint messages_not_empty check (char_length(btrim(body)) >= 1 or images <> '[]'::jsonb)
);

create index messages_conversation_id_created_at_idx on public.messages (conversation_id, created_at desc);
create index messages_sender_id_created_at_idx on public.messages (sender_id, created_at desc);

-- New conversations ------------------------------------------------------------
-- Someone can start up to 40 new conversations a day (spam brake); both
-- people get their member row.

create function private.check_new_conversation()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if (
    select count(*) from public.conversations
    where started_by = new.started_by and created_at > now() - interval '1 day'
  ) >= 40 then
    raise exception 'You''ve started a lot of conversations today. Try again tomorrow.' using errcode = '23514';
  end if;
  return new;
end;
$$;

revoke all on function private.check_new_conversation() from public, anon, authenticated;

create trigger conversations_check_new
  before insert on public.conversations
  for each row execute function private.check_new_conversation();

create function private.add_conversation_members()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.conversation_members (conversation_id, user_id) values (new.id, new.user_a);
  if new.user_b is not null then
    insert into public.conversation_members (conversation_id, user_id) values (new.id, new.user_b);
  end if;
  return null;
end;
$$;

revoke all on function private.add_conversation_members() from public, anon, authenticated;

create trigger conversations_add_members
  after insert on public.conversations
  for each row execute function private.add_conversation_members();

-- New messages -------------------------------------------------------------------
-- Checked on the way in (pictures must be the sender's uploads into this
-- conversation's folder; at most 20 messages a minute), then: the inbox
-- preview moves, the sender has read up to here, the conversation comes back
-- out of the archive for both, and both inboxes hear about it.

create function private.check_message()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  image jsonb;
begin
  if (
    select count(*) from public.messages
    where sender_id = new.sender_id and created_at > now() - interval '1 minute'
  ) >= 20 then
    raise exception 'Slow down a little: too many messages in a minute.' using errcode = '23514';
  end if;

  if jsonb_typeof(new.images) is distinct from 'array' or jsonb_array_length(new.images) > 4 then
    raise exception 'A message holds up to four pictures' using errcode = '23514';
  end if;
  for image in select value from jsonb_array_elements(new.images) loop
    if jsonb_typeof(image -> 'path') is distinct from 'string'
      or image ->> 'path' !~ ('^' || new.conversation_id::text || '/' || new.sender_id::text || '/[0-9a-f-]{36}\.(webp|jpg|gif)$')
      or jsonb_typeof(image -> 'width') is distinct from 'number'
      or jsonb_typeof(image -> 'height') is distinct from 'number'
      or (image ->> 'width')::numeric not between 1 and 8192
      or (image ->> 'height')::numeric not between 1 and 8192
    then
      raise exception 'Message pictures must be the sender''s uploads to this conversation' using errcode = '23514';
    end if;
  end loop;
  return new;
end;
$$;

revoke all on function private.check_message() from public, anon, authenticated;

create trigger messages_check
  before insert on public.messages
  for each row execute function private.check_message();

create function private.deliver_message()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  member uuid;
  payload jsonb := jsonb_build_object(
    'id', new.id,
    'conversation_id', new.conversation_id,
    'sender_id', new.sender_id,
    'body', new.body,
    'images', new.images,
    'created_at', new.created_at
  );
begin
  update public.conversations
  set last_message_at = new.created_at,
      last_message_body = left(new.body, 160),
      last_sender_id = new.sender_id
  where id = new.conversation_id;

  update public.conversation_members
  set last_read_at = case when user_id = new.sender_id then new.created_at else last_read_at end,
      archived_at = null
  where conversation_id = new.conversation_id;

  for member in select user_id from public.conversation_members where conversation_id = new.conversation_id loop
    perform realtime.send(payload, 'message', 'inbox:' || member::text, true);
  end loop;
  return null;
end;
$$;

revoke all on function private.deliver_message() from public, anon, authenticated;

create trigger messages_deliver
  after insert on public.messages
  for each row execute function private.deliver_message();

-- Read receipts ----------------------------------------------------------------
-- Reading never moves into the future; the other person hears "seen".

create function private.check_member_update()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.last_read_at > now() then
    new.last_read_at := now();
  end if;
  if new.archived_at > now() then
    new.archived_at := now();
  end if;
  return new;
end;
$$;

revoke all on function private.check_member_update() from public, anon, authenticated;

create trigger conversation_members_check
  before update on public.conversation_members
  for each row execute function private.check_member_update();

create function private.announce_read()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  other uuid;
begin
  if new.last_read_at is not distinct from old.last_read_at then
    return null;
  end if;
  for other in
    select user_id from public.conversation_members
    where conversation_id = new.conversation_id and user_id <> new.user_id
  loop
    perform realtime.send(
      jsonb_build_object('conversation_id', new.conversation_id, 'user_id', new.user_id, 'last_read_at', new.last_read_at),
      'read',
      'inbox:' || other::text,
      true
    );
  end loop;
  return null;
end;
$$;

revoke all on function private.announce_read() from public, anon, authenticated;

create trigger conversation_members_announce_read
  after update of last_read_at on public.conversation_members
  for each row execute function private.announce_read();

-- Row level security ---------------------------------------------------------------
-- Only the two people in a conversation see it, its members and its messages.

alter table public.conversations enable row level security;
alter table public.conversation_members enable row level security;
alter table public.messages enable row level security;

revoke all on public.conversations, public.conversation_members, public.messages from anon, authenticated;
grant select on public.conversations, public.conversation_members, public.messages to authenticated;
grant insert (user_a, user_b, demo_handle) on public.conversations to authenticated;
grant update (last_read_at, archived_at) on public.conversation_members to authenticated;
grant insert (conversation_id, body, images) on public.messages to authenticated;

create policy "People see their own conversations"
  on public.conversations for select
  to authenticated
  using ((select auth.uid()) in (user_a, user_b));

create policy "People start conversations they're in"
  on public.conversations for insert
  to authenticated
  with check ((select auth.uid()) = started_by and (select auth.uid()) in (user_a, user_b));

create policy "People see who's in their conversations"
  on public.conversation_members for select
  to authenticated
  using (
    exists (
      select 1 from public.conversations c
      where c.id = conversation_id and (select auth.uid()) in (c.user_a, c.user_b)
    )
  );

create policy "People mark their own side read or archived"
  on public.conversation_members for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "People read messages in their conversations"
  on public.messages for select
  to authenticated
  using (
    exists (
      select 1 from public.conversations c
      where c.id = conversation_id and (select auth.uid()) in (c.user_a, c.user_b)
    )
  );

create policy "People write as themselves in their conversations"
  on public.messages for insert
  to authenticated
  with check (
    (select auth.uid()) = sender_id
    and exists (
      select 1 from public.conversations c
      where c.id = conversation_id and (select auth.uid()) in (c.user_a, c.user_b)
    )
  );

-- Realtime authorization -----------------------------------------------------------
-- Private channels only: your own inbox, and the chats you're in.

create policy "People hear their inbox and their chats"
  on realtime.messages for select
  to authenticated
  using (
    realtime.messages.extension = 'broadcast'
    and (
      (select realtime.topic()) = 'inbox:' || (select auth.uid())::text
      or exists (
        select 1 from public.conversations c
        where (select auth.uid()) in (c.user_a, c.user_b)
          and 'chat:' || c.id::text = (select realtime.topic())
      )
    )
  );

create policy "People send typing hints in their chats"
  on realtime.messages for insert
  to authenticated
  with check (
    realtime.messages.extension = 'broadcast'
    and exists (
      select 1 from public.conversations c
      where (select auth.uid()) in (c.user_a, c.user_b)
        and 'chat:' || c.id::text = (select realtime.topic())
    )
  );

-- Pictures ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('messages', 'messages', false, 10485760, array['image/webp', 'image/jpeg', 'image/gif']);

create policy "People attach pictures to their conversations"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'messages'
    and (storage.foldername(name))[2] = (select auth.uid())::text
    and exists (
      select 1 from public.conversations c
      where (select auth.uid()) in (c.user_a, c.user_b)
        and c.id::text = (storage.foldername(name))[1]
    )
  );

create policy "People see pictures in their conversations"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'messages'
    and exists (
      select 1 from public.conversations c
      where (select auth.uid()) in (c.user_a, c.user_b)
        and c.id::text = (storage.foldername(name))[1]
    )
  );

create policy "People remove pictures they sent"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'messages' and (storage.foldername(name))[2] = (select auth.uid())::text);
