-- An artist can only close or delete a commission service once every
-- commission on it is done: delivered, or ended (declined, cancelled,
-- expired). Until then it stays open, so nobody who asked, paid or is
-- waiting on a piece is left behind. Project lead's rule, 2026-10-15.
--
-- The studio's Server Actions check first and explain it in the artist's
-- words (src/lib/listings/closing.ts); this trigger is the backstop.
--
-- Not covered, on purpose:
--   * Closing by itself when the slots run out ("when full"): the slot
--     trigger sets `filled_at` when it does that, so a close with `filled_at`
--     set isn't the artist closing it.
--   * Deleting an account: its services go with it (cascade), and by then the
--     owner's profile is already gone.

create function private.close_only_when_done()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  open_orders integer;
  target uuid;
begin
  if tg_op = 'DELETE' then
    -- The account is being deleted: let its services go.
    if not exists (select 1 from public.profiles where id = old.owner_id) then
      return old;
    end if;
    target := old.id;
  elsif new.status = 'closed' and old.status <> 'closed' and new.filled_at is null then
    target := new.id;
  else
    return new;
  end if;

  select count(*) into open_orders
  from public.commission_requests r
  where r.service_id = target
    and r.status in ('pending', 'waitlisted', 'quoted', 'paid', 'in_progress');

  if open_orders > 0 then
    raise exception using
      errcode = 'check_violation',
      message = case tg_op
        when 'DELETE' then format('You can''t delete “%s” yet: %s open commission(s) on it. Finish or decline them first.', old.title, open_orders)
        else format('“%s” stays open until its commissions are done (%s still open). Finish or decline them, then close it.', new.title, open_orders)
      end;
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

revoke all on function private.close_only_when_done() from public, anon, authenticated;

create trigger services_close_only_when_done
  before delete or update of status on public.services
  for each row execute function private.close_only_when_done();
