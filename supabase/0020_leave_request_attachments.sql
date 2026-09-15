-- Leave requests can now optionally carry photo evidence + a location, so
-- an admin reviewing a request (e.g. "it's rainy, the road's flooded") has
-- something more than a free-text reason to go on. Direct user request
-- (2026-09-12): "to proof employee is not making things up".

alter table leave_requests
  add column attachment_path text,
  add column location_lat double precision,
  add column location_lng double precision,
  add column location_address text;

-- Private bucket, deliberately unlike `avatars` (public) — CLAUDE.md's
-- Profile pictures section already calls out leave reasons as more
-- sensitive than a profile photo, and an attachment here could be anything
-- from a flooded street to a medical note. Public here would mean anyone
-- with the URL could view it, with no auth check at all.
insert into storage.buckets (id, name, public)
values ('leave-attachments', 'leave-attachments', false)
on conflict (id) do nothing;

-- Upload: own folder only, same `<uid>/...` convention as `avatars`.
create policy "leave_attachment_insert_own"
  on storage.objects for insert
  with check (bucket_id = 'leave-attachments' and (storage.foldername(name))[1] = auth.uid()::text);

-- Read: the employee who uploaded it, or any admin (the reviewer needs to
-- actually see the proof) — via a short-lived signed URL, since the bucket
-- isn't public. No update/delete policy: attachments aren't editable or
-- removable after upload, matching leave requests themselves having no
-- edit/delete yet (see TODO.md's CRUD-gap audit).
create policy "leave_attachment_select_own_or_admin"
  on storage.objects for select
  using (bucket_id = 'leave-attachments' and ((storage.foldername(name))[1] = auth.uid()::text or is_admin()));
