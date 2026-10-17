# CollabSphere — Cross-House & Regional Meetup Engine

A full-stack meetup platform for the **IIT Madras BS** student community. Students discover
nearby peers, propose regional meetups and co-working sessions, collaborate across houses and
societies, and earn **verified** participation points when an organiser scans their QR pass.

Built with **React + Vite + TypeScript + Tailwind CSS**, **Supabase** (PostgreSQL + Auth +
Row Level Security), **Leaflet + OpenStreetMap**, and `qrcode.react` / `html5-qrcode`.

---

## Contents

- [Design system](#design-system)
- [Pages](#pages)
- [Quick start](#quick-start)
- [Supabase setup](#supabase-setup)
- [Local demo mode](#local-demo-mode)
- [Architecture](#architecture)
- [Security model](#security-model)
- [Testing & checks](#testing--checks)
- [Deployment](#deployment)
- [Known limitations](#known-limitations)

---

## Design system

The visual language is reproduced from the supplied reference poster
(`desgin 1.jpg`): a bright sky-blue field, oversized white grotesque display type, an
orange accent, tiny bold uppercase caption strips, hairline rules and a poster-numeral motif.

| Token | Value |
| --- | --- |
| Sky field | `#5CB8E6 → #9FD9F2` gradient (`.sky-band`) |
| Primary blue | `#0B5CD5` (`brand`) |
| Ink | `#0B2545` (`ink`) |
| Accent orange | `#E8551E` (`flame`) |
| Paper | `#F6F8FA` |
| Type | Inter (400–900), display weights 800–900, tight `-0.045em` tracking |
| Radii | `12px` cards (`rounded-xl`), `8px` controls |
| Shadows | `shadow-card` (rest) / `shadow-lift` (hover) |

Shared primitives live in `src/components/ui.tsx` and the `@layer components` block of
`src/index.css` (`.btn-*`, `.card`, `.field`, `.pill`, `.chip`, `.label-xs`, `.display-*`).
The hero illustration in `src/components/HeroArt.tsx` is an inline SVG that echoes the
reference's flat pixel cityscape, utility pole, orange sign band and route pins.

---

## Pages

| Route | Purpose |
| --- | --- |
| `/` | Landing — hero, how it works, featured events, CTA |
| `/explore` | Search + filters (city, date, format, house/society), cards, Leaflet map |
| `/events/:id` | Event detail, registration/cancellation, QR pass, organiser tools |
| `/create` | Event proposal form with cross-house collaboration invites |
| `/dashboard` | Registrations, recommendations, points, badges, quick actions |
| `/checkin`, `/events/:id/checkin` | Organiser QR console, manual token entry, attendee manifest |
| `/admin` | Proposals, co-host requests, disputes, event status (admins only) |
| `/leaderboard` | Individual + house rankings |
| `/profile` | Editable profile, points ledger, attendance history, achievements |
| `/login`, `/register` | Authentication |

---

## Quick start

```bash
npm install
npm run dev          # http://localhost:5173
```

Without any environment variables the app boots in **Local demo mode** (see below) so you can
walk the full lifecycle immediately.

### Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Vite dev server |
| `npm run build` | Type-check + production build to `dist/` |
| `npm run preview` | Serve the production build locally |
| `npm run lint` | ESLint (flat config, typescript-eslint) |
| `npm run typecheck` | `tsc -b --noEmit` |
| `npm test` | Vitest — lifecycle/permission/check-in test suite |

---

## Supabase setup

1. Create a project at [supabase.com](https://supabase.com).
2. Open **SQL Editor** and run the whole of
   [`supabase/schema.sql`](supabase/schema.sql). It creates:
   - tables: `profiles`, `events`, `registrations`, `points_entries`,
     `collab_requests`, `attendance_disputes` + the `event_seats` aggregate view
     (correct attendee counts for logged-out visitors)
   - triggers that force `points`/`role` to be server-managed, force new events to
     `pending`, block unauthorised status changes, and re-check capacity when a
     cancelled registration is reactivated
   - security-definer functions that are the only write paths for points and state
     transitions: `verify_checkin`, `respond_collab`, `resolve_dispute`, `host_bonus`
     (all ledger-based, idempotent, and unreachable by `anon`)
   - Row Level Security policies for every table, plus column-level grants that
     keep `profiles.email` and the points ledger out of client reach
3. Copy `.env.example` to `.env` and fill in:

   ```bash
   VITE_SUPABASE_URL=https://<project-ref>.supabase.co
   VITE_SUPABASE_ANON_KEY=<anon key>
   ```

4. Restart the dev server. The UI switches from **Local demo mode** to **Supabase
   connected** (the orange demo badge disappears).

### Creating an admin

Sign up through the UI (the trigger creates a `student` profile), then in the SQL editor
(the `DO` block sets the trusted flag the profile guard requires):

```sql
do $$
begin
  perform set_config('app.trusted', '1', true);
  update public.profiles set role = 'admin' where email = 'you@example.com';
end $$;
```

Role changes are deliberately impossible from the client.

---

## Local demo mode

When `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` are absent the app uses
`src/lib/demo/server.ts`, backed by `localStorage`.

**This is a labelled demo only.** It is **not** authenticated, **not** authorised, and
**not** securely persisted — everything lives in your browser. The badge in the navbar and
sidebar says so, and the sign-in page repeats it.

Demo accounts (click the buttons on `/login`):

| Role | Email | Password |
| --- | --- | --- |
| Admin | `admin@collabsphere.in` | `admin123` |
| Organizer | `organizer@collabsphere.in` | `organizer123` |
| Student | `student@collabsphere.in` | `student123` |

Use **Register** → *Demo role* to create your own student / organizer / admin account.
Reset the demo data from the browser console with:

```js
localStorage.removeItem('collabsphere.demo.v3'); location.reload()
```

---

## Architecture

```
src/
  components/     Shell (navbar+sidebar), EventCard, EventMap, Qr, ui kit, icons, HeroArt
  lib/
    api.ts        Single data-access surface; picks demo or Supabase implementation
    types.ts      Domain model + shared option lists
    config.ts     Env detection, DEMO_MODE flag
    auth.tsx      Auth context (session, sign-in/up/out, refresh)
    toast.tsx     Toast notifications
    format.ts     Date/time helpers, badge definitions
    demo/         localStorage store + "server" with the same validation rules
    supabase/     supabase-js client + table/RPC implementation of the same API
  pages/          One file per route
  test/           Headless shims for the Vitest suite
supabase/schema.sql   Tables, triggers, RLS, verify_checkin()
```

`src/lib/api.ts` is the only module the UI imports for data. Both backends implement the
same function signatures, so switching is a matter of setting two env vars.

---

## Security model

The requirement is that the client is never trusted with points, roles or attendance.

| Concern | Enforcement |
| --- | --- |
| Points | `points_entries` has **no client insert policy**. Only `verify_checkin()` writes it. A trigger on `profiles` rejects any update that changes `points` unless the caller is an admin. |
| Roles | `profiles_insert_guard` forces `role = 'student'`; `guard_profile_mutation` blocks role changes unless `is_admin()`. |
| Event approval | `guard_event_mutation` raises if anyone but an admin sets `status` to `approved`/`rejected`. New events are forced to `pending`. |
| Duplicate registration | `unique (event_id, user_id)` on `registrations`; capacity checked inside the insert trigger. |
| Duplicate check-in | `verify_checkin` locks the row `FOR UPDATE` and returns `already: true` on a second scan; the partial unique index plus `unique (event_id, user_id)` on the points ledger make double-awarding impossible. |
| Unauthorised scanning | `verify_checkin` requires the caller to be the host, a co-host, or an admin. |
| Privacy | Map pins are event venues at city/region granularity. No live location is collected. Profile emails are only shown to the account owner in the UI. |

> **Caveat in demo mode:** the same rules are applied in `src/lib/demo/server.ts` so the UX
> matches, but a determined user could edit `localStorage`. Treat demo mode as a prototype,
> not a security boundary.

---

## Testing & checks

```bash
npm run lint        # 0 errors, 0 warnings
npm run typecheck   # clean
npm test            # 20 tests, all passing
npm run build       # production bundle
```

The suite in `src/lib/__tests__/lifecycle.test.ts` covers the end-to-end workflow:

- propose → pending → admin-only approval / rejection with a reason
- server-side form validation (title, description, times, capacity)
- duplicate registration blocked; capacity enforced; cancellation frees the seat
- registration refused for unpublished events
- check-in rejected for unauthorised scanners and unknown tokens
- points awarded **exactly once**; second scan reports `duplicate`
- cancelled registrations cannot be checked in
- students blocked from admin surfaces and from changing event status
- leaderboard ordering; dispute resolution grants points once
- cross-house collaboration requests and permission to respond

---

## Deployment

The client is a static SPA.

### Vercel / Netlify

```bash
npm run build      # outputs dist/
```

- **Build command:** `npm run build`
- **Output directory:** `dist`
- Add the two `VITE_SUPABASE_*` variables in the project settings.
- SPA fallback: both platforms detect `react-router`; if needed add a rewrite of
  `/* → /index.html`.

### Supabase side

No extra services are required — everything runs inside Postgres. Enable **Email
confirmations** in Auth settings for production, and keep the anon key public (RLS is the
boundary).

### Self-hosting

`npm run preview` serves the production build. Put any static file server (nginx, Caddy)
in front of `dist/` with SPA fallback.

---

## Known limitations

- **Demo-mode security.** As stated, demo mode is not a security boundary. All enforcement
  is real only when Supabase is configured.
- **Live-database verification pending.** The Supabase implementation mirrors the tested
  demo semantics and the schema is covered by static security tests
  (`schema.security.test.ts`), but the SQL has not yet been executed against a real
  project — run `supabase/schema.sql` in a fresh project before relying on it.
- **Email notifications.** There is no outbound email/SMS for approvals or cancellations.
- **Exact venue privacy.** The map plots the city centroid, so a venue like “The Hive,
  Besant Nagar” is not placed precisely; organisers put the exact address in the
  description.
- **iOS camera access.** `html5-qrcode` needs HTTPS (or `localhost`) for the camera; the
  manual-token fallback exists for devices where it is unavailable.
- **Seed data.** The 12 events, 8 profiles and their points are clearly labelled demo
  content so the calendar is not empty on first run — they are not real student records.
