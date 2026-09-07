# Project State — Ethio Referral Linkage

*The single source of truth for the team. Read this before writing code.*

Last updated: 2026-09-07 · Status: **pilot build, running end to end on a real database**

---

## 1. What this system is

A closed-loop referral exchange for Ethiopian public health facilities. A patient
referred from one facility to another is tracked from creation through acceptance,
arrival, treatment and the return of the outcome — the "loop" only closes when the
referring facility acknowledges the outcome. Scope is the Ethiopian FMOH three-tier
system (health post → health centre → primary/general/specialised hospital);
referral flow and rules differ by country, so nothing here is designed to be
country-generic.

**Baseline problem:** ~10% of paper referrals ever close the loop. Target: 60%.

---

## 2. Current state at a glance

| Area | State |
|---|---|
| Backend (NestJS + PostgreSQL) | **Working.** All business rules server-enforced. 119 automated checks pass. |
| Deployment | **Working.** API + web ship together to Vercel from `main`; the deployed site uses the real database (§9.2). |
| Database | **Real.** 2 migrations, seeded pilot network (19 facilities, 27 users, referral history, feedback). No hard-coded frontend data. |
| Frontend (React + Vite) | **Working**, talks to the API by default. A browser-simulation mode (`VITE_DEMO=1`) exists for static showcase deploys. |
| Auth & RBAC | JWT + role guard + facility scoping + IT-managed account verification. |
| Attachments | Working (images/PDF, stored in Postgres at pilot scale). |
| Patient portal | Working (account + public code/phone tracker). |
| Feedback | Working, IT-only visibility (see §6). |
| Offline client storage | **Not built** — the API supports it, the browser does not yet. |
| Real SMS / MFR / DHIS2 / Fayda | **Not built** — adapters are stubs. |
| Field-level encryption | **Scaffolded, not real.** Do not put real patient data in yet. |

---

## 3. Repository map

```
ethio-referral-linkage/
├── docker-compose.yml            Postgres 16 + PostGIS (port 5433) + Adminer
├── db/
│   ├── migrations/
│   │   ├── 001_init.sql          Core schema: 21 tables, views, indexes
│   │   ├── 002_roles_feedback_portal.sql
│   │   │                         doctor/it_admin/patient roles, licence +
│   │   │                         verification columns, referral_feedback,
│   │   │                         facility addresses, reserved ward, attachment blob
│   │   └── 003_referral_assignment.sql
│   │                             reception → clinician assignment (who, when, why)
│   └── seed/seed.sql             Pilot network + history + feedback (see §5)
├── server/                       NestJS API — the ONLY place business rules live
│   ├── scripts/
│   │   ├── migrate.js            Tracked migrations (safe to re-run)
│   │   ├── seed.js               `--force` truncates and reloads
│   │   ├── e2e-test.js           71 checks — core lifecycle & business rules
│   │   └── e2e-features.js       48 checks — roles, portal, feedback, RBAC
│   └── src/
│       ├── common/core.module.ts     Db, ConfigStore, hash-chained Audit,
│       │                             Notifier, ChangeLog  (@Global)
│       ├── auth/auth.module.ts       JWT, AuthGuard, @Roles, verification gate
│       ├── routing/routing.module.ts Capability-aware scoring + exclusions
│       ├── referral/
│       │   ├── state-machine.ts      PURE: 21 states, transitions, vocabularies
│       │   ├── referral.service.ts   All BR enforcement, hydrate, patientView
│       │   ├── referral.module.ts    Lifecycle endpoints
│       │   ├── attachments.controller.ts  Imaging/documents
│       │   └── scheduler.ts          SLA, reservation, grace, lost-to-follow-up
│       ├── users/users.module.ts     IT staff administration ← new
│       ├── feedback/feedback.module.ts Patient ratings ← new
│       ├── portal/portal.module.ts   Patient portal + public tracker ← new
│       ├── modules.ts                Facility, Patient, Analytics (+ScopedAnalytics), Sync, Audit
│       └── app.module.ts             Module wiring
└── web/                          React 18 + Vite + Tailwind v4
    └── src/
        ├── lib.js                API client, auth store, Ethiopian calendar
        ├── ui.jsx                Design primitives (Button, Card, Stars, FileUpload…)
        ├── App.jsx               Landing, login, shell, routes, role redirects
        ├── NewReferral.jsx       4-step referral wizard
        ├── Pages.jsx             List, detail, dashboards (3 variants), availability
        ├── PatientPortal.jsx     Patient portal + public tracker
        ├── ITAdmin.jsx           Staff registration & verification
        └── demo/                 Browser simulation for static showcase builds
```

