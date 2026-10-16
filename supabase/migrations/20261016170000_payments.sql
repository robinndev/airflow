-- Payments, on Stripe (decided 2026-10-16; docs/roadmap.md, payments brief).
--
-- Artiflow's platform is the Stripe account of a Brazilian company, and
-- Stripe can't take a platform fee on artists abroad for it (tested). So every
-- sale is a "direct charge" on the artist's own Stripe account: the money goes
-- straight to the artist, never through Artiflow, and Stripe takes its own
-- processing fee on the artist's side. Artiflow's platform fee is 0% for now
-- (the founding artists' offer, src/lib/plans.ts).
--
--   payout_accounts  where an artist gets paid: their Stripe account
--   payments         one row per checkout: what was charged and where it stands
--
-- Both are written only by Server Actions and the Stripe webhook, with the
-- secret key, after their own checks; nobody gets grants. A paid commission
-- can now be refunded by its artist (paid / in_progress -> refunded), which
-- gives the slot back and tells the buyer. While a buyer is on the checkout
-- page, the quote (or the adoptable) is held for them: `checkout_until`.

-- Payout accounts ---------------------------------------------------------------

create table public.payout_accounts (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  provider text not null default 'stripe' check (provider = 'stripe'),
  account_id text not null unique,
  -- Where the artist lives (ISO code). Stripe can't change it later.
  country text not null check (country ~ '^[A-Z]{2}$'),
  -- incomplete: the artist hasn't finished Stripe's form; review: Stripe is
  -- checking; active: buyers can pay them; unsupported: Stripe can't take
  -- payments for them.
  status text not null default 'incomplete' check (status in ('incomplete', 'review', 'active', 'unsupported')),
  checked_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.payout_accounts enable row level security;
revoke all on public.payout_accounts from anon, authenticated;

-- Payments ----------------------------------------------------------------------

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('commission', 'adoption')),
  request_id uuid references public.commission_requests (id) on delete set null,
  adoptable_id uuid references public.adoptables (id) on delete set null,
  buyer_id uuid references public.profiles (id) on delete set null,
  artist_id uuid references public.profiles (id) on delete set null,
  provider text not null default 'stripe' check (provider = 'stripe'),
  -- The artist's Stripe account the charge was made on.
  account_id text not null,
  checkout_id text unique,
  checkout_url text,
  payment_intent_id text unique,
  charge_id text,
  -- What the buyer was charged (in `currency`) and the listed price it came from.
  amount_cents integer not null check (amount_cents > 0),
  currency text not null check (currency ~ '^[a-z]{3}$'),
  price_usd numeric(8, 2) not null check (price_usd > 0),
  -- USD -> `currency` rate used to price it (1 for USD), and where it came from.
  fx_rate numeric(12, 6) not null default 1,
  fx_source text,
  platform_fee_cents integer not null default 0 check (platform_fee_cents >= 0),
  -- Stripe's own fee and what reached the artist, in the artist's settlement currency.
  processor_fee_cents integer,
  net_cents integer,
  settlement_currency text,
  refunded_cents integer not null default 0 check (refunded_cents >= 0),
  status text not null default 'open' check (status in ('open', 'paid', 'failed', 'expired', 'refunded', 'disputed')),
  expires_at timestamptz,
  paid_at timestamptz,
  refunded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint payments_one_subject check (num_nonnulls(request_id, adoptable_id) <= 1)
);

create index payments_request_id_idx on public.payments (request_id);
create index payments_adoptable_id_idx on public.payments (adoptable_id);
create index payments_buyer_id_idx on public.payments (buyer_id, created_at desc);
create index payments_artist_id_idx on public.payments (artist_id, created_at desc);
-- One payment that counts per order and per adoptable (a second one is refunded).
create unique index payments_one_paid_per_request on public.payments (request_id) where status in ('paid', 'disputed');
create unique index payments_one_paid_per_adoptable on public.payments (adoptable_id) where status in ('paid', 'disputed');

alter table public.payments enable row level security;
revoke all on public.payments from anon, authenticated;

create function private.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger payout_accounts_touch before update on public.payout_accounts
  for each row execute function private.touch_updated_at();
create trigger payments_touch before update on public.payments
  for each row execute function private.touch_updated_at();

