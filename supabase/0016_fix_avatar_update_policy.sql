-- 0015's avatar_update_own relied on Postgres's documented default (an
-- UPDATE policy with no WITH CHECK reuses USING for the new-row check too)
-- — but re-uploading a photo (an upsert against an existing object) kept
-- failing with "new row violates row-level security policy" even though
-- the stored policy text matched exactly what was intended (confirmed by
-- querying pg_policies directly, not assumed). Making WITH CHECK explicit
-- rather than relying on the implicit default, in case Supabase Storage's
-- upsert path (an INSERT ... ON CONFLICT DO UPDATE, not a plain UPDATE)
-- interacts with that default differently than a normal UPDATE would.
drop policy if exists "avatar_update_own" on storage.objects;

create policy "avatar_update_own"
  on storage.objects for update
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
