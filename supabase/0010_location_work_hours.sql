-- Per-location expected work hours, replacing the single global default
-- (src/constants/workHours.ts) that late/early flagging used until now.
-- Stored as "HH:MM" text (consistent with how the app already represented
-- these), not a Postgres `time`, to keep it a plain string round-trip
-- through PostgREST with no timezone/parsing ambiguity.
alter table locations
  add column expected_start text not null default '09:00' check (expected_start ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'),
  add column expected_end text not null default '18:00' check (expected_end ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$');
