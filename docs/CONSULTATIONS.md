# Doctor-to-doctor consultations

## Updated scope

Consultations are the second workspace alongside referrals. Two verified doctors can discuss any topic: professional collaboration, learning, a second opinion, or a patient case. A patient and referral are optional. The requesting doctor selects a named colleague by name, department or facility. The invited doctor accepts or declines. Accepted conversations support persistent messages, JPEG/PNG/PDF documents, optional opinions/discussion summaries, and live video or audio. The requester can acknowledge/close the conversation. Closed discussions remain readable.

An incoming-call banner appears throughout the signed-in clinical workspace while the application is open. Calls require an explicit Join action and browser microphone/camera permission. Controls include mute, camera on/off and leave. There is no media recording. General conversations do not require an opinion before closing. Patient-related conversations can prefill the existing referral wizard after the requesting doctor reviews the shared summary. Referral validations and reception assignment remain authoritative.

## Architecture and authorization

- React screens live in `src/consultations`; Nest endpoints are under `/api/v1/consultations`.
- Migration `004_consultations.sql` adds conversations, messages, documents, activity, calls, temporary signals, and created-referral links.
- Only active `doctor`, `clinician`, and `specialist` accounts participate. Creating a request and joining a call require verified accounts. Every record, document, and signaling request checks the authenticated participant; no administrative bypass or public room URL exists.
- Clinical context is explicitly shared. Linking a referral checks existing referral access. Patient search is restricted to records created by the sender's facility. The invited doctor sees only the shared patient identity and conversation, not automatic access to the complete chart.
- Per-conversation transaction locks serialize lifecycle changes, call creation, and message submission. Stable client IDs make retried requests/messages/signals idempotent. The database enforces one live call per conversation. Messages are append-only; a revised opinion is a new entry.
- Activity events are written with mutations. Explicit reads and document downloads use the existing audit service.
- Audit appends take a transaction-scoped advisory lock so simultaneous doctor activity cannot fork the existing audit chain.
- HTTP polling carries WebRTC signaling. Audio/video travel through WebRTC directly or a configured TURN relay, never through PostgreSQL or Vercel request bodies. SDP/network candidates are restricted to the two participants and removed when the call ends or expires on the next interaction. Ringing expires after 90 seconds, lost heartbeats after 45 seconds, and calls after 55 minutes. There is no guaranteed background cleanup worker in this pilot.
- Inbox updates poll every 10 seconds, conversation updates every 4 seconds, call signaling every 1.5 seconds and call heartbeats every 10 seconds. This is intended for the pilot; measure function/database usage before expanding concurrency. Persistent push notifications, offline alerts, scheduling and guaranteed reminders are future work.

## Local development

Run `npm ci` in the root and `npm --prefix server ci`. Apply migrations to a development database with `DATABASE_URL=... node server/scripts/migrate.js`, then run `npm run dev:api` and `npm run dev`. Existing seeded verified accounts can be used in separate browser profiles. Browser media access requires HTTPS or localhost. The browser-only `VITE_DEMO=1` simulation does not implement consultations; use the real API.

## Finding a colleague and choosing a patient

Start a consultation, browse or search the registered active facilities, and select one. The specialty dropdown then lists specialties of verified active colleagues at that facility. Filter by specialty, doctor name, or both, and choose the consulting doctor. Changing facility or filters clears the previous doctor selection so a request cannot accidentally go to a hidden choice. Facilities without eligible colleagues remain searchable and show an empty state.

The patient dropdown loads up to 50 recent, unmerged patients created by staff at the signed-in user's facility. Search by name to narrow the list. Age and sex distinguish similar names, and synthetic records carry a Test patient label. Choosing a patient still requires confirmation before sharing. A linked referral supplies its own patient.

### Additive consultation sample data

After the standard pilot seed, run `DATABASE_URL=... npm run seed:consultations`. For an explicitly selected remote demo database, append `-- --allow-remote`. This adds six clearly labeled test specialists and nine synthetic patients across existing pilot facilities. It never truncates tables, resets existing passwords, or overwrites existing records. Running it again adds no duplicates. No schema migration is needed for this directory update.

| Facility | Sample specialty | Test login |
| --- | --- | --- |
| Black Lion Specialised Hospital | Cardiology | `demo.hana` |
| Black Lion Specialised Hospital | Neurology | `demo.dawit` |
| Ambo General Hospital | Paediatrics | `demo.sara` |
| Ambo General Hospital | Internal Medicine | `demo.kebede` |
| Zewditu Memorial Hospital | Cardiology | `demo.meron` |
| Zewditu Memorial Hospital | General Surgery | `demo.yonas` |

The default sample password is `Password123!`; `SEED_PASSWORD` can override it on first insertion. Each facility gets Sample Aster Tesfaye, Sample Bekele Hailu, and Sample Selam Dawit, with `is_test_data=true` and no real phone or national identity data. These accounts and records are for this demo system only.

