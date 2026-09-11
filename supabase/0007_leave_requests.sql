-- Leave/time-off requests with admin approval — a real gap flagged during
-- review (see TODO.md's 2026-09-03 "Recommended" entry), genuinely
-- different from daily check-in/out: planned in advance, needs approval.

create table leave_requests (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references employees (id) on delete cascade,
  leave_type text not null check (leave_type in ('vacation', 'sick', 'emergency', 'other')),
  start_date date not null,
  end_date date not null,
  reason text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'cancelled')),
  reviewed_by uuid references employees (id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  constraint leave_requests_date_range check (end_date >= start_date)
);

alter table leave_requests enable row level security;

grant select, insert, update on public.leave_requests to authenticated;

create policy "leave_select_own_or_admin"
  on leave_requests for select
  using (employee_id = auth.uid() or is_admin());

-- Always inserted as 'pending' — can't self-approve on the way in.
create policy "leave_insert_own_pending"
  on leave_requests for insert
  with check (employee_id = auth.uid() and status = 'pending');

-- An employee can only ever move their own request to 'cancelled' (e.g.
-- plans changed, even after approval) — approving/rejecting is admin-only.
create policy "leave_update_own_cancel_or_admin"
  on leave_requests for update
  using (employee_id = auth.uid() or is_admin())
  with check ((employee_id = auth.uid() and status = 'cancelled') or is_admin());
