-- Listings: what artists sell, and the requests buyers send.
--
-- Two kinds of listing, bought in different ways (src/lib/listings/catalog.ts):
-- - services: made to order. The buyer requests, the artist reviews and
--   quotes, then the piece is drawn. Packages (sketch -> lineart -> full
--   color), a turnaround, optional slots and a status of its own.
-- - adoptables: ready-made characters. Fixed price, available -> reserved ->
--   sold, one owner.
--
-- Artists write their own listings under row level security (Server Actions
-- in src/app/(site)/studio/actions.ts validate first; the triggers below are
-- the backstop). Listings are public.
--
-- commission_requests: a buyer's request to a service (or a custom piece).
-- Written only by the Server Action, with the secret key, after it checks the
-- session; buyers and artists read their own. A request takes one of the
-- service's slots when it arrives and gives it back when declined or
-- cancelled. When the last slot goes, the service switches to its "when full"
-- status, and it reopens when a slot comes back.

-- Services ---------------------------------------------------------------------

create table public.services (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  title text not null check (char_length(title) between 3 and 80),
  category text not null check (category in (
    'illustration', 'character-design', 'icons', 'ref-sheets', 'chibi', 'backgrounds',
    'emotes', 'pixel-art', 'comics', 'animation', 'other'
  )),
  styles text[] not null default '{}' check (
    cardinality(styles) <= 4
    and styles <@ array['anime', 'semi_realistic', 'realistic', 'cartoon', 'painterly', 'cel_shaded', 'traditional', 'pixel', 'sketchy']
  ),
  description text not null default '' check (char_length(description) <= 2000),
  -- What every package includes ("1 character", "2 revisions").
  includes text[] not null default '{}' check (cardinality(includes) <= 8),
  -- [{ id, label, priceUsd, includes: [] }], 1 to 4, cheapest first.
  packages jsonb not null check (jsonb_typeof(packages) = 'array' and jsonb_array_length(packages) between 1 and 4),
  -- The cheapest package; kept by the trigger.
  price_from_usd numeric(8, 2) not null default 0,
  turnaround_min_days smallint not null check (turnaround_min_days between 1 and 365),
  turnaround_max_days smallint not null check (turnaround_max_days between 1 and 365),
  -- Example art: [{ path, width, height, palette }] in the owner's listings folder.
  examples jsonb not null default '[]' check (jsonb_typeof(examples) = 'array' and jsonb_array_length(examples) <= 6),
  -- Licenses: { personal, commercialContent, commercialMerch }, each an AddonPrice or null.
  usage jsonb not null default '{"personal": {"kind": "included"}, "commercialContent": null, "commercialMerch": null}'
    check (jsonb_typeof(usage) = 'object'),
  -- Extras: [{ id, label, price, hint? }].
  addons jsonb not null default '[]' check (jsonb_typeof(addons) = 'array' and jsonb_array_length(addons) <= 8),
  status text not null default 'open' check (status in ('open', 'waitlist', 'closed')),
  slots_total smallint check (slots_total between 1 and 99),
  slots_taken smallint not null default 0 check (slots_taken between 0 and 999),
  when_full text not null default 'closed' check (when_full in ('waitlist', 'closed')),
  -- Set when the last slot went and the status switched to when_full; a slot coming back reopens it.
  filled_at timestamptz,
  -- The status before "Pause all", restored on resume.
  paused_status text check (paused_status in ('open', 'waitlist', 'closed')),
  position smallint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint services_turnaround_order check (turnaround_min_days <= turnaround_max_days)
);

create index services_owner_id_position_idx on public.services (owner_id, position);
create index services_status_created_at_idx on public.services (status, created_at desc);

create function private.prepare_service()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    if (select count(*) from public.services where owner_id = new.owner_id) >= 20 then
      raise exception 'You can list up to 20 services' using errcode = '23514';
    end if;
    new.position := coalesce((select max(position) + 1 from public.services where owner_id = new.owner_id), 0);
    new.created_at := now();
    new.slots_taken := 0;
  elsif new.owner_id <> old.owner_id then
    raise exception 'Services can''t change hands' using errcode = '42501';
  end if;

  if exists (
    select 1 from jsonb_array_elements(new.packages) as p
    where jsonb_typeof(p) <> 'object'
      or char_length(coalesce(p ->> 'id', '')) not between 1 and 40
      or char_length(coalesce(p ->> 'label', '')) not between 1 and 40
      or jsonb_typeof(p -> 'priceUsd') <> 'number'
      or (p ->> 'priceUsd')::numeric not between 1 and 10000
      or jsonb_typeof(coalesce(p -> 'includes', '[]')) <> 'array'
      or jsonb_array_length(coalesce(p -> 'includes', '[]')) > 8
  ) then
    raise exception 'Each package needs a name and a price between $1 and $10,000' using errcode = '23514';
  end if;
  -- Images live in art/<owner id>/listings/.
  if exists (
    select 1 from jsonb_array_elements(new.examples) as i
    where jsonb_typeof(i) <> 'object'
      or coalesce(i ->> 'path', '') not like new.owner_id::text || '/listings/%'
      or jsonb_typeof(i -> 'width') <> 'number'
      or jsonb_typeof(i -> 'height') <> 'number'
  ) then
    raise exception 'Example images must be your own uploads' using errcode = '42501';
  end if;
  if exists (select 1 from unnest(new.includes) as item where char_length(item) not between 1 and 60) then
    raise exception 'Keep each included item under 60 characters' using errcode = '23514';
  end if;

  new.price_from_usd := (select min((p ->> 'priceUsd')::numeric) from jsonb_array_elements(new.packages) as p);
  new.updated_at := now();
  return new;