Example: sign in as `dr.abdi`, choose Black Lion → Cardiology → Dr Hana, and optionally choose Sample Aster from the patient dropdown. Sign in as `demo.hana` in a separate browser profile to accept the request and test a call.

## Call relay configuration

Direct calling works when the participants' networks permit it. Reliable hospital/mobile-network calling needs a TURN relay; do not treat localhost/direct-call tests as proof of relay connectivity. Configure one of these on the backend (not `VITE_*` variables):

- `TURN_URLS`: comma-separated `turn:` / `turns:` URLs, preferably with both UDP and TLS/TCP connectivity.
- Recommended: `TURN_SHARED_SECRET` for a compatible TURN REST/HMAC server. The backend creates participant-specific credentials valid for one hour.
- Alternatively: `TURN_USERNAME` and `TURN_PASSWORD` for an existing authenticated relay. These credentials necessarily reach authorized calling browsers; use a dedicated limited account.
- Optional `CONSULTATION_STUN_URL`; defaults to Google's public STUN service. STUN receives network-discovery requests, not the conversation or media.

Credentials are supplied only by an authenticated join endpoint; the shared signing secret never leaves the server. No provider account is provisioned and no paid service is enabled by this implementation. With no relay, the call panel explains that some networks cannot connect. Validate with two devices on separate networks before production rollout.

## Rollout and acceptance

1. Test migrations against an isolated database, then test participant boundaries and the lifecycle.
2. Test two browsers using synthetic media: invitation, acceptance, negotiated media in both directions, mute/camera controls and hangup. Also exercise declined calls, concurrent starts, signal access, stale calls and denied media permissions.
3. Confirm referral creation still obeys existing business rules, messages survive reloads, and patient/admin roles cannot read consultations.
4. Configure and verify TURN with separate physical networks.
5. Apply migration 004 to the intended database before releasing the backend/frontend together. Existing deployment routes already cover consultation SPA URLs and the API. Production data must not be reseeded.

This feature is implemented on the consultation branch. Group calls, screen sharing, calendar scheduling, mobile push/SMS, and specialty assignment queues are follow-up work.

## Verification commands

With an isolated migrated and seeded local API running:

```bash
API_BASE=http://127.0.0.1:3101 DATABASE_URL=postgresql://USER@127.0.0.1:PORT/TEST_DB npm run test:consultations
API_BASE=http://127.0.0.1:3101 DATABASE_URL=postgresql://USER@127.0.0.1:PORT/TEST_DB node server/scripts/e2e-test.js
API_BASE=http://127.0.0.1:3101 DATABASE_URL=postgresql://USER@127.0.0.1:PORT/TEST_DB node server/scripts/e2e-features.js
SITE_URL=http://127.0.0.1:5178 PLAYWRIGHT_MODULE=/path/to/playwright-core node tests/consultation-browser.cjs
SITE_URL=http://127.0.0.1:5178 PLAYWRIGHT_MODULE=/path/to/playwright-core node tests/consultation-directory-browser.cjs
```

The browser script uses local Chrome (override `CHROME_PATH` if needed) and synthetic camera/audio. The consultation scripts reject a non-local test API. The existing referral script must also be pointed at the same isolated database. Never run these mutating suites against production.

Verified for deployment: 211 API checks (69 consultation, 71 referral, 71 existing-feature regression checks), plus two-browser media exchange, call controls, hangup, persistence, declined invitations and permission-denied handling. Migration 004 also passed against an isolated copy of the production schema containing no patient data.

Deployed on 2026-10-07 to https://ethio-referral-linkage.vercel.app from the working files without a commit. Production migration 004 was applied transactionally without reseeding existing data. Production smoke checks passed for SPA routes, both API authentication routes, real sign-in, the consultation list, doctor directory, inbox, and anonymous access rejection. The implementation, migration and documentation were held uncommitted until the user subsequently approved committing them.

A TURN relay was not configured at deployment. The user's subsequent manual test confirmed calls work on the same network but fail between their separate networks. Reliable connectivity across restrictive hospital/mobile networks still requires TURN setup and a two-device acceptance test after configuration.

The facility-first directory update passed 230 API checks (88 consultation, 71 referral, 71 existing-feature checks), the sample seed repeat-run check, mobile directory/patient browser checks, and the two-browser audio/video regression suite. Browser checks include combined facility/specialty/name filtering, empty results, clearing stale choices, patient search, and renewed sharing confirmation.

The directory update was deployed on 2026-10-07 with all six sample specialists and nine sample patients added to the live demo database. Production checks passed for every sample login, facility specialties, patient visibility, and the mobile browser search flow. Deployment: `https://ethio-referral-linkage-ux3ypcblc-abeltezare12-9604s-projects.vercel.app`, aliased to the main site. No commits were created.
