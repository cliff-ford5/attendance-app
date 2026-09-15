-- Companion to the new "deactivate an employee" feature: a deactivated
-- employee shouldn't be able to check in at all. A UI-only block would be
-- trivially bypassed by anyone calling the insert directly, so this is
-- enforced at the RLS level (the actual authority), not just the app —
-- same "belt and suspenders" reasoning as the location-permission gate,
-- just enforced one layer deeper since this one is a real access-control
-- rule, not a UX nicety.
drop policy "attendance_insert_own" on attendance;

create policy "attendance_insert_own"
  on attendance for insert
  with check (
    employee_id = auth.uid()
    and (select active from employees where id = auth.uid())
  );
