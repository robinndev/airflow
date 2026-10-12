-- Notifications: what happened around your work while you were away.
--
-- Rows are written only by triggers on the tables where things happen
-- (likes, comments, follows, reposts, new profiles), never by the browser, so
-- every way of liking or commenting notifies, and taking it back (unliking,
-- unfollowing, deleting the comment or the post) takes the notice back too.
-- People read their own and mark them read; nobody else sees them.
--
-- Likes stay private (see *_follows_and_likes.sql): a like notice has no
-- actor, only a tally of new likes on a post, folded into one row until it's
-- read. Follows, comments and reposts are public already, so they're signed.
--
-- The browser hears about new ones through message_pulse() (redefined at the
-- end; one HTTP pulse for messages and notifications), or instantly on the
-- inbox:<user id> channel while its chat socket is open.

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references public.profiles (id) on delete cascade,
  kind text not null check (kind in (
    'welcome',
    'like',
    'comment',
    'reply',
    'mention',
    'follow',
    'repost',
    'invite_joined',
    -- Reserved for the commission flow (written by its own triggers).
    'commission_request',
    'request_update'
  )),
  -- Who did it. Null for likes (private) and for notes from the studio itself.
  actor_id uuid references public.profiles (id) on delete cascade,
  -- The recipient's post it's about (liked, commented on, reposted).
  post_id uuid references public.posts (id) on delete cascade,
  -- Comments and mentions on demo posts (no rows; drop with the demo data).
  demo_post_id text check (demo_post_id ~ '^pst_[0-9]+$'),
  comment_id uuid references public.comments (id) on delete cascade,
  -- The repost, or the post that mentions you.
  source_post_id uuid references public.posts (id) on delete cascade,
  -- New likes folded into this notice.
  tally integer not null default 1 check (tally >= 1),
  -- Extra details a kind needs (the commission flow: service, price, status).
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  -- Latest activity (a folded like bumps it): the order notices are shown in.
  updated_at timestamptz not null default now(),
  read_at timestamptz,
  constraint notifications_likes_unsigned check (kind <> 'like' or actor_id is null),
  constraint notifications_not_self check (actor_id is distinct from recipient_id)
);

create index notifications_recipient_updated_idx on public.notifications (recipient_id, updated_at desc);
create index notifications_unread_idx on public.notifications (recipient_id) where read_at is null;
-- One unread like notice per post: new likes fold into it.
create unique index notifications_like_fold_key on public.notifications (recipient_id, post_id)
  where kind = 'like' and read_at is null;
-- Cascades from deleted profiles, posts and comments.
create index notifications_actor_id_idx on public.notifications (actor_id) where actor_id is not null;
create index notifications_post_id_idx on public.notifications (post_id) where post_id is not null;
create index notifications_comment_id_idx on public.notifications (comment_id) where comment_id is not null;
create index notifications_source_post_id_idx on public.notifications (source_post_id) where source_post_id is not null;

alter table public.notifications enable row level security;

revoke all on public.notifications from anon, authenticated;
grant select on public.notifications to authenticated;
grant update (read_at) on public.notifications to authenticated;

create policy "People read their own notifications"
  on public.notifications for select
  to authenticated
  using ((select auth.uid()) = recipient_id);

create policy "People mark their own notifications read"
  on public.notifications for update
  to authenticated
  using ((select auth.uid()) = recipient_id)
  with check ((select auth.uid()) = recipient_id);

-- Writing ------------------------------------------------------------------------