**Rule for contributors:** business rules belong in `server/src`, never in `web/src`.
The frontend renders what the server permits (`allowedEvents`, `actorSide`, scope
fields). If a rule can be bypassed by editing the browser, it is not implemented.

---

## 4. Running it locally

Prerequisites: Node 20+, Docker (or a local PostgreSQL 14+).

```bash
# 1. database
docker compose up -d db            # Postgres+PostGIS on :5433, Adminer on :8080

# 2. API
cd server
cp .env.example .env               # PGPORT=5433 for the Docker DB
npm install
npm run migrate                    # applies db/migrations/*.sql, tracked
node scripts/seed.js --force       # loads the pilot network (TRUNCATES first)
npm run build && npm start         # http://localhost:3000

# 3. web app (second terminal)
cd web
npm install
npm run dev                        # http://localhost:5173, proxies /v1 to the API
```

**Tests** (API must be running):

```bash
cd server
node scripts/e2e-test.js       # 71 checks — lifecycle + business rules
node scripts/e2e-features.js   # 48 checks — roles, portal, feedback, RBAC
```

Both must stay green before merging. Add tests **by business rule**, not by
endpoint, so a failure names the policy that broke.

**Environment variables** (`server/.env`): `PGHOST/PGPORT/PGUSER/PGPASSWORD/PGDATABASE`,
`PORT`, `JWT_SECRET`, `TOKEN_SECRET`, `HASH_PEPPER`, `JWT_TTL`, `SEED_PASSWORD`,
`DISABLE_SCHEDULER`. The three secrets must be replaced before any deployment.

**Frontend modes:** default → real API (dev proxy, or `VITE_API_BASE` in production).
`VITE_DEMO=1` → self-contained browser simulation, used for the static Vercel
showcase; it mirrors the same rules but stores state in `localStorage`.

---

## 5. Seeded pilot data

19 facilities across two real contexts:

- **Addis Ababa apex** — Black Lion (Tikur Anbessa), St. Paul's, St. Peter's,
  Amanuel, Zewditu, Yekatit 12, Ghandi Memorial, Menelik II, Addis Ketema HC,
  Kazanchis HC.
- **West Shewa chain** — Ambo General → Guder / Ginchi Primary Hospitals →
  Ambo / Guder / Tulu Bolo health centres → Awaro / Gosu Kora / Dano health posts.

Facilities, tiers, addresses and switchboard numbers are real public information
(verify before pilot). **All people, patients, referrals and ratings are synthetic.**

Two deliberate routing scenarios are seeded: Guder Primary has *no anaesthetist*
(caesarean/anaesthesia unavailable with a visible note) and Zewditu's *CT scanner
is under maintenance* — both appear as explained exclusions, never silent absences.

Key accounts (password `Password123!` for all):

| Username | Role | Facility |
|---|---|---|
| `dr.abdi` | doctor | Ambo General Hospital |
| `dr.samuel` | doctor | Zewditu Memorial |
| `dr.tigist` | doctor | Black Lion |
| `dr.yonas` | doctor — **pending verification** | Black Lion |
| `liaison.ambo` / `liaison.blacklion` / `liaison.y12` | liaison | respective hospitals |
| `it.ambo` / `it.blacklion` / `it.stpauls` | it_admin | respective hospitals |
| `abeba.k` / `roba.d` | patient | — |
| `hew.awaro` | health extension worker | Awaro Health Post |
| `woreda.ws` | woreda health office | West Shewa |
| `sysadmin` | system administrator | — |

Public tracker demo: referral code `ERL-K7PM-42`, phone `0912000001`.

---

## 6. Roles and what each one may see  ⚠ read before touching any view

Two separate questions: **what a role may DO**, and **what a role may SEE**.
The second is the one that was tightened in this build.

### Reception first, then assignment  ⚠ read before touching inbound access

An inbound referral belongs to the receiving hospital's **reception desk** (the
referral liaison), not to its doctors. Reception reviews the case and assigns it
to the clinician who can actually treat it — most referrals need a particular
specialty, so an arbitrary doctor picking a case up is unsafe and leaves nobody
accountable.

```
  referral arrives ─► RECEPTION (liaison/triage/facility_admin)
                        │  sees the whole inbound queue
                        │  "awaiting assignment" until it acts
                        ▼
                      assigns a named clinician  ──► that clinician, and only
                        │  (recorded: who, when, why)    that clinician, can
                        ▼                                open the chart, the
                      clinician accepts / declines,      imaging, and act on it
                      treats, returns the outcome
```