end;
$$;

revoke all on function private.prepare_service() from public, anon, authenticated;

create trigger services_prepare
  before insert or update on public.services
  for each row execute function private.prepare_service();

alter table public.services enable row level security;

revoke all on public.services from anon, authenticated;
grant select on public.services to anon, authenticated;
grant insert (title, category, styles, description, includes, packages, turnaround_min_days, turnaround_max_days,
  examples, usage, addons, status, slots_total, when_full)
  on public.services to authenticated;
grant update (title, category, styles, description, includes, packages, turnaround_min_days, turnaround_max_days,
  examples, usage, addons, status, slots_total, slots_taken, when_full, filled_at, paused_status, position)
  on public.services to authenticated;
grant delete on public.services to authenticated;

create policy "Services are public"
  on public.services for select
  to anon, authenticated
  using (true);

create policy "Artists list their own services"
  on public.services for insert
  to authenticated
  with check ((select auth.uid()) = owner_id);

create policy "Artists edit their own services"
  on public.services for update
  to authenticated
  using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);

create policy "Artists remove their own services"
  on public.services for delete
  to authenticated
  using ((select auth.uid()) = owner_id);

-- Adoptables -------------------------------------------------------------------

create table public.adoptables (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 60),
  species text not null default '' check (char_length(species) <= 60),
  description text not null default '' check (char_length(description) <= 2000),
  -- [{ path, width, height, palette }], the first is the cover.
  images jsonb not null check (jsonb_typeof(images) = 'array' and jsonb_array_length(images) between 1 and 4),
  price_usd numeric(8, 2) not null check (price_usd between 1 and 10000),
  includes text[] not null default '{}' check (cardinality(includes) <= 8),
  status text not null default 'available' check (status in ('available', 'reserved', 'sold')),
  sold_at timestamptz,
  position smallint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index adoptables_owner_id_position_idx on public.adoptables (owner_id, position);
create index adoptables_status_created_at_idx on public.adoptables (status, created_at desc);

create function private.prepare_adoptable()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    if (select count(*) from public.adoptables where owner_id = new.owner_id) >= 100 then
      raise exception 'You can list up to 100 adoptables' using errcode = '23514';
    end if;
    new.position := coalesce((select max(position) + 1 from public.adoptables where owner_id = new.owner_id), 0);
    new.created_at := now();
  elsif new.owner_id <> old.owner_id then
    raise exception 'Listings can''t change hands' using errcode = '42501';
  end if;

  -- Images live in art/<owner id>/listings/.
  if exists (
    select 1 from jsonb_array_elements(new.images) as i
    where jsonb_typeof(i) <> 'object'
      or coalesce(i ->> 'path', '') not like new.owner_id::text || '/listings/%'
      or jsonb_typeof(i -> 'width') <> 'number'
      or jsonb_typeof(i -> 'height') <> 'number'
  ) then
    raise exception 'Images must be your own uploads' using errcode = '42501';
  end if;
  if exists (select 1 from unnest(new.includes) as item where char_length(item) not between 1 and 60) then
    raise exception 'Keep each included item under 60 characters' using errcode = '23514';
  end if;

  new.sold_at := case when new.status = 'sold' then coalesce(case when tg_op = 'UPDATE' then old.sold_at end, now()) end;
  new.updated_at := now();
  return new;
end;
$$;

revoke all on function private.prepare_adoptable() from public, anon, authenticated;

create trigger adoptables_prepare
  before insert or update on public.adoptables
  for each row execute function private.prepare_adoptable();

alter table public.adoptables enable row level security;

revoke all on public.adoptables from anon, authenticated;
grant select on public.adoptables to anon, authenticated;
grant insert (name, species, description, images, price_usd, includes, status) on public.adoptables to authenticated;
grant update (name, species, description, images, price_usd, includes, status, position) on public.adoptables to authenticated;
grant delete on public.adoptables to authenticated;

create policy "Adoptables are public"
  on public.adoptables for select
  to anon, authenticated
  using (true);

create policy "Artists list their own adoptables"
  on public.adoptables for insert
  to authenticated
  with check ((select auth.uid()) = owner_id);

