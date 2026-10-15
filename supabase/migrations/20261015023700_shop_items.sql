-- The shop (/shop) sells more than frames: profile effects, animated names,
-- animated covers, sticker packs for the About board and pins beside the
-- name. One table holds everything an account owns (catalog in
-- src/lib/shop/catalog.ts); frames move over from owned_frames, which stays
-- for deployments that predate this migration and isn't written anymore.
--
-- Only the server writes here (secret key): free items are claimed, paid
-- ones will be bought at checkout, and Flow+ members take one paid item a
-- month for free ("monthly pick", one row per calendar month).

create table public.owned_items (
  user_id uuid not null references public.profiles (id) on delete cascade,
  kind text not null check (kind in ('frame', 'effect', 'name', 'cover', 'stickers', 'pin')),
  item_id text not null check (item_id ~ '^[a-z0-9-]{2,40}$'),
  source text not null default 'claim' check (source in ('claim', 'purchase', 'gift', 'monthly')),
  -- The month a Flow+ monthly pick was taken in (its first day); only on those rows.
  claimed_month date check ((source = 'monthly') = (claimed_month is not null) and (claimed_month is null or extract(day from claimed_month) = 1)),
  acquired_at timestamptz not null default now(),
  primary key (user_id, kind, item_id)
);

-- One monthly pick per account per month (other rows have no month).
create unique index owned_items_one_pick_a_month on public.owned_items (user_id, claimed_month);

comment on table public.owned_items is 'Shop items an account owns (catalog in src/lib/shop/catalog.ts). Written by the server only.';

alter table public.owned_items enable row level security;

revoke all on public.owned_items from anon, authenticated;
grant select on public.owned_items to authenticated;

create policy "People see what they own"
  on public.owned_items for select
  to authenticated
  using ((select auth.uid()) = user_id);

insert into public.owned_items (user_id, kind, item_id, source, acquired_at)
select f.user_id, 'frame', f.frame_id, f.source, f.acquired_at
from public.owned_frames f
on conflict do nothing;

comment on table public.owned_frames is 'Superseded by owned_items (20261015023700_shop_items.sql); kept for older deployments, no longer written.';
