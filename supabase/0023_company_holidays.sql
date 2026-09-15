-- Company holidays — a real gap: nothing in the schema distinguishes "no
-- one's expected to work today" from a normal day, so a holiday currently
-- looks identical to mass unexplained absence anywhere attendance is
-- summarized (admin dashboard, KPI, once either exists in earnest). This is
-- deliberately a table of specific dates, not a recurring "every Jan 1"
-- rule: several real holidays (Eid al-Fitr, Eid al-Adha, Lunar New Year)
-- move every year against the Gregorian calendar, so a fixed month/day rule
-- would silently be wrong for them — an admin re-entering next year's dates
-- once a year is the correct model, not a shortcut.
--
-- Company-wide only for v1, not per-location — no per-location holiday
-- need has actually come up yet (unlike expected work hours, which
-- genuinely differ by branch); add a location_id later if that changes.
--
-- Read is broad (any authenticated user — this is informational, not
-- sensitive, the same reasoning as `locations_select_authenticated`),
-- write is admin-only. Same two-part "RLS policy + base GRANT" gap this
-- project has hit three times now (0009, 0018, 0021) — granted in full
-- here from the start instead of piecemeal.

create table holidays (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  date date not null unique,
  created_at timestamptz not null default now()
);

alter table holidays enable row level security;

create policy "holidays_select_authenticated"
  on holidays for select
  using (auth.uid() is not null);

create policy "holidays_insert_admin_only"
  on holidays for insert
  with check (is_admin());

create policy "holidays_update_admin_only"
  on holidays for update
  using (is_admin())
  with check (is_admin());

create policy "holidays_delete_admin_only"
  on holidays for delete
  using (is_admin());

grant select, insert, update, delete on public.holidays to authenticated;

create index holidays_date_idx on holidays (date);
