-- The real fix for the upsert/delete failures that 0016 didn't solve.
-- Postgres RLS documents this explicitly: "INSERT ... ON CONFLICT DO
-- UPDATE" (what Storage's upload-with-upsert actually runs) requires the
-- conflicting row to be visible via a SELECT policy before the UPDATE
-- policy is even evaluated — and this table had none. Marking the bucket
-- "public" only makes the Storage API's file-serving endpoint skip auth;
-- it does not add a database-level SELECT policy on storage.objects
-- itself. A public-read SELECT policy is exactly the right fix anyway,
-- since the bucket is meant to be public-read.
create policy "avatar_select_all"
  on storage.objects for select
  using (bucket_id = 'avatars');