Enforced server-side in `ReferralService.assertMayReadAtTarget` and applied to
reads (`get`), the inbound list, every state transition, and attachment
downloads. A clinician who opens an unassigned case gets a 403 carrying
`awaitingAssignment`, which the UI renders as an explanation rather than an
error. Reassignment is allowed while the referral is open and is recorded in
the transition trail (`assign` / `reassign`).

Standby signals: reception's dashboard leads with `awaitingAssignment`
("nobody responsible yet"); a clinician's dashboard leads with
`assignedToMe.needsResponse`.

### Actions

| Role | Can do |
|---|---|
| `doctor`, `clinician`, `specialist`, `hew` | Create referrals from their own facility; depart; acknowledge outcomes; upload attachments. **Inbound: only cases assigned to them.** |
| `liaison`, `triage` | **Referral reception**: see the whole inbound queue and assign a clinician to each case. Acknowledge / accept / decline / redirect; confirm arrival; submit outcomes; update beds & capabilities |
| `facility_admin` | Facility settings, capability matrix |
| `it_admin` | Register, verify, deactivate staff of **their own facility**; read that facility's analytics and feedback |
| `patient` | View own referrals; rate the two facilities after being received |
| `woreda`, `region`, `moh` | Oversight: network flow metrics, no clinical chart |
| `cbhi` | Verify referral validity tokens (no clinical content) |
| `sysadmin` | Everything, plus scheduler triggers and audit-chain verification |

### Visibility — the deliberate narrowing

Until dedicated quality/medical-director roles exist, detailed analytics and
**all patient feedback are IT-administration-only, and only for their own hospital**.

| Viewer | Analytics scope (`GET /v1/analytics/overview`) | Patient feedback |
|---|---|---|
| doctor / clinician / hew | `my_referrals` — **only referrals they personally ordered** | ❌ never |
| liaison / triage / facility_admin | `facility_operations` — own facility's live queue & beds | ❌ never |
| **it_admin** | `it_facility_detail` — full metrics for **their own facility only** | ✅ own facility only |
| woreda / region / moh / sysadmin | `network_flow` — flow, timing, decline reasons | ❌ not in this view |
| patient | — | ✅ their own ratings only |

`GET /v1/feedback/my-facility` is the only feedback read endpoint. It is guarded to
`it_admin`/`sysadmin` and always filters by the caller's own `facility_id`. Each row
carries the linkage that makes it actionable: **referral code, the doctor who ordered
the referral (name + MoH licence), and the from → to hospital pair.**

Other visibility rules already enforced:

- **BR-51 relationship access** — only the origin and target facilities of a
  referral can read its clinical payload; every read is audited.
- **Clinicians never see hospital ratings** — routing suggestions show capability,
  distance, beds, acceptance history and queue depth only.
- **Oversight roles see flow, not charts** — diagnosis, vitals and outcome are
  stripped for `woreda`/`region`/`moh`/`cbhi`, and for `it_admin` too (they
  administer, they do not read patient charts).
- **Patients get a purpose-built projection** (`patientView`) — status, both
  facilities' contact details, receiving clinician, follow-up instructions.
  Never vitals, diagnosis or internal notes.

### Account trust model

An account can act in a hospital's name only if **that hospital's own IT
administrator** created it *and* verified it. Accounts start `pending` and cannot
log in (403 at login, not a silent failure). Clinical roles require the MoH
professional licence number at registration. IT administrators can only manage
accounts whose `facility_id` equals their own. Every action is in the audit log.

---

## 7. Business rules (all server-enforced, all tested)

| Rule | Behaviour |
|---|---|
| BR-01 | Tier skips need a reason from a controlled list; emergencies exempt |
| BR-04 | Emergencies ignore the minimum-tier floor, route to nearest capable |
| BR-05 | Mandatory pre-referral vitals, or an explicit reasoned emergency override |
| BR-10–15 | Capability-aware routing with **visible exclusion reasons** |
| BR-12 | Composite score: distance, acceptance history, free beds, queue depth |
| BR-13 | Overriding the top suggestion requires a recorded reason → feeds the override-intelligence panel |
| BR-20–21 | SLA per urgency (5 / 30 / 240 min) with automatic escalation |
| BR-22–23 | Declines require a controlled reason code |
| BR-24 | A declined **emergency** immediately alerts origin and woreda |
| BR-25 | Redirect spawns a child node preserving the chain |
| BR-26 | Bed reservation is **real**: it decrements the ward's free beds, expires, and is released on lapse/cancel/reroute |
| BR-30–31 | Half-close on arrival, full close on acknowledged outcome |
| BR-32 | Not arrived within grace → follow-up task at the origin |
| BR-35 | Lost to follow-up counts **against** loop closure |
| BR-36 | Closed referrals immutable |
| BR-40–44 | Identity precedence; works without a national ID; Ge'ez names |
| BR-50–55 | Lawful basis per referral; every payload read audited |
| BR-60–64 | Signed CBHI validity token carrying no clinical content |
| BR-70–73 | Capability staleness, capacity decay, two-person rule flag |

