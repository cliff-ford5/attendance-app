-- Initial schema: locations, employees, attendance, tasks.
--
-- Unlike the CRM (../crm), this app has no server layer — the Expo client
-- talks to Supabase directly with the anon key. That makes RLS load-bearing
-- here, not "soft"/app-level-only like the CRM's current policy-free RLS
-- (see ../crm/supabase/wave_2_schema.sql's header) — copying that pattern
-- here would leave the app either wide open or fully locked out. Every
-- table below gets real policies.
--
-- employees.id = auth.users.id: employees authenticate directly (unlike
-- the CRM's separate manual-provisioning-by-email model), so the profile
-- row *is* the login identity.

-- ============================================================
-- locations
-- ============================================================
create table locations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  latitude double precision not null,
  longitude double precision not null,
  radius_meters integer not null default 4000
);

alter table locations enable row level security;

-- ============================================================
-- employees
-- ============================================================
create table employees (
  id uuid primary key references auth.users (id) on delete cascade,
  name text not null,
  email text not null,
  role text not null default 'employee' check (role in ('employee', 'admin', 'superAdmin')),
  position text,
  department text,
  location_id uuid references locations (id),
  active boolean not null default true,
  start_date date,
  mobile_number text,
  created_at timestamptz not null default now()
);

alter table employees enable row level security;

-- security definer so policies on `employees` can check the caller's own
-- role without recursively re-triggering RLS on the same table (standard
-- Supabase pattern).
create function is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from employees
    where id = auth.uid() and role in ('admin', 'superAdmin')
  );
$$;

create policy "employees_select_own_or_admin"
  on employees for select
  using (id = auth.uid() or is_admin());

-- Self-signup always creates an 'employee' row — never lets a client
-- request self-grant admin/superAdmin.
create policy "employees_insert_self_as_employee"
  on employees for insert
  with check (id = auth.uid() and role = 'employee');

-- All updates (including role changes/promotions) are admin-only for v1;
-- self profile-editing wasn't asked for yet, kept out to avoid an
-- unguarded self-role-escalation path.
create policy "employees_update_admin_only"
  on employees for update
  using (is_admin())
  with check (is_admin());

-- ============================================================
-- attendance
-- ============================================================
create table attendance (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references employees (id) on delete cascade,
  check_in_at timestamptz not null default now(),
  check_in_lat double precision,
  check_in_lng double precision,
  check_out_at timestamptz,
  check_out_lat double precision,
  check_out_lng double precision,
  check_out_type text check (check_out_type in ('manual', 'auto_geofence'))
);

create index attendance_employee_open_idx on attendance (employee_id) where check_out_at is null;

alter table attendance enable row level security;

create policy "attendance_select_own_or_admin"
  on attendance for select
  using (employee_id = auth.uid() or is_admin());

create policy "attendance_insert_own"
  on attendance for insert
  with check (employee_id = auth.uid());

-- Covers both manual checkout and the future geofence auto-checkout — the
-- background task still runs under the employee's own session token.
create policy "attendance_update_own"
  on attendance for update
  using (employee_id = auth.uid())
  with check (employee_id = auth.uid());

-- ============================================================
-- tasks
-- ============================================================
create table tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  assigned_to uuid not null references employees (id) on delete cascade,
  assigned_by uuid not null references employees (id),
  created_at timestamptz not null default now(),
  deadline timestamptz not null,
  status text not null default 'assigned' check (status in ('assigned', 'in_progress', 'done')),
  priority text not null default 'medium' check (priority in ('low', 'medium', 'high')),
  completed_at timestamptz
);

alter table tasks enable row level security;

create policy "tasks_select_own_or_admin"
  on tasks for select
  using (assigned_to = auth.uid() or assigned_by = auth.uid() or is_admin());

create policy "tasks_insert_admin_only"
  on tasks for insert
  with check (is_admin());

-- The assignee can update their own task's status; admins can edit/reassign anything.
create policy "tasks_update_assignee_or_admin"
  on tasks for update
  using (assigned_to = auth.uid() or is_admin())
  with check (assigned_to = auth.uid() or is_admin());

create policy "tasks_delete_admin_only"
  on tasks for delete
  using (is_admin());
