-- Employee profile pictures: self-service upload (an employee sets their
-- own, same as most apps — no admin busywork). Storage, not a data column
-- for the image itself: `avatar_path` on `employees` just records where in
-- the `avatars` bucket the file lives (e.g. `<employee_id>/avatar.jpg`),
-- null until the employee has ever uploaded one.
alter table employees
  add column avatar_path text;

-- Public bucket, deliberately: avatar photos are low-sensitivity and meant
-- to be seen (that's the point of having one), unlike attendance
-- coordinates or leave reasons. Public here only affects *reads* — writes
-- still go through the policies below, so only the account owner (or an
-- admin, implicitly, since admins can already edit anything about an
-- employee) can ever upload/replace/delete a given employee's photo.
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

create policy "avatar_insert_own"
  on storage.objects for insert
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "avatar_update_own"
  on storage.objects for update
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "avatar_delete_own"
  on storage.objects for delete
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

-- Letting an employee self-update `avatar_path` needs real care: 0002
-- already granted blanket `update` (all columns) on `employees` to
-- `authenticated`, gated only by 0001's admin-only row policy. Adding a
-- second, permissive "own row" update policy without also restricting
-- *which columns* a non-admin can actually change would let an employee
-- update ANY column on their own row through that new policy — including
-- `role`, the exact self-promotion path 0001's insert policy was written
-- to block. RLS row policies can't restrict individual columns on their
-- own, so a trigger does the column-level enforcement instead.
create function prevent_non_avatar_self_update()
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
    or new.name is distinct from old.name
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
    raise exception 'Employees may only update their own avatar_path.';
  end if;
  return new;
end;
$$;

create trigger employees_restrict_self_update
  before update on employees
  for each row
  execute function prevent_non_avatar_self_update();

create policy "employees_update_own_avatar"
  on employees for update
  using (id = auth.uid())
  with check (id = auth.uid());
