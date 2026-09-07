# Ethio Referral Linkage — MVP

A closed-loop referral exchange for Ethiopian health facilities. This implements the
core of the *Product & Engineering Blueprint*: the routing, handshake, tracking and
feedback layer **between** facilities.

**Status: working vertical slice + pilot feature build.** The referral lifecycle runs
end to end and 71 automated checks pass. Section "What is not built" below is honest
about the gaps.

---

## 0. Pilot feature build (demo-day release)

The `web/` app now runs **standalone in the browser** with a simulated backend that
enforces the same business rules as the NestJS API (state machine, BR-01/04/05/13/
22/23/26/51, SLA escalation, real bed reservations). With no `VITE_API_BASE` set it
seeds a realistic Ethiopian network — Tikur Anbessa (Black Lion), St. Paul's,
Zewditu, Yekatit 12, Ghandi Memorial, ALERT, St. Peter's, Amanuel, plus the West
Shewa chain (Ambo General → Guder/Ginchi PH → health centres → health posts) — and
deploys to Vercel as a static site. Point `VITE_API_BASE` at the API and the
simulation layer disappears; the request/response contract is identical.

New in this build:

- **Roles & facility-scoped RBAC** — `doctor` (with MoH license number), `liaison`,
  `it_admin`, `patient`. Each hospital's IT administrator registers and verifies its
  own staff; only verified, active accounts of a facility can send or receive in
  that facility's name (a "Black Lion referral" can only come from Black Lion staff).
- **Patient portal + public tracker** — patients track their referral like a parcel
  (`/track` with referral code + phone; or a portal account), read follow-up
  instructions, and **rate both hospitals** (1–5 stars + comment) after care.
- **Attachments** — image/PDF uploads (X-ray, MRI, ultrasound, lab reports) travel
  with the referral; the receiving doctor previews and downloads them.
- **Sender identity** — the receiving side sees the referring doctor's name, title,
  license number and direct phone, plus the sending facility's full address.
- **Real availability** — liaisons update beds/capabilities with name+time stamps;
  accepting with "reserve a bed" decrements an actual bed and lapses restore it.
- **Override-reason utilisation** — BR-13 override reasons are aggregated into a
  "Routing override intelligence" dashboard panel with concrete planning advice;
  patient ratings feed routing display and analytics.
- **Landing page + refreshed MoH-style UI.**

Documentation added under `docs/`:

| Document | Audience |
|---|---|
| `docs/USER_GUIDE.md` | Non-technical guide for every role (doctor, liaison, IT, patient, bureau) |
| `docs/AI_INTEGRATION.md` | AI integration blueprint: 7 use cases, gateway architecture, 8-stage implementation workflow, Ethiopia-specific governance |
| `docs/UI_DESIGN_PROMPT.md` | Ready-to-paste prompts for Stitch / Figma AI, per screen |

### Run the demo locally

```bash
cd web && npm install && npm run dev    # no database, no server needed
```

### Deploy to Vercel

```bash
cd web
npx vercel deploy --prod                # vercel.json already configures SPA rewrites
```

Demo sign-ins (password `Password123!` for all): `dr.kebede` (doctor, Ambo HC),
`liaison.ambo`, `liaison.blacklion`, `it.blacklion` (IT admin), `abeba.k`
(patient), `woreda.ws` (health office), and `dr.yonas` — a pending doctor to
demonstrate IT verification. Public patient tracking: code `ERL-K7PM-42`, phone
`0912000001`. Data resets per browser via `localStorage` (bump `SEED_VERSION`
in `web/src/demo/data.js` to force a reseed).

---

## 1. Quick start (full stack: NestJS + Postgres)

### Prerequisites
- **Node.js 20+** (built and tested on 22)
- **PostgreSQL 14+ with PostGIS**, either via Docker or installed locally

### Option A — Postgres in Docker (recommended)

```bash
docker compose up -d db          # Postgres + PostGIS on :5432, Adminer on :8080

cd server
cp .env.example .env
npm install
npm run migrate                  # applies db/migrations/*.sql
npm run seed                     # loads the pilot zone + users
npm run build
npm start                        # API on http://localhost:3000
```

In a second terminal:

```bash
cd web
npm install
npm run dev                      # UI on http://localhost:5173
```

Open <http://localhost:5173> and sign in as `hew.awaro` / `Password123!`.

### Option B — local Postgres

```bash
sudo -u postgres psql -c "CREATE USER erl WITH PASSWORD 'erl' SUPERUSER;"
sudo -u postgres createdb -O erl erl_dev
psql -U erl -d erl_dev -c "CREATE EXTENSION IF NOT EXISTS postgis;"
```