---

## 8. API surface (v1)

```
POST   /v1/auth/login                     (public)
GET    /v1/auth/me

POST   /v1/routing/suggest                capability-aware candidates + exclusions
GET    /v1/facilities  /v1/facilities/:id
PUT    /v1/facilities/:id/capabilities/:code
POST   /v1/facilities/:id/capacity        bed board update
GET    /v1/capabilities  /v1/reason-codes

POST   /v1/patients  /v1/patients/search
GET    /v1/referrals  POST /v1/referrals
GET    /v1/referrals/:id  /v1/referrals/:id/chain  /v1/referrals/code/:code
GET    /v1/referrals/:id/assignable-clinicians   reception only
POST   /v1/referrals/:id/assign                  reception assigns a clinician
POST   /v1/referrals/:id/{acknowledge|accept|decline|redirect|reroute|depart|
                           arrive|start-care|outcome|acknowledge-outcome|cancel|…}
POST   /v1/referrals/:id/attachments      upload imaging/document
GET    /v1/referrals/:id/attachments/:aid fetch content (audited)

GET    /v1/users                          it_admin (own facility) / sysadmin
POST   /v1/users                          register (pending)
POST   /v1/users/:id/{verify|deactivate|reactivate}

POST   /v1/feedback                       patient only
GET    /v1/feedback/my-facility           it_admin only, own facility

GET    /v1/portal/me                      patient account
POST   /v1/portal/lookup                  (public) referral code + phone

GET    /v1/analytics/overview             role-scoped (see §6)
GET    /v1/analytics/facility/:id         oversight, or own-facility IT/admin
POST   /v1/sync/pull                      offline change-log pull
GET    /v1/audit/verify-chain  /v1/audit/referral/:id
POST   /v1/tokens/verify                  CBHI validity token
POST   /v1/admin/run-schedulers           sysadmin — run the clocks on demand
```

---

## 9. Deployment

### 9.1 Local / pilot

Docker Postgres + `npm start` on both server and web, or build `web/` and serve
`dist/` behind the API. For real patient data, host **inside Ethiopia** —
Proclamation 1321/2024 restricts cross-border transfer (see §10).

### 9.2 Vercel — the full stack in one project

The deployed site runs the **real API against a real database**, not the browser
showcase. Both halves ship from this repository, connected to GitHub
(`AbelTez/PRS`); pushing to `main` deploys.

```
      ┌──────────────── one Vercel project, one domain ────────────────┐
      │                                                                │
      │  /                     → web/dist  (static React build)        │
      │  /dashboard, /portal…  → rewritten to /index.html (SPA)        │
      │  /api/health           → api/health.js   (no Nest, no DB)      │
      │  /api/v1/**            → api/index.js → server/serverless.js   │
      │                              └── boots the SAME AppModule      │
      └───────────────────────────────┬────────────────────────────────┘
                                      │ DATABASE_URL (TLS)
                                      ▼
                            Neon serverless Postgres
```

Key files: `vercel.json` (build, function config, rewrites), root
`package.json` (build scripts), `api/index.js` (mount point),
`server/serverless.js` (bootstrap).

**Things worth knowing before you change any of it:**

- **The API is mounted at `/api`, not `/v1`.** The client is built with
  `VITE_API_BASE=/api`, so the browser calls `/api/v1/...`. `vercel.json`
  rewrites `/api/(.*)` to the function and carries the real path in
  `__erl_path`; `server/serverless.js` reconstructs Nest's route from it. A
  catch-all `api/[...path].js` filename *builds* but is never routed by this
  project type — that was verified against a live deployment, so do not
  "simplify" it back.
- **Compiled output, not sources.** The function requires `server/dist`,
  because NestJS DI needs `emitDecoratorMetadata`, which the platform's
  esbuild-based TypeScript handling does not emit.
- **The handler lives in `server/`,** not `api/`, so `require`s resolve against
  `server/node_modules`.
