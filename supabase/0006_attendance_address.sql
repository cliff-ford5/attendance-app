-- Human-readable location alongside the raw lat/lng already captured at
-- check-in/out — reverse-geocoded on-device (expo-location, no API key),
-- best-effort (nullable: geocoding can fail or be unsupported on a
-- platform, and that should never block a check-in/out).
alter table attendance
  add column check_in_address text,
  add column check_out_address text;
