// Placeholder default work hours, applied company-wide, used only to flag
// late arrival / early departure. Not real per-location hours — there's no
// locations-management screen yet to configure that (see TODO.md's
// "locations management" gap). Move this to per-location hours once that
// screen exists; until then this is a single global default, easy to
// tweak here without a migration.
export const DEFAULT_WORK_START = '09:00';
export const DEFAULT_WORK_END = '18:00';

// Minutes of tolerance before something counts as late/early — avoids
// flagging someone who's 1-2 minutes off.
export const LATE_GRACE_MINUTES = 15;
export const EARLY_DEPARTURE_GRACE_MINUTES = 15;
