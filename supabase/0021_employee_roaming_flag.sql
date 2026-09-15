-- "Roaming employee" — an admin-toggleable per-employee flag. Real client
-- gap: an employee sometimes legitimately works at a different location
-- than the one they're assigned (e.g. a technician sent to another
-- branch). Checked the actual code before designing this, not assumed:
-- check-in itself has never been location-restricted (no distance check
-- anywhere), so the only thing "location" restricts today is Phase 2's
-- optional background auto-checkout (geofenceTask.ts arms a geofence
-- around the employee's assigned location's radius). Roaming employees
-- just skip having that geofence armed at all — everything else about
-- attendance is unaffected.
alter table employees
  add column is_roaming boolean not null default false;

-- Same "two-part gap" this app has hit before (0009, 0018): a new column
-- isn't automatically covered by the existing self-update-restriction
-- trigger, so without this, a non-admin could flip their own is_roaming via
-- the existing employees_update_own_avatar policy. Widen the trigger's
-- blocked-columns list, same as every other admin-only field.
create or replace function prevent_non_avatar_self_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if is_admin() then
    return new;
  end if;
  if new.role is distinct from old.role
    or new.email is distinct from old.email
    or new.position is distinct from old.position
    or new.department is distinct from old.department
    or new.location_id is distinct from old.location_id
    or new.active is distinct from old.active
    or new.start_date is distinct from old.start_date
    or new.mobile_number is distinct from old.mobile_number
    or new.annual_leave_days is distinct from old.annual_leave_days
    or new.is_roaming is distinct from old.is_roaming
    or new.created_at is distinct from old.created_at
  then
    raise exception 'Employees may only update their own avatar_path and name.';
  end if;
  return new;
end;
$$;
