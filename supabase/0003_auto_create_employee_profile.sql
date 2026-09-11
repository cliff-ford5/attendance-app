-- Fix: this Supabase project has email confirmation enabled by default
-- (confirmed live — a signup attempt triggered a real confirmation email
-- send, not assumed). The original design had the client insert its own
-- `employees` row immediately after `auth.signUp()`, which only works if
-- signUp() returns an active session right away — with confirmation on,
-- it doesn't, so that insert would run unauthenticated and fail.
--
-- Standard Supabase pattern instead: a security-definer trigger on
-- auth.users creates the matching employees row at signup time,
-- regardless of confirmation state or which client session is active.
-- This also means employees no longer needs a client-writable INSERT
-- policy at all — see the dropped policy below.

create function handle_new_employee()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.employees (id, name, email, role)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'name', new.email), new.email, 'employee');
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_employee();

drop policy "employees_insert_self_as_employee" on employees;
