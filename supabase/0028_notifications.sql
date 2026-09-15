-- Generic in-app notifications — one row per recipient per event, with
-- read/unread state, a `type` discriminator, and a `related_id` for
-- deep-linking back to the record that triggered it. Deliberately
-- populated by database triggers, not application code, so a future
-- feature can never forget to notify — same defense-in-depth reasoning as
-- employees_restrict_self_update. Schema is intentionally generic enough
-- to also carry future scheduled notification types (task_overdue,
-- checkout_reminder) once their trigger *timing* rules are decided — see
-- TODO.md; those aren't wired up yet, only the two event-driven types
-- below (task_assigned, leave_decided/leave_submitted) ship in this
-- migration, since they fire on a real DB event with no open question
-- attached.

create table notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references employees (id) on delete cascade,
  type text not null,
  title text not null,
  body text not null,
  related_id uuid,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index notifications_recipient_created_idx on notifications (recipient_id, created_at desc);

alter table notifications enable row level security;

grant select, update on public.notifications to authenticated;
-- No insert/delete grant to authenticated — rows are only ever created by
-- the SECURITY DEFINER trigger functions below (which run as the table
-- owner and bypass RLS), and deletion isn't a feature yet. A client can
-- never create or destroy someone's notification directly.

create policy "notifications_select_own"
  on notifications for select
  using (recipient_id = auth.uid());

create policy "notifications_update_own"
  on notifications for update
  using (recipient_id = auth.uid())
  with check (recipient_id = auth.uid());

-- The update grant above is blanket (every column) — RLS row policies
-- decide which ROWS, not which columns (same gotcha ARCHITECTURE.md's
-- Profile pictures section documents for employees). Without this
-- trigger, the policy above would let a recipient rewrite their own
-- notification's title/body/type, not just mark it read.
create function notifications_restrict_self_update()
returns trigger
language plpgsql
as $$
begin
  if new.recipient_id is distinct from old.recipient_id
    or new.type is distinct from old.type
    or new.title is distinct from old.title
    or new.body is distinct from old.body
    or new.related_id is distinct from old.related_id
    or new.created_at is distinct from old.created_at
  then
    raise exception 'Only read_at may be changed on a notification.';
  end if;
  return new;
end;
$$;

create trigger notifications_restrict_self_update
  before update on notifications
  for each row execute function notifications_restrict_self_update();

-- Task assigned -> notify the assignee. SECURITY DEFINER is required: a
-- plain (SECURITY INVOKER) trigger function would run as the inserting
-- user's own role and get rejected by RLS the same way a bare INSERT into
-- notifications by that user would (no insert policy exists for
-- authenticated, by design) — the same class of gotcha ARCHITECTURE.md's
-- avatar-upsert note describes for storage.objects.
create function notify_task_assigned()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into notifications (recipient_id, type, title, body, related_id)
  values (new.assigned_to, 'task_assigned', 'New task assigned', new.title, new.id);
  return new;
end;
$$;

create trigger notify_task_assigned
  after insert on tasks
  for each row execute function notify_task_assigned();

-- Leave request approved/rejected -> notify the employee who requested it.
create function notify_leave_decided()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status is distinct from old.status and new.status in ('approved', 'rejected') then
    insert into notifications (recipient_id, type, title, body, related_id)
    values (
      new.employee_id,
      'leave_decided',
      case when new.status = 'approved' then 'Leave request approved' else 'Leave request rejected' end,
      to_char(new.start_date, 'Mon DD') || ' - ' || to_char(new.end_date, 'Mon DD'),
      new.id
    );
  end if;
  return new;
end;
$$;

create trigger notify_leave_decided
  after update on leave_requests
  for each row execute function notify_leave_decided();

-- New leave request submitted -> notify every admin/super admin, so
-- there's a real "no excuse" record on the reviewing side too, not just
-- the employee side. Fans out to N rows (one per admin) in one insert.
create function notify_leave_submitted()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into notifications (recipient_id, type, title, body, related_id)
  select e.id, 'leave_submitted', 'New leave request',
    (select name from employees where id = new.employee_id) || ' requested time off',
    new.id
  from employees e
  where e.role in ('admin', 'superAdmin');
  return new;
end;
$$;

create trigger notify_leave_submitted
  after insert on leave_requests
  for each row execute function notify_leave_submitted();