create policy "Artists edit their own adoptables"
  on public.adoptables for update
  to authenticated
  using ((select auth.uid()) = owner_id)
  with check ((select auth.uid()) = owner_id);

create policy "Artists remove their own adoptables"
  on public.adoptables for delete
  to authenticated
  using ((select auth.uid()) = owner_id);

-- Commission requests ----------------------------------------------------------

create table public.commission_requests (
  id uuid primary key default gen_random_uuid(),
  buyer_id uuid not null references public.profiles (id) on delete cascade,
  artist_id uuid not null references public.profiles (id) on delete cascade,
  -- Null for a custom piece, or once the service is deleted (the snapshot stays).
  service_id uuid references public.services (id) on delete set null,
  service_title text not null check (char_length(service_title) between 1 and 80),
  -- The package picked, priced when sent: { id, label, priceUsd }.
  package jsonb check (package is null or jsonb_typeof(package) = 'object'),
  -- Licenses and add-ons ticked, priced when sent: [{ id, label, priceUsd }].
  addons jsonb not null default '[]' check (jsonb_typeof(addons) = 'array' and jsonb_array_length(addons) <= 16),
  -- Package (or "from" price) plus extras, when sent. Null for a custom piece.
  estimate_usd numeric(8, 2) check (estimate_usd is null or estimate_usd >= 0),
  description text not null check (char_length(description) between 20 and 2000),
  reference_links text check (char_length(reference_links) <= 1000),
  deadline date,
  usage text not null default 'personal' check (usage in ('personal', 'commercial')),
  budget text check (budget in ('under-50', '50-150', '150-300', '300-plus')),
  -- The terms the buyer accepted, as they read them.
  terms_snapshot jsonb,
  status text not null default 'pending' check (status in ('pending', 'waitlisted', 'declined', 'cancelled', 'accepted')),
  -- Whether this request holds one of the service's slots right now.
  holds_slot boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint commission_requests_not_self check (buyer_id <> artist_id)
);

-- One open request per buyer per service, so nobody takes every slot.
create unique index commission_requests_one_open_key
  on public.commission_requests (buyer_id, service_id)
  where service_id is not null and status in ('pending', 'waitlisted');
create index commission_requests_artist_id_created_at_idx on public.commission_requests (artist_id, created_at desc);
create index commission_requests_buyer_id_created_at_idx on public.commission_requests (buyer_id, created_at desc);
create index commission_requests_service_id_idx on public.commission_requests (service_id) where service_id is not null;

-- On arrival: the service must take requests; an open one gives up a slot
-- (and switches to its when-full status if that was the last one), a
-- waitlisted one queues without a slot. 20 requests a day per buyer.
create function private.take_service_slot()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  svc public.services%rowtype;
begin
  if (
    select count(*) from public.commission_requests
    where buyer_id = new.buyer_id and created_at > now() - interval '1 day'
  ) >= 20 then
    raise exception 'You''ve sent a lot of requests today. Try again tomorrow.' using errcode = '23514';
  end if;

  new.created_at := now();
  new.updated_at := now();
  new.holds_slot := false;
  new.status := 'pending';
  if new.service_id is null then
    return new;
  end if;

  select * into svc from public.services where id = new.service_id for update;
  if not found or svc.owner_id <> new.artist_id then
    raise exception 'That service is no longer available.' using errcode = 'P0002';
  end if;
  if svc.status = 'closed' then
    raise exception 'This service is closed right now.' using errcode = '23514';
  end if;
  if svc.status = 'waitlist' then
    new.status := 'waitlisted';
    return new;
  end if;
  if svc.slots_total is not null then
    if svc.slots_taken >= svc.slots_total then
      raise exception 'Every slot was just taken.' using errcode = '23514';
    end if;
    new.holds_slot := true;
    update public.services
    set slots_taken = slots_taken + 1,
        status = case when slots_taken + 1 >= slots_total then when_full else status end,
        filled_at = case when slots_taken + 1 >= slots_total then now() else filled_at end
    where id = svc.id;
  end if;
  return new;
end;
$$;

revoke all on function private.take_service_slot() from public, anon, authenticated;

create trigger commission_requests_take_slot
  before insert on public.commission_requests
  for each row execute function private.take_service_slot();

-- Declined or cancelled: the slot comes back, and a service that filled up reopens.
create function private.release_service_slot()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.updated_at := now();
  if old.holds_slot and new.status in ('declined', 'cancelled') then
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

revoke all on function private.release_service_slot() from public, anon, authenticated;

create trigger commission_requests_release_slot
  before update on public.commission_requests
  for each row execute function private.release_service_slot();

alter table public.commission_requests enable row level security;

revoke all on public.commission_requests from anon, authenticated;
grant select on public.commission_requests to authenticated;

create policy "Buyers and artists see their requests"
  on public.commission_requests for select
  to authenticated
  using ((select auth.uid()) in (buyer_id, artist_id));
