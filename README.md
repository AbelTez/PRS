# Ethio Referral Linkage — MVP

A closed-loop referral exchange for Ethiopian health facilities. This implements the
core of the *Product & Engineering Blueprint*: the routing, handshake, tracking and
feedback layer **between** facilities.

**Status: working vertical slice + pilot feature build.** The referral lifecycle runs
end to end and 71 automated checks pass. Section "What is not built" below is honest
about the gaps.

---

## 0. Pilot feature build

**→ Team onboarding: read [`docs/PROJECT_STATE.md`](docs/PROJECT_STATE.md) first.**
It is the source of truth for architecture, the RBAC/visibility matrix, how to run
everything, and the roadmap.

Everything below runs against a **real PostgreSQL database** with seeded pilot data
(19 facilities, 27 accounts, referral history, patient feedback). Nothing is
hard-coded in the frontend.

New in this build:

- **Roles & facility-scoped RBAC** — `doctor` (with MoH licence number), `liaison`,
  `it_admin`, `patient`. Each hospital's IT administrator registers and verifies its
  own staff; accounts start `pending` and cannot sign in until verified, so a
  "Black Lion referral" can only come from verified Black Lion staff.
- **Scoped visibility** — doctors see only referrals they ordered; liaisons see
  their own facility's queue; **detailed analytics and all patient feedback are
  IT-administration-only and own-facility-only**, with each rating linked to the
  referral, the ordering doctor (name + licence) and the from → to hospital pair.
- **Patient portal + public tracker** — patients track their referral like a parcel
  (`/track` with referral code + phone, or a portal account), read follow-up
  instructions, and **rate both hospitals** after care.
- **Attachments** — image/PDF uploads (X-ray, MRI, ultrasound, lab reports) travel
  with the referral; every download is audited and restricted to the two facilities
  party to the referral.
- **Sender identity** — the receiving side sees the referring doctor's name, title,
  licence number and direct phone, plus the sending facility's full address.
- **Real bed reservations** — accepting with "reserve a bed" decrements an actual
  bed on the ward board; lapse, cancel and reroute release it.
- **Override-reason utilisation** — BR-13 override reasons feed a "Routing override
  intelligence" panel with concrete planning advice.
- **Landing page + MoH-style UI refresh.**

Documentation under `docs/`:

| Document | Audience |
|---|---|
| `docs/PROJECT_STATE.md` | **Engineers — start here.** Architecture, RBAC matrix, how to run, roadmap |
| `docs/USER_GUIDE.md` | Non-technical guide for every role (doctor, liaison, IT, patient, bureau) |
| `docs/AI_INTEGRATION.md` | AI integration blueprint: 7 use cases, gateway architecture, 8-stage workflow |
| `docs/UI_DESIGN_PROMPT.md` | Ready-to-paste prompts for Stitch / Figma AI, per screen |

### Tests

With the API running:

```bash
cd server
node scripts/e2e-test.js       # 71 checks — lifecycle and business rules
node scripts/e2e-features.js   # 48 checks — roles, portal, feedback, RBAC
```

### Static showcase build (optional)

`VITE_DEMO=1 npm run build` in `web/` produces a self-contained browser build with
synthetic data — used for demonstrations without a server (Vercel-ready via
`vercel.json`). The default build talks to the real API.

---

## 1. Quick start (full stack: NestJS + Postgres)

### Prerequisites
- **Node.js 20+** (built and tested on 22)
- **PostgreSQL 14+ with PostGIS**, either via Docker or installed locally

### Option A — Postgres in Docker (recommended)

```bash
docker compose up -d db          # Postgres + PostGIS on :5433, Adminer on :8080

cd server
cp .env.example .env             # PGPORT=5433 for the Docker database
npm install
npm run migrate                  # applies db/migrations/*.sql (tracked, re-runnable)
node scripts/seed.js --force     # loads the pilot network (TRUNCATES first)
npm run build
npm start                        # API on http://localhost:3000
```

In a second terminal:

```bash
cd web
npm install
npm run dev                      # UI on http://localhost:5173
```

Open <http://localhost:5173> and sign in as `dr.abdi` / `Password123!`
(or any account in §2 — the login page lists them).

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
npm run test:e2e               # 71 checks — lifecycle and business rules
node scripts/e2e-features.js   # 48 checks — roles, portal, feedback, RBAC
```

Expected: `71 passed, 0 failed` and `48 passed, 0 failed`. Together they walk the
whole lifecycle — offline creation, capability-aware routing, SLA escalation,
decline, reroute, redirect chains, arrival confirmation, outcome return, loop
closure, CBHI tokens, audit-chain integrity, idempotent replay — plus account
verification, attachments, real bed reservations, the patient portal, and every
feedback/analytics visibility rule.

---

## 2. Demo accounts

All passwords are `Password123!`. Full list and the visibility matrix:
[`docs/PROJECT_STATE.md`](docs/PROJECT_STATE.md) §5–6.

| Username | Role | Facility |
|---|---|---|
| `dr.abdi` | Doctor (Medical Director) | Ambo General Hospital (tier 4) |
| `dr.samuel` | Doctor (Internist) | Zewditu Memorial |
| `dr.tigist` | Doctor (OB/GYN) | Black Lion |
| `dr.yonas` | Doctor — **pending verification** | Black Lion |
| `it.blacklion` / `it.ambo` / `it.stpauls` | Hospital IT administrator | respective hospitals |
| `abeba.k` / `roba.d` | Patient (portal) | — |
| `hew.awaro` | Health Extension Worker | Awaro Health Post (tier 1) |
| `hew.gosu` | Health Extension Worker | Gosu Kora Health Post |
| `clin.ambohc` | Clinician | Ambo Health Centre (tier 2) |
| `clin.guderhc` | Clinician | Guder Health Centre |
| `liaison.ambo` | Referral liaison | Ambo General Hospital (tier 4) |
| `liaison.blacklion` / `liaison.stpauls` / `liaison.zewditu` / `liaison.y12` | Referral liaison | Addis hospitals |
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
