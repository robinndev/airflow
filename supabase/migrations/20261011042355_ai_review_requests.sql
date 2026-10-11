-- "I made this myself": review requests for uploads the AI check turned away.
--
-- The upload refuses files that carry an AI generator's marks
-- (src/lib/ai-check/). When the artist says it's a mistake, the request lands
-- here: what was found, where, and their note. The file itself isn't kept;
-- the team follows up with the artist. List open ones with
-- `npm run ai-check -- requests`.

create table public.ai_review_requests (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  file_name text not null check (char_length(file_name) between 1 and 255),
  file_type text not null default '' check (char_length(file_type) <= 100),
  file_size bigint not null check (file_size >= 0),
  generator text not null check (char_length(generator) between 1 and 100),
  evidence text not null check (char_length(evidence) between 1 and 300),
  excerpt text not null default '' check (char_length(excerpt) <= 300),
  note text not null default '' check (char_length(note) <= 1000),
  status text not null default 'open' check (status in ('open', 'cleared', 'upheld')),
  created_at timestamptz not null default now()
);

create index ai_review_requests_open_idx on public.ai_review_requests (created_at) where status = 'open';
create index ai_review_requests_requester_id_idx on public.ai_review_requests (requester_id, created_at);

-- At most 10 requests a day per artist, so the queue can't be flooded.
create function private.limit_ai_review_requests()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if (
    select count(*) from public.ai_review_requests
    where requester_id = new.requester_id and created_at > now() - interval '1 day'
  ) >= 10 then
    raise exception 'Too many review requests today' using errcode = '23514';
  end if;
  return new;
end;
$$;

revoke all on function private.limit_ai_review_requests() from public, anon, authenticated;

create trigger ai_review_requests_limit
  before insert on public.ai_review_requests
  for each row execute function private.limit_ai_review_requests();

alter table public.ai_review_requests enable row level security;

-- Artists file requests as themselves and see their own; status is the team's (secret key).
revoke all on public.ai_review_requests from anon, authenticated;
grant select on public.ai_review_requests to authenticated;
grant insert (file_name, file_type, file_size, generator, evidence, excerpt, note) on public.ai_review_requests to authenticated;

create policy "Artists see their own review requests"
  on public.ai_review_requests for select
  to authenticated
  using ((select auth.uid()) = requester_id);

create policy "Artists ask for reviews as themselves"
  on public.ai_review_requests for insert
  to authenticated
  with check ((select auth.uid()) = requester_id);
