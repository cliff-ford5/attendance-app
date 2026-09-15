-- Employees can now edit their own display name from a new "My Profile"
-- screen (2026-09-11) — not just avatar_path (0015). Same column-level
-- trigger approach as 0015, just widening the exception list by one
-- column, rather than loosening the row policy itself (which would risk
-- the exact self-promotion path 0015's own comment already explains: a
-- permissive "own row" policy can't restrict *which* columns change on
-- its own, only a trigger can).
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
    or new.created_at is distinct from old.created_at
  then
    raise exception 'Employees may only update their own avatar_path and name.';
  end if;
  return new;
end;
$$;

-- The existing `employees_update_own_avatar` row policy (0015) is
-- unchanged and still correctly named for what it's *scoped to* (the
-- caller's own row) — it never restricted which columns, the trigger
-- above does, so no policy change is needed for this to cover `name` too.