-- One notice. Nobody is notified about their own doing.
create function private.notify(
  recipient uuid,
  what text,
  actor uuid default null,
  about_post uuid default null,
  about_demo_post text default null,
  about_comment uuid default null,
  source_post uuid default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if recipient is null or recipient = actor then
    return;
  end if;
  insert into public.notifications (recipient_id, kind, actor_id, post_id, demo_post_id, comment_id, source_post_id)
  values (recipient, what, actor, about_post, about_demo_post, about_comment, source_post);
end;
$$;

revoke all on function private.notify(uuid, text, uuid, uuid, text, uuid, uuid) from public, anon, authenticated;

-- Accounts @mentioned in a text (up to 10), other than its author. Same
-- handle rule as profiles; an email address (x@y) isn't a mention.
create function private.mentioned(body text, author uuid)
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  select distinct p.id
  from (
    select lower(m[1]) as handle
    from regexp_matches(body, '(?:^|[^a-zA-Z0-9_.@/])@([a-zA-Z0-9_][a-zA-Z0-9_.]{1,18}[a-zA-Z0-9_])', 'g') as m
    limit 10
  ) h
  join public.profiles p on p.handle = h.handle
  where p.id <> author;
$$;

revoke all on function private.mentioned(text, uuid) from public, anon, authenticated;

-- Likes: folded per post, never signed. Demo posts' artists have no account.
create function private.notify_like()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  author uuid;
begin
  if new.post_id is null then
    return null;
  end if;
  select p.author_id into author from public.posts p where p.id = new.post_id;
  if author is null or author = new.user_id then
    return null;
  end if;
  insert into public.notifications (recipient_id, kind, post_id)
  values (author, 'like', new.post_id)
  on conflict (recipient_id, post_id) where kind = 'like' and read_at is null
  do update set tally = public.notifications.tally + 1, updated_at = now();
  return null;
end;
$$;

-- Taking a like back takes it off the unread notice that counted it.
create function private.unnotify_like()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.post_id is null then
    return null;
  end if;
  delete from public.notifications n
  where n.post_id = old.post_id and n.kind = 'like' and n.read_at is null
    and n.created_at <= old.created_at and n.tally = 1;
  update public.notifications n
  set tally = n.tally - 1
  where n.post_id = old.post_id and n.kind = 'like' and n.read_at is null
    and n.created_at <= old.created_at and n.tally > 1;
  return null;
end;
$$;

revoke all on function private.notify_like() from public, anon, authenticated;
revoke all on function private.unnotify_like() from public, anon, authenticated;

create trigger post_likes_notify
  after insert on public.post_likes
  for each row execute function private.notify_like();

create trigger post_likes_unnotify
  after delete on public.post_likes
  for each row execute function private.unnotify_like();

-- Comments: a reply tells the comment's author; a comment tells the post's
-- author (unless they were just told about it as a reply); @mentions tell
-- whoever is named and hasn't heard yet.
create function private.notify_comment()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  post_author uuid;
  parent_author uuid;
  person uuid;
begin
  if new.post_id is not null then
    select p.author_id into post_author from public.posts p where p.id = new.post_id;
  end if;
  if new.parent_id is not null then
    select c.author_id into parent_author from public.comments c where c.id = new.parent_id;
  end if;

  perform private.notify(parent_author, 'reply', new.author_id, new.post_id, new.demo_post_id, new.id);
  if post_author is distinct from parent_author then
    perform private.notify(post_author, 'comment', new.author_id, new.post_id, new.demo_post_id, new.id);
  end if;
  for person in select m from private.mentioned(new.body, new.author_id) as m loop
    if person is distinct from parent_author and person is distinct from post_author then
      perform private.notify(person, 'mention', new.author_id, new.post_id, new.demo_post_id, new.id);
    end if;
  end loop;
  return null;
end;
$$;

revoke all on function private.notify_comment() from public, anon, authenticated;

create trigger comments_notify
  after insert on public.comments
  for each row execute function private.notify_comment();

-- Follows: signed. Unfollowing before it was seen takes the notice back; once
-- someone has been told, following again doesn't tell them twice (so
-- follow/unfollow can't be used to ping anyone).
create function private.notify_follow()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.followee_id is null then
    return null;
  end if;
  if exists (
    select 1 from public.notifications n
    where n.recipient_id = new.followee_id and n.kind = 'follow' and n.actor_id = new.follower_id
  ) then
    return null;
  end if;
  perform private.notify(new.followee_id, 'follow', new.follower_id);
  return null;
end;
$$;

create function private.unnotify_follow()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.followee_id is not null then
    delete from public.notifications n
    where n.recipient_id = old.followee_id and n.kind = 'follow' and n.actor_id = old.follower_id
      and n.read_at is null;
  end if;
  return null;
end;
$$;

revoke all on function private.notify_follow() from public, anon, authenticated;
revoke all on function private.unnotify_follow() from public, anon, authenticated;

create trigger follows_notify
  after insert on public.follows
  for each row execute function private.notify_follow();

create trigger follows_unnotify
  after delete on public.follows
  for each row execute function private.unnotify_follow();

-- Posts: a repost tells the original's author; @mentions in the text tell
-- whoever is named.
create function private.notify_post()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  original_author uuid;
  person uuid;
begin
  if new.quote_post_id is not null then
    select p.author_id into original_author from public.posts p where p.id = new.quote_post_id;
    perform private.notify(original_author, 'repost', new.author_id, new.quote_post_id, null, null, new.id);
  end if;
  for person in select m from private.mentioned(new.body, new.author_id) as m loop
    if person is distinct from original_author then
      perform private.notify(person, 'mention', new.author_id, null, null, null, new.id);
    end if;
  end loop;
  return null;
end;
$$;

revoke all on function private.notify_post() from public, anon, authenticated;

create trigger posts_notify
  after insert on public.posts
  for each row execute function private.notify_post();

-- New accounts: a welcome note (the first page of their book), and the
-- artist whose invite they used hears about it. create_profile sets
-- invited_by right after the insert, so that's an update.
create function private.notify_new_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.notify(new.id, 'welcome');
  perform private.notify(new.invited_by, 'invite_joined', new.id);
  return null;
end;
$$;

create function private.notify_inviter()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.notify(new.invited_by, 'invite_joined', new.id);
  return null;
end;
$$;

revoke all on function private.notify_new_profile() from public, anon, authenticated;
revoke all on function private.notify_inviter() from public, anon, authenticated;

create trigger profiles_notify_new
  after insert on public.profiles
  for each row execute function private.notify_new_profile();

create trigger profiles_notify_inviter
  after update of invited_by on public.profiles
  for each row
  when (old.invited_by is null and new.invited_by is not null)
  execute function private.notify_inviter();

-- What already happened ----------------------------------------------------------
-- Filed as read, so nobody opens the site to a wall of badges, but nobody's
-- book starts empty either. (Before the announce trigger below exists, so
-- none of this is broadcast.)

insert into public.notifications (recipient_id, kind, created_at, updated_at, read_at)
select p.id, 'welcome', p.created_at, p.created_at, now()
from public.profiles p;

insert into public.notifications (recipient_id, kind, actor_id, created_at, updated_at, read_at)
select p.invited_by, 'invite_joined', p.id, p.created_at, p.created_at, now()
from public.profiles p
where p.invited_by is not null and p.invited_by <> p.id;

insert into public.notifications (recipient_id, kind, actor_id, created_at, updated_at, read_at)
select f.followee_id, 'follow', f.follower_id, f.created_at, f.created_at, now()
from public.follows f
where f.followee_id is not null;

insert into public.notifications (recipient_id, kind, post_id, tally, created_at, updated_at, read_at)
select p.author_id, 'like', p.id, count(*), min(l.created_at), max(l.created_at), now()
from public.post_likes l
join public.posts p on p.id = l.post_id
where l.user_id <> p.author_id
group by p.id, p.author_id;

insert into public.notifications (recipient_id, kind, actor_id, post_id, demo_post_id, comment_id, created_at, updated_at, read_at)
select parent.author_id, 'reply', c.author_id, c.post_id, c.demo_post_id, c.id, c.created_at, c.created_at, now()
from public.comments c
join public.comments parent on parent.id = c.parent_id
where parent.author_id <> c.author_id;

insert into public.notifications (recipient_id, kind, actor_id, post_id, comment_id, created_at, updated_at, read_at)
select p.author_id, 'comment', c.author_id, c.post_id, c.id, c.created_at, c.created_at, now()
from public.comments c
join public.posts p on p.id = c.post_id
left join public.comments parent on parent.id = c.parent_id
where p.author_id <> c.author_id and parent.author_id is distinct from p.author_id;

insert into public.notifications (recipient_id, kind, actor_id, post_id, source_post_id, created_at, updated_at, read_at)
select o.author_id, 'repost', r.author_id, o.id, r.id, r.created_at, r.created_at, now()
from public.posts r
join public.posts o on o.id = r.quote_post_id
where o.author_id <> r.author_id;

-- Announcing ---------------------------------------------------------------------

-- New notices (and folded likes) reach an open chat socket right away. The
-- inbox:<user id> topic already lets only its owner listen (direct messages).
create function private.announce_notification()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform realtime.send(
    jsonb_build_object('id', new.id, 'kind', new.kind, 'at', new.updated_at),
    'notification',
    'inbox:' || new.recipient_id::text,
    true
  );
  return null;
end;
$$;

revoke all on function private.announce_notification() from public, anon, authenticated;

create trigger notifications_announce
  after insert or update of updated_at on public.notifications
  for each row execute function private.announce_notification();

-- One pulse for messages and notifications. Same two columns as before, so
-- browsers still running the previous build keep working; the new ones are
-- unread notices (counted up to 100: the badge says 99+) and the newest one.
drop function public.message_pulse();

create function public.message_pulse()
returns table (unread integer, latest timestamptz, notes_unread integer, notes_latest timestamptz)
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
      limit 100
    ) unread_notes)::integer,
    (select max(n.updated_at) from public.notifications n where n.recipient_id = (select auth.uid()))
  from public.conversation_members m
  join public.conversations c on c.id = m.conversation_id
  where m.user_id = (select auth.uid())
    and c.last_message_at is not null;
$$;

revoke execute on function public.message_pulse() from public, anon;
grant execute on function public.message_pulse() to authenticated;
