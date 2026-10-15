-- Giving a slot back when delivering. A delivered commission keeps holding
-- its service's slot (the artist's capacity stays used), unless the artist
-- ticks "Add 1 slot back to this service" when sending the final files: then
-- the delivery releases it, and a service that had filled up reopens, the
-- same way a decline or a cancel does. Project lead's request, 2026-10-15
-- (VGen offers the same at final delivery).
--
-- The Server Action (`deliverOrder`) asks for it by writing holds_slot =
-- false together with status = 'delivered'; this trigger does the counting.

create or replace function private.release_service_slot()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.updated_at := now();
  if old.holds_slot and (
    new.status in ('declined', 'cancelled', 'expired', 'waitlisted')
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
