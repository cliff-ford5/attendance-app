-- Locations management: found while building this screen that `locations`
-- has had RLS enabled since 0001 but *zero* policies on it — enabled +
-- no policy means deny-all, so nobody (not even an admin) could actually
-- read or write a location before now. Real gap, not by design.
--
-- Assigning an employee to a location just reuses the existing
-- `employees_update_admin_only` policy (0001) — no new policy needed there.

create policy "locations_select_authenticated"
  on locations for select
  using (auth.uid() is not null);

create policy "locations_insert_admin_only"
  on locations for insert
  with check (is_admin());

create policy "locations_update_admin_only"
  on locations for update
  using (is_admin())
  with check (is_admin());

grant insert, update on public.locations to authenticated;