- **No cron.** Serverless has no process between requests, so
  `SchedulerTickInterceptor` runs the referral clocks on traffic (self
  throttling, ~30 s). `ScheduleModule` is only registered off-serverless.
- **Body limit is raised to 4 MB** in both entry points; the stock 100 kB JSON
  limit would reject real X-ray/PDF attachments.
- **Pool size is 1 per instance** on serverless — point `DATABASE_URL` at the
  provider's *pooled* endpoint.

**Environment variables** (Vercel → Settings → Environment Variables):

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | Managed Postgres connection string (Neon adds this automatically) |
| `JWT_SECRET`, `TOKEN_SECRET`, `HASH_PEPPER` | Secrets — never reuse the development values |
| `PGSSL_NO_VERIFY` | Optional; `true` only if the provider's certificate chain fails |

**First-time database setup** (run locally, pointed at the production database):

```bash
export DATABASE_URL='postgresql://…?sslmode=require'
export HASH_PEPPER='<the same value set in Vercel>'
npm run migrate
node server/scripts/seed.js --force      # TRUNCATES — pilot data only
```

`HASH_PEPPER` must match the deployment: the seed binds patient phone hashes to
it so phone lookups work.

**Health check:** `GET /api/health` answers without booting Nest or touching the
database, and reports whether the database and secrets are configured — check it
first when a deployment misbehaves.

### 9.3 Static showcase (no backend)

Building `web/` with `VITE_DEMO=1` produces a self-contained bundle backed by
the in-browser simulation in `web/src/demo/`. Useful for demonstrating without
infrastructure; it is synthetic data and no real records.

**Never deploy the real API to a foreign cloud** with real patient data without
completing §10.

---

## 10. Before real patient data touches this

1. Replace `JWT_SECRET`, `TOKEN_SECRET`, `HASH_PEPPER`.
2. Implement real column encryption with keys held in-country
   (`patient.fayda_id_enc` currently stores raw bytes).
3. Move attachment blobs out of Postgres into object storage (keep `object_key` +
   `sha256` in `referral_attachment`; the API shape does not change).
4. Complete the DPIA, appoint a DPO, register with the supervisory authority.
5. Host inside Ethiopia.
6. Independent penetration test.

---

## 11. Roadmap / good first tasks

| Priority | Task |
|---|---|
| High | Offline browser storage (IndexedDB + service worker) — the API and data model already support it |
| High | Object storage for attachments (see §10.3) |
| High | Real SMS via Ethio Telecom + a second aggregator (NFR-AVL-05 requires two) |
| Medium | Dedicated quality/medical-director role so feedback visibility can widen beyond IT (see §6) |
| Medium | Amharic UI translation (data already handles Ge'ez; interface strings are English) |
| Medium | MFR / DHIS2 / eCHIS / Fayda adapters — the anti-corruption boundary exists, adapters do not |
| Medium | Capacitor Android packaging |
| Later | AI layer — see `docs/AI_INTEGRATION.md` for the seven use cases and workflow |

---

## 12. Notes for whoever extends this

**Never send notifications inside a database transaction.** The `notification`
table has a foreign key to `referral`; inserting while holding that row
`FOR UPDATE` blocks on the very transaction waiting for it and the request hangs
forever with no error. Dispatch after commit — as the code does.

**Facility data is snapshotted onto the referral** (`origin_facility_name`,
`target_facility_tier`). Deliberate: when MFR renames or reclassifies a facility,
historical referrals must still read correctly.

**`is_test_data` is on every operational table** and excluded from every metric.
Pilots generate test referrals; without this the headline number is unreportable.

**The state machine is pure** (`referral/state-machine.ts` — no DB, no framework).
Keep it that way; it is the one file where every transition can be reasoned about.

**Capacity is append-only.** `facility_capacity` keeps history; "current" is the
latest row per `(facility_id, ward_type)`. Reservations insert a new row rather
than mutating — that is why the bed board has an audit trail for free.

---

## 13. Other documents

| Document | Purpose |
|---|---|
| `README.md` | Quick start and feature summary |
| `docs/USER_GUIDE.md` | Non-technical guide per role — give this to pilot users |
| `docs/AI_INTEGRATION.md` | AI use cases, gateway architecture, implementation workflow |
| `docs/UI_DESIGN_PROMPT.md` | Stitch / Figma AI prompts per screen |
| `doc_roadmap/Ethio_Referral_Linkage_Production_Roadmap.md` | Longer-term production roadmap |
| `Ethio_Referral_Linkage_MVP_Blueprint.md` (repo root) | The original product & engineering blueprint |
