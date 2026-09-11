-- "Who's in" presence strip: employees can see which of their coworkers
-- are currently checked in, on their own Check-In screen. The base
-- `attendance` table's RLS (`attendance_select_own_or_admin`) deliberately
-- restricts a plain employee to only their own rows — and that stays
-- correct, since a full attendance row includes precise lat/lng/address,
-- which coworkers have no business seeing for each other. Instead of
-- loosening that policy, this view exposes only what "who's in" actually
-- needs (name, position, check-in time) for currently-open records.
--
-- This view is owned by the migration-running role, which bypasses RLS on
-- the underlying tables (same reasoning as `is_admin()`'s security-definer
-- function — a controlled, narrow bypass, not a blanket one). Granting
-- SELECT on the view to `authenticated` does NOT grant any new access to
-- the underlying `attendance`/`employees` tables themselves.
create view who_is_checked_in as
select
  a.employee_id,
  e.name,
  e.position,
  a.check_in_at
from attendance a
join employees e on e.id = a.employee_id
where a.check_out_at is null;

grant select on who_is_checked_in to authenticated;
