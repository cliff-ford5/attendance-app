-- Fixes a real gap: if an employee forgets to check out, nothing could
-- close that record — `attendance_update_own` only lets the employee
-- themselves update it. Lets an admin manually check someone out, tagged
-- distinctly from a self-checkout or the future geofence auto-checkout so
-- the history stays honest about who actually closed it.

alter table attendance drop constraint attendance_check_out_type_check;
alter table attendance add constraint attendance_check_out_type_check
  check (check_out_type in ('manual', 'auto_geofence', 'admin_correction'));

create policy "attendance_update_admin"
  on attendance for update
  using (is_admin())
  with check (is_admin());