Then follow the `server` and `web` steps above.

> PostGIS is enabled if present but is **not required** — distance falls back to a
> haversine calculation in SQL, so the routing engine works either way.

### Run the test suite

With the API running:

```bash
cd server
npm run test:e2e
```

Expected: `71 passed, 0 failed`. It walks the whole lifecycle — offline creation,
capability-aware routing, SLA escalation, decline, reroute, redirect chains, arrival
confirmation, outcome return, loop closure, CBHI token verification, audit-chain
integrity and idempotent offline replay.

---

## 2. Demo accounts

All passwords are `Password123!`.

| Username | Role | Facility |
|---|---|---|
| `hew.awaro` | Health Extension Worker | Awaro Health Post (tier 1) |
| `hew.gosu` | Health Extension Worker | Gosu Kora Health Post |
| `clin.ambohc` | Clinician | Ambo Health Centre (tier 2) |
| `clin.guderhc` | Clinician | Guder Health Centre |
| `liaison.ambo` | Referral liaison | Ambo General Hospital (tier 4) |
| `liaison.guder` | Referral liaison | Guder Primary Hospital (tier 3) |
| `liaison.ginchi` | Referral liaison | Ginchi Primary Hospital (tier 3) |
| `triage.ambo` | Triage nurse | Ambo General Hospital |
| `admin.ambo` | Facility admin | Ambo General Hospital |
| `woreda.ws` | Woreda health office | West Shewa |
| `cbhi.ws` | CBHI claims officer | — |
| `sysadmin` | System administrator | — |

### The five-minute demo

1. Sign in as **`hew.awaro`** → **New referral**.
2. Register a patient (or search for one).
3. Reason: **Severe pre-eclampsia / eclampsia**. Urgency auto-sets to EMERGENCY,
   required capabilities and the stabilisation checklist appear automatically.
4. Enter vitals, tick the stabilisation items, **Find a facility**.
5. **This is the moment.** Guder Primary Hospital is nearer but appears under
   *Not available*, with the reason: *"No anaesthetist on site since Tuesday."*
   Ambo General is offered instead.
6. Send the referral. Sign out, sign in as **`liaison.ambo`** → Inbound → Accept,
   reserve a bed, name the receiving clinician.
7. Back as `hew.awaro`: mark departed. As `liaison.ambo`: confirm arrival, start
   care, submit the outcome.
8. As `hew.awaro`: **Acknowledge outcome — closes the loop.**
9. Sign in as **`woreda.ws`** → Dashboard. Loop-closure rate against the 60% target,
   decline-reason breakdown, referral flow.

Watch the API console: SMS messages are logged rather than sent.

---

## 3. What is implemented

### Business rules (blueprint §7), each enforced server-side and covered by a test

| Rule | Behaviour |
|---|---|
| BR-01 | Tier skips require a reason from a controlled list; emergencies exempt |
| BR-04 | Emergencies ignore the minimum-tier floor and route to nearest capable |
| BR-05 | Mandatory pre-referral vitals, or an explicit reasoned emergency override |
| BR-10–15 | Capability-aware routing with **visible exclusion reasons** |
| BR-12 | Composite score: distance, acceptance history, free beds, queue depth |
| BR-13 | Overriding the top suggestion requires a recorded reason |
| BR-20–21 | SLA per urgency (5 / 30 / 240 min) with automatic escalation |
| BR-22–23 | Declines require a controlled reason code; free text alone is rejected |
| BR-24 | A declined **emergency** immediately alerts origin and woreda |
| BR-25 | Redirect spawns a child node preserving the chain |
| BR-26 | Bed reservation with expiry, lapses automatically |
| BR-30–31 | Half-close on arrival, full close on acknowledged outcome |
| BR-32 | Not arrived within grace → follow-up task **at the origin** |
| BR-35 | Lost to follow-up counts **against** loop closure — the metric can't be gamed |
| BR-36 | Closed referrals immutable |
| BR-40–44 | Identity precedence; works fully without a national ID; Ge'ez names |
| BR-50–55 | Lawful basis per referral; every payload read audited |
| BR-51 | **Relationship-based** access: only parties to a referral see the chart |
| BR-60–64 | Signed CBHI validity token carrying no clinical content |
| BR-70–73 | Capability staleness, capacity decay, two-person rule flag |

### State machine

Twenty-one states harmonised with IHE 360X / HL7 BSeR, in
`server/src/referral/state-machine.ts`. Deliberately **pure** — no DB, no framework —
so every rule is unit-testable. Transitions are server-authoritative: a client may
*request* `accept`, only the server decides. The double-accept race is eliminated by
`SELECT … FOR UPDATE` plus optimistic versioning.

