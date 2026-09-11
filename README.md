# Attendance App

Internal mobile app for staff attendance (check-in/out with proximity-based auto-checkout, half-day, late/early flagging), leave/time-off requests with admin approval, task assignment with deadlines, and KPI tracking derived from task completion. Built for the same business as the sibling `../crm` project.

Status: auth, check-in/out (with half-day, location, late/early flags), attendance history (paginated, day-grouped, tap-through detail views), weekly schedule, tasks (assign/edit/delete, filterable), leave requests (with balance, filterable), locations management, profile pictures, employee profile editing, staff search, and an admin dashboard are all built. Phase 1 (everything above) was verified against a real Supabase project as of 2026-09-05; a large pass of UI/UX/editing/filtering work landed 2026-09-10 and has **not yet been verified live** — see `TODO.md`'s Quick Status. Geofencing auto-checkout (Phase 2) is code-complete but **not yet verified on a real device** either — see below and `TODO.md`. KPI and notifications are not built yet. A separate sibling project, `../attendance-download`, hosts the Android/iOS install page (see `ARCHITECTURE.md`'s Distribution section).

## Docs

- **`CLAUDE.md`** — product spec: tech stack, core features, open questions.
- **`ARCHITECTURE.md`** — technical architecture: Feature-First Modular structure, adapted from `../tskr-mobile`.
- **`RULES.md`** — collaboration style and working habits.
- **`AGENTS.md`** — coding standards.
- **`TODO.md`** — live status; read this first in any new session.

## Setup

```
npm install
cp .env.example .env.local   # then fill in EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY
npx expo start
```

Without real Supabase credentials, the app runs but shows a "Supabase isn't configured yet" state on any screen that touches data. Schema lives in `supabase/*.sql`, numbered in the order they need to be applied — apply them all, in order, to a fresh Supabase project (this app uses its own, separate from `../crm`'s).

`npx expo start` (plain Expo Go) covers everything **except background geofencing auto-checkout** — that needs `expo-dev-client`, already installed, so build a dev client first:

```
npx expo run:ios      # or: npx expo run:android
# or, without a local Xcode/Android Studio setup:
eas build --profile development --platform ios   # or android
```

Then run `npx expo start --dev-client` and open the app from the installed dev-client build, not Expo Go. See `TODO.md`'s Phase 2 entry for the actual test procedure once you're on a real device — geofencing cannot be verified in a simulator either, it needs genuine location changes.

**Local Android build gotcha (macOS + Android Studio)**: if `npx expo run:android` fails at a `configureCMakeDebug` step with `WARNING: A restricted method in java.lang.System has been called`, Android Studio's bundled JDK is too new (JDK 24+, this project needs JDK 17) — install one (`brew install openjdk@17`) and pin Gradle to it directly in `android/gradle.properties`: `org.gradle.java.home=/opt/homebrew/opt/openjdk@17`, then `cd android && ./gradlew --stop` before retrying (a running Gradle daemon won't pick up the new JDK otherwise). If the failure instead mentions `[CXX5304]` / "SDK XML versions", your Android SDK is missing `cmdline-tools` — install it via Android Studio → Settings → Languages & Frameworks → Android SDK → SDK Tools tab → "Android SDK Command-line Tools (latest)".
