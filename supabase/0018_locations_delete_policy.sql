-- Locations could be created/edited by an admin (0009) but never deleted —
-- no DELETE grant or policy exists on `locations` at all, so a delete call
-- would fail outright (base GRANT missing, same two-part gap 0009 found
-- and fixed for insert/update on this same table). Admin-only, consistent
-- with every other locations policy.
grant delete on public.locations to authenticated;

create policy "locations_delete_admin_only"
  on locations for delete
  using (is_admin());