### Offline support

Client-generated UUID v7 primary keys make every write idempotent, so an offline
replay cannot create duplicates (tested). `client_created_at` and `synced_at` are
stored separately and `sync_lag_minutes` is reported on its own — **facilities are
never penalised for the network being down**, which matters because they will
otherwise stop using the system.

### Frontend

React 18 + Vite + Tailwind v4, 66 KB gzipped. Mobile-first with a bottom nav,
44 px minimum touch targets, high-contrast palette, Ethiopian calendar display
alongside Gregorian. Action buttons are driven by `allowedEvents` returned by the
server, so the UI can never offer an illegal transition.

---

## 4. What is NOT built

Being explicit so nothing is a surprise:

- **No offline storage in the browser.** The API and data model fully support offline
  creation, but the web client does not yet use SQLite/IndexedDB or a service worker.
  This is the single biggest remaining piece of engineering — see blueprint §12.4.
- **No Capacitor Android build.** The web app is a responsive SPA, not yet packaged.
- **No real SMS.** `Notifier.deliver` logs to console and writes to the `notification`
  table. Swap in Ethio Telecom plus a second aggregator (NFR-AVL-05 requires two).
- **No MFR / DHIS2 / eCHIS / Fayda adapters.** Facility data is seeded, not synced.
  The anti-corruption boundary exists; the adapters do not.
- **No attachments/object storage**, no ambulance dispatch, no USSD.
- **Field-level encryption is scaffolded, not real.** `patient.fayda_id_enc` currently
  stores raw bytes; wire this to a KMS/HSM before touching real patient data.
- **No Amharic UI translation.** Ge'ez *data* (names) is handled throughout; the
  interface strings are English only.

### Before any real patient data touches this

1. Replace `JWT_SECRET`, `TOKEN_SECRET`, `HASH_PEPPER`.
2. Implement real column encryption with keys held in-country.
3. Complete the DPIA, appoint a DPO, register with the supervisory authority.
4. Host inside Ethiopia — Proclamation 1321/2024 restricts cross-border transfer and
   binds controllers established in Ethiopia regardless of where processing happens.
5. Independent penetration test.

---

## 5. Layout

```
erl-mvp/
├── docker-compose.yml          Postgres + PostGIS + Adminer
├── .env.example
├── db/
│   ├── migrations/001_init.sql 21 tables, views, indexes
│   └── seed/seed.sql           Pilot zone: 10 facilities, 153 capabilities,
│                               14 reason codes, 12 users
├── server/                     NestJS + PostgreSQL
│   ├── scripts/
│   │   ├── migrate.js
│   │   ├── seed.js             --force to reload
│   │   └── e2e-test.js         71 checks
│   └── src/
│       ├── common/core.module.ts   Db, ConfigStore, hash-chained Audit,
│       │                           Notifier, ChangeLog
│       ├── auth/auth.module.ts     JWT, guard, roles, facility scoping
│       ├── routing/                Capability-aware scoring engine
│       ├── referral/
│       │   ├── state-machine.ts    Pure: states, transitions, vocabularies
│       │   ├── referral.service.ts All BR enforcement
│       │   ├── referral.module.ts  Lifecycle endpoints
│       │   └── scheduler.ts        SLA, reservation, grace, lost-to-follow-up
│       ├── modules.ts              Facility, Patient, Analytics, Sync, Audit
│       └── admin.controller.ts     Manual scheduler trigger
└── web/                        React + Vite + Tailwind v4
    └── src/
        ├── lib.js              API client, auth store, Ethiopian calendar
        ├── ui.jsx              Design primitives
        ├── NewReferral.jsx     Four-step wizard
        ├── Pages.jsx           List, detail, dashboard, capability admin
        └── App.jsx             Shell and routing
```

---

## 6. Notes for whoever extends this

**Never send notifications inside a database transaction.** The `notification` table
has a foreign key to `referral`; if you INSERT while holding that referral row locked
`FOR UPDATE`, the FK check blocks on the very transaction that is waiting for it, and
the request hangs forever with no error. This bug was hit during development and the
fix — dispatching after commit — is also correct on its own terms, since you don't
want to send an SMS for work that may roll back.

**Facility data is snapshotted onto the referral** (`origin_facility_name`,
`target_facility_tier`). This is deliberate: when MFR renames or reclassifies a
facility, historical referrals must still read correctly.

**`is_test_data` is on every operational table** and excluded from every metric.
Pilots generate test referrals; without this your headline number is unreportable.

**Add tests by business rule, not by endpoint.** Every rule in `e2e-test.js` names
the BR it covers, so a failure tells you which policy broke.
