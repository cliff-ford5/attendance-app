-- Leave balance: leave_requests so far tracked requests but never how many
-- days an employee is actually entitled to, so the Leave screen could only
-- ever show a request log, not "how many do I have left" — the thing real
-- leave-tracking systems lead with. Deliberately simple for v1: a single
-- annual allotment in whole days, informational only (submitting a request
-- that would exceed it is not blocked — not asked for, and blocking would
-- need a real policy decision this app doesn't have yet). Only counts
-- against 'vacation' — sick/emergency/other stay unlimited, matching the
-- common real-world split between PTO and sick leave.
alter table employees
  add column annual_leave_days integer not null default 15 check (annual_leave_days >= 0);

-- No new RLS needed: this is just a column on `employees`, already covered
-- by 0001's employees_select_own_or_admin (read) and
-- employees_update_admin_only (an admin can adjust someone's allotment the
-- same way they edit any other profile field today).