-- Commissions: refunds, and the quote held during checkout ----------------------

alter table public.commission_requests drop constraint commission_requests_status_check;
alter table public.commission_requests
  add constraint commission_requests_status_check check (status in (
    'pending', 'waitlisted', 'quoted', 'paid', 'in_progress', 'delivered', 'declined', 'cancelled', 'expired', 'refunded'
  ));

alter table public.commission_requests
  add column checkout_until timestamptz,
  add column refunded_at timestamptz,
  -- What the artist says when refunding.
  add column refund_note text check (char_length(refund_note) <= 500);

grant select (checkout_until, refunded_at, refund_note) on public.commission_requests to authenticated;

-- A quote doesn't expire while its buyer is on the checkout page.
create or replace function public.expire_commission_quotes()
returns integer
language sql
security definer
set search_path = ''
as $$
  with expired as (
    update public.commission_requests
    set status = 'expired'
    where status = 'quoted' and quote_expires_at < now()
      and (checkout_until is null or checkout_until < now())
    returning 1
  )
  select count(*)::integer from expired;
$$;

revoke execute on function public.expire_commission_quotes() from public, anon, authenticated;

-- A refund gives the slot back, like a decline or a cancel.
create or replace function private.release_service_slot()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.updated_at := now();
  if old.holds_slot and (
    new.status in ('declined', 'cancelled', 'expired', 'waitlisted', 'refunded')
    -- Delivered with the slot given back.
    or (new.status = 'delivered' and old.status <> 'delivered' and not new.holds_slot)
  ) then
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

-- The buyer hears about a refund, with the artist's note.
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
      details || jsonb_strip_nulls(jsonb_build_object('refund_note', left(new.refund_note, 240)))
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

-- Adoptables: held during checkout, and a notice to the artist when adopted -----

alter table public.adoptables add column checkout_until timestamptz;

alter table public.notifications drop constraint notifications_kind_check;
alter table public.notifications add constraint notifications_kind_check check (kind in (
  'welcome', 'like', 'comment', 'reply', 'mention', 'follow', 'repost', 'invite_joined',
  'commission_request', 'request_update', 'adoption',
  'became_artist', 'artist_codes', 'verified'
));

create function private.notify_adoption()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  adoptable record;
begin
  if new.kind <> 'adoption' or new.status <> 'paid' or old.status = 'paid'
    or new.artist_id is null or new.buyer_id is null or new.buyer_id = new.artist_id then
    return null;
  end if;
  select a.name, a.images -> 0 ->> 'path' as cover into adoptable from public.adoptables a where a.id = new.adoptable_id;
  insert into public.notifications (recipient_id, kind, actor_id, data)
  values (
    new.artist_id, 'adoption', new.buyer_id,
    jsonb_strip_nulls(jsonb_build_object(
      'adoptable_id', new.adoptable_id,
      'name', adoptable.name,
      'cover', adoptable.cover,
      'price_usd', new.price_usd
    ))
  );
  return null;
end;
$$;

revoke all on function private.notify_adoption() from public, anon, authenticated;

create trigger payments_notify_adoption
  after update of status on public.payments
  for each row execute function private.notify_adoption();

-- Adoptions are work, like commissions: they go on the order clipboard.
create or replace function public.message_pulse()
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
        and n.kind not in ('commission_request', 'request_update', 'adoption')
      limit 100
    ) unread_notes)::integer,
    (select max(n.updated_at) from public.notifications n
      where n.recipient_id = (select auth.uid())
        and n.kind not in ('commission_request', 'request_update', 'adoption')),
    (select count(*) from (
      select 1 from public.notifications n
      where n.recipient_id = (select auth.uid()) and n.read_at is null
        and n.kind in ('commission_request', 'request_update', 'adoption')
      limit 100
    ) unread_orders)::integer,
    (select max(n.updated_at) from public.notifications n
      where n.recipient_id = (select auth.uid())
        and n.kind in ('commission_request', 'request_update', 'adoption'))
  from public.conversation_members m
  join public.conversations c on c.id = m.conversation_id
  where m.user_id = (select auth.uid())
    and c.last_message_at is not null;
$$;

revoke execute on function public.message_pulse() from public, anon;
grant execute on function public.message_pulse() to authenticated;
