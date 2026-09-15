-- Per-holiday choice: some holidays should still allow check-in (a skeleton
-- crew covers a slow public holiday) while others shouldn't (the business is
-- genuinely closed) — a single blanket rule for every holiday would be
-- wrong either way, so this is a per-row flag the admin sets when adding or
-- editing a holiday, not a global setting.
alter table holidays add column blocks_check_in boolean not null default false;
