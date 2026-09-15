# Attendance App — Coding Standards

Terse, mechanical standards — the "how to write code here" reference. Product context lives in `CLAUDE.md`, architecture reasoning in `ARCHITECTURE.md`, collaboration style in `RULES.md`.

## Stack specifics

- **Expo SDK — check the installed version before relying on any API.** Expo's APIs (especially `expo-location`, `expo-task-manager`, `expo-notifications`) change meaningfully between SDK versions. Read `package.json` for the real installed version before writing code against any Expo module, don't assume from training data — same reminder TSKR's own `AGENTS.md` carries, applies here for the same reason.
- **TypeScript, strict mode.** No `any` without a real reason; prefer real types over casts.
- **Expo Router file-based routing.** Route files under `app/` stay thin (see `ARCHITECTURE.md` Rule #1) — a route file's entire job is re-exporting a screen component from `features/`.
- **Supabase client** lives once in `services/supabase.ts` (or equivalent), imported only by feature `services/` files — never imported directly into a component or hook.

## Coding standards

- **No dead code.** Delete unused code rather than commenting it out (see `RULES.md` for the one narrow kind of exception that requires explicit user approval first — not the default).
- **No premature abstraction.** Don't build a generic version of something until a second real use case exists.
- **Components never call Supabase directly.** Always through a feature's `services/` file, exposed via a hook. Same rule as the CRM's repository-interface pattern (`../crm/AGENTS.md`), expressed for this codebase's shape.
- **Background/geofencing logic stays isolated** inside `features/attendance/services/` and its own task-registration code — don't let `expo-task-manager` callback logic leak into screen components, since it runs outside the normal React render lifecycle and needs to be reasoned about separately.
- **Loading/error/empty states are not optional** on any screen that fetches data — real UX priority for this project (see `CLAUDE.md`), not a nice-to-have.
- **Permission requests explain *why* before triggering the OS prompt.** Never fire a bare `requestPermissionsAsync()` with no preceding in-app context — background location in particular reads as invasive without an explanation screen first.
- **A "create a new item" form is never always-visible inline above that item's list.** A `FAB` on the list screen opens the form as its own screen, presented with Expo Router's `presentation: 'modal'` and `AppHeader`'s `onClose` (not `onBack`). The same screen handles edit too via an optional route param, pre-filled from whatever hook the list already uses — see `ARCHITECTURE.md`'s Maintenance Guidelines (2026-09-14 entry) for the concrete shape (`NewLeaveRequestScreen`, `AssignTaskScreen`, `LocationFormScreen`) before building a new one inline.
- **Any list-screen filter uses `AppFilterButton` + `AppFilterSheet` (`src/components/`), never a per-screen row of `Chip`s.** Checkboxes, always — even a field that's single-valued *per record* (like `leave_requests.status`) still benefits from a multi-select filter ("Approved + Rejected" is a normal thing to want together); that's a fact about filtering, not about the record, so don't reach for single-select/radio buttons just because the underlying field is exclusive. No explicit "All"/"Any" option in the list — "Clear" is what shows everything.

## Pagination / data-fetching

- **Pagination is a real, established pattern now** (added 2026-09-10, both directions: admin's and each employee's own attendance history) — see `ARCHITECTURE.md`'s Pagination section for the exact `(offset, pageSize) → { records, hasMore }` shape before reinventing it for a new unbounded list (task list, staff roster once it grows).
- **Every data-loading hook uses `useRefetchOnFocus(load)`** (`src/hooks/useRefetchOnFocus.ts`), not a bare `useEffect(() => { load() }, [load])` — see `ARCHITECTURE.md`'s "Refetch on focus" section for why (tab/stack screens stay mounted between switches, so a mount-only effect goes stale).
- A screen that needs one specific record, not a list, fetches it directly by id rather than scanning a paginated hook's current page (`useAttendanceRecord` vs. `useMyAttendanceHistory`) — the former breaks the moment the record isn't on whatever page happens to be loaded.

## Documentation upkeep

- Update `TODO.md` for any completed, meaningfully-changed, or newly-discovered work — see `RULES.md` for the exact placement convention (new entries directly below `## Completed`, newest-first).
- Update `CLAUDE.md`'s Open Questions section the moment a question gets resolved — move it out of Open Questions into the relevant section, don't leave it stale once answered.
- Any schema change gets a committed `.sql` file (see `RULES.md`).
