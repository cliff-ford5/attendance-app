-- Attendance records could be edited (0022... actually 2026-09-14's admin
-- edit feature) but never deleted — no DELETE grant or policy exists on
-- `attendance` at all, so a delete call fails outright. Same two-part gap
-- this project has hit repeatedly (0009, 0018, 0021) — admin-only, same
-- reasoning as everywhere else an admin needs to remove a stray/duplicate
-- record (e.g. a geofence double-fire) rather than just correct it.
grant delete on public.attendance to authenticated;

create policy "attendance_delete_admin_only"
  on attendance for delete
  using (is_admin());
