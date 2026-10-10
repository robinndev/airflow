-- When the current plan started ("on Flow+ since …" on /plans). A trigger
-- keeps it, so the team script (`npm run plans`) and, later, billing can't
-- forget to. Read-only for users, like `plan`.

alter table public.profiles
  add column plan_since timestamptz not null default now();

-- Free since joining. Paid plans set before this column existed start counting now.
update public.profiles set plan_since = created_at where plan = 'free';

create function private.stamp_plan_change()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.plan is distinct from old.plan then
    new.plan_since := now();
  end if;
  return new;
end;
$$;

revoke all on function private.stamp_plan_change() from public, anon, authenticated;

create trigger profiles_stamp_plan_change
  before update of plan on public.profiles
  for each row execute function private.stamp_plan_change();
