-- Half-day support: self-declared by the employee at check-in time (not
-- auto-computed from hours worked — see TODO.md's 2026-09-03 entry for why).
alter table attendance
  add column day_type text not null default 'full' check (day_type in ('full', 'half'));
