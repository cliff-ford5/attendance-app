-- Late-arrival / early-departure flags, computed client-side at
-- check-in/out time against a single global work-hours default (see
-- src/constants/workHours.ts) — not per-location yet, since there's no
-- locations-management screen to configure that (see TODO.md). Move this
-- to per-location hours once that screen exists.
alter table attendance
  add column is_late boolean not null default false,
  add column left_early boolean not null default false;
