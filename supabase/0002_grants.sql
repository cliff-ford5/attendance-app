-- Fix: after applying 0001, PostgREST returned "permission denied" on every
-- table (42501) even though RLS policies were correct. RLS restricts which
-- *rows* a role can touch, but Postgres still requires base table-level
-- GRANTs before RLS is even evaluated — this project didn't have the usual
-- Supabase default privileges bootstrapped onto `anon`/`authenticated` for
-- these tables. Confirmed directly against the live project (a raw REST
-- call returned 42501 with Postgres's own "GRANT ... TO anon" hint) before
-- writing this, not assumed.

grant usage on schema public to anon, authenticated;

-- No insert grant on employees: profile rows are created by the
-- security-definer trigger in 0003, not by a client-side insert.
grant select, update on public.employees to authenticated;
grant select on public.locations to anon, authenticated;
grant select, insert, update on public.attendance to authenticated;
grant select, insert, update, delete on public.tasks to authenticated;
