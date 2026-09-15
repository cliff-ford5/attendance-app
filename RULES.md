# Attendance App — Working Rules & Collaboration Style

How the user likes to work. Complements, doesn't duplicate:
- **`AGENTS.md`** — coding/architecture standards.
- **`TODO.md`** — live project status (read its "Quick Status" section first in any new session).
- **`CLAUDE.md`** — product spec (entities, feature flow, open questions).
- **`ARCHITECTURE.md`** — technical architecture reference.

Same four-file structure as the sibling CRM project (`../crm`), which itself carried this pattern over from `../tskr-mobile`. Content here is fresh for this project, not copied — but the collaboration style below is a real, established pattern from working with this user on the CRM, not invented for this project.

## Collaboration style

- **Answer or ask before coding, on genuine decisions.** When there's a real fork — which approach to take, whether to keep or drop something, how deep a fix should go — surface it and get a decision first, don't silently pick an approach and implement it. Check `CLAUDE.md`'s Open Questions and `TODO.md`'s "Deferred by the user" for what's currently still genuinely open (as of now: KPI formula, notifications) — don't guess at these, ask. Both lists are meant to shrink over time as items get resolved, so don't hardcode examples here that will go stale.
- **Give a direct recommendation, not a neutral menu of options.** When asked "is X good?" or "what should we do here," lead with a real opinion and the one main tradeoff — don't just list pros/cons and leave the decision hanging. Confirmed, repeated preference from working on the CRM.
- **Be blunt if an idea seems wrong** — the user's own idea or a pattern being copied from elsewhere. Don't soften it to be agreeable.
- **Verify real data/behavior before committing to a decision, don't assume.** On the CRM, this meant checking real production data before big calls (e.g. real row counts before a schema migration). On this project, the equivalent is testing real device behavior early — geofencing/background-location behavior in particular varies a lot between iOS/Android/simulator-vs-real-device, and assumptions about it are very likely to be wrong until actually tested on a real phone.
- **Small implementation details usually don't need a question** — reserve real back-and-forth for things that actually change direction (architecture, scope, product behavior), not every minor choice.
- **Care about UX as a first-class concern, not an afterthought** — explicitly asked for this app specifically. Native platform conventions, real loading/error/empty states, permission-request flows that explain *why* before the OS prompt appears.

## Working habits

- **Update `TODO.md` as you go**, not just at the end of a task — dated entries, newest-first under Completed, with enough "why" a future session doesn't have to re-derive the reasoning.
- **New dated entries go directly below the `## Completed` heading, not above it.** Verify placement with a quick grep after editing — a known, easy mistake with this file structure (has bitten this exact pattern in both sibling projects before).
- **Flag related bugs/gaps found while working on something else** — don't silently fix things outside the current scope, and don't silently ignore them either. Name them, then ask or note them for later.
- **No dead code left behind.** Clean up unused code/styles/variables when editing a file that has them nearby.
- **Any schema change (Supabase/Postgres) gets documented as a committed `.sql` file** — never a change made only through the Supabase dashboard and left undocumented. Re-download generated types after every schema change (`supabase gen types typescript`, or the Supabase Dashboard's Data API → types tab if CLI login isn't set up).
- **Any performance-related change or finding gets documented somewhere reusable** (a `PERFORMANCE.md`, once this project is far enough along to need one — not needed on day one) — real fixes, real regressions caught, real dead ends, with real before/after numbers when they exist. Same reasoning as the CRM: a future "this feels slow" session shouldn't have to re-diagnose from scratch.
- **Test real device behavior early for anything location/background-related**, not just simulator behavior — geofencing, background location, and push notification permissions all have real platform-specific quirks that a simulator won't surface honestly.
- **Every git commit gets a real description, not just a subject line** — a bare `git commit -m "Initial commit"` with nothing else doesn't capture the why, the same standard this project already holds `TODO.md` entries to. A commit message should say what changed and, more importantly, why — enough that a future `git log`/`git blame` doesn't need this file's own dated entries just to understand a change that's already supposedly explained in the commit itself.
