# Ethio Referral Linkage — Signed-in UI/UX Redesign Plan

> Status: **Release 1 UI implemented and regression-checked (2026-10-07).** Release 2 remains on hold.
>
> **Agreed decisions**
> | # | Decision | Outcome |
> |---|---|---|
> | 1 | Navigation | **Left sidebar** on desktop, icon rail on tablet, bottom nav on mobile |
> | 2 | Post-login landing | **New role-based Home page** for every staff role |
> | 3 | Language | **Amharic / English toggle now**: i18n scaffold + toggle in the top bar; strings translated progressively, starting with shell, Home, list and detail |
> | 4 | Theme | **Light only**, no dark mode |
> | 5 | Scope | **Release 1 = phases 1–5.** Phases 6–10 are release 2, re-confirmed after release 1 review |
> | 6 | Login page | **Leave as is**; the demo-accounts panel stays for quick testing |

---

## 0. The brief (use this as the implementation prompt)

> Redesign the **signed-in experience** of Ethio Referral Linkage (React 18 + Vite + Tailwind v4 + react-router + zustand). Keep the existing **brand colours, logo and landing page**. Do **not** change the backend, API contracts, business rules or role permissions. Turn the app from "a column of stacked cards" into a **task-first clinical workspace**: every role should open the app and immediately see *what needs me now*, act on it in one or two clicks, and always know where a referral is in its lifecycle. Optimise for: low-end Android phones on slow networks, daylight readability in clinics, keyboard and screen-reader users, and busy staff who scan instead of reading. Use no heavy new dependencies. Make all changes incrementally, phase by phase, so the app keeps working after each phase. Navigation is a left sidebar; every staff role lands on a role-based Home page; the UI supports an Amharic/English toggle; light theme only; the login page and its demo accounts stay unchanged.

---

## 1. What the product is (so the design serves it)

A referral exchange across Ethiopia's three-tier public health system: a patient is referred from one facility to another, and the system tracks the case until the receiving side reports an outcome and the sending side acknowledges it ("closing the loop").

| Role group | Roles | Their real job in the app |
|---|---|---|
| **Senders** | `hew`, `doctor`, `clinician`, `specialist` | Create referrals, chase responses, reroute declined cases, mark patient departed, acknowledge outcomes. Doctors also receive cases reception assigns to them, and consult colleagues. |
| **Reception** | `liaison`, `triage`, `facility_admin` | Triage the inbound queue, **assign a responsible clinician**, accept/decline/redirect, confirm arrival, keep bed availability current. |
| **IT** | `it_admin` (+ `facility_admin`, `sysadmin`) | Verify or deactivate staff accounts, view the dashboard and availability. |
| **Oversight** | `woreda`, `region`, `moh`, `cbhi` | Analytics: loop-closure rate, decline reasons, routing overrides, flow. |
| **Patient** | `patient` (+ anonymous `/track`) | See status in plain language, facility contacts, rate the experience. |

**Feature inventory:** referral list (inbound/outbound/all) · referral detail with a 10-event lifecycle (acknowledge → accept/decline/redirect → reroute → depart → arrive → start care → outcome → acknowledge outcome, cancel) · reception assignment · attachments · referral chain · audit trail · 4-step new referral wizard with routing suggestions and override reasons · doctor-to-doctor consultations (inbox, chat, documents, video/audio calls, incoming-call banner, referral prefill) · three dashboard variants · bed availability · IT staff verification · patient portal and public tracking · Ethiopian/Gregorian dual dates.

---

## 2. What's wrong today (found in the code, not guessed)

1. **No sense of "what do I do now".** Every staff role lands on `/referrals`, a flat list. Reception's actual job (an unassigned queue) and a doctor's job (respond to assigned cases, acknowledge outcomes) show up only as yellow banners stacked above the list.
2. **The shell is thin.** A gradient top bar with 2–4 text-only links; no icons, no count badges, no global search, no notifications centre (only consultation alerts exist), no user menu. "Sign out" carries the same visual weight as navigation.
3. **Narrow single column everywhere** (`max-w-3xl` / `max-w-4xl`). On a desktop at reception, 60% of the screen is empty, and the referral detail is ~10 cards stacked vertically.
4. **Referral detail hides the most important thing.** The *Actions* card sits in the middle of the page with up to 11 buttons that all look equally important. There's no visual lifecycle, so users can't see the stage at a glance. "Request a doctor consultation →" floats above the back link.
5. **The list can't be worked.** It has no search, no urgency/status filter and no sort. SLA is small text in the corner. It uses an emoji (🩻) as an icon.
6. **Dashboards are number grids.** Stat tiles have no trend or comparison, and "by status" is a row of badges, not a chart.
7. **Consultations feel like forms, not conversations.** The inbox is a card grid, and picking a colleague takes three chained `<select>`s plus two search boxes. The code is minified one-liners, which makes it hard to maintain.
8. **Inconsistent patterns.** There are two different tab styles, full-page spinners instead of skeletons, no success feedback after actions (the page just re-renders), and empty states with no next step.
9. **Mobile.** The bottom nav is text-only, there's no quick "New referral" action, and modals aren't bottom sheets.

---

## 3. Design principles (decision rules for every screen)

1. **Action first.** The top of every screen answers "what needs me?"; the single most likely next action is the one primary button.
2. **Urgency is unmistakable.** Emergency/urgent/routine always shows as colour **plus** text **plus** position (sorted first, left colour bar). Never colour alone.
3. **Lifecycle is always visible.** Any referral, anywhere, shows where it is in the journey.
4. **Scan, don't read.** Dense but calm: clear type hierarchy, tabular numbers, consistent rows, less prose.
5. **Fast on bad networks.** Skeletons instead of spinners, no large libraries, no image-heavy UI, and polling that never blocks the screen.
6. **Accessible by default.** WCAG AA contrast (the current palette already targets this), visible focus rings, 44px touch targets, labelled controls, and `aria-live` for updates.
7. **Same thing, same look.** One component per pattern, used everywhere.

---

## 4. The plan, phased

Each phase is shippable on its own. The order matters: phase 1 provides the building blocks the later phases use.

- **Release 1 (approved, implement now): phases 1–5.**
- **Release 2 (planned, confirm after release 1 review): phases 6–10.** Phase 10's QA checklist is also applied in a lighter form at the end of release 1.

### Phase 1 — Design-system foundation (`src/ui.jsx`, `src/brand.jsx`, `src/index.css`)
Keep every existing colour token. Add:
- **Tokens:** type scale (display / h1 / h2 / body / small / caption), spacing rhythm, radii, elevation levels, a semantic urgency palette (`--urgency-emergency/urgent/routine`), and status-group colours (waiting / in-progress / transit / done / problem).
- **New components:**
  - `AppShell`, `Sidebar`, `TopBar`, `UserMenu`
  - `Tabs` / `SegmentedControl` (one style replacing the two current ones)
  - `Toolbar` with `SearchInput` and `FilterChip`
  - `DataTable` (desktop) and `ListRow` (mobile)
  - `StatusPill` and `UrgencyBar`
  - `LifecycleStepper` (horizontal and vertical)
  - `Timeline` (activity/audit)
  - `DescriptionList` (label/value grids)
  - `VitalTile` (value, unit, abnormal flag)
  - `KpiTile` (value, delta, inline sparkline)
  - Lightweight SVG `BarChart` / `Funnel` / `Sparkline` (no chart library)
  - `Skeleton`, `EmptyState` (icon + message + CTA), `Toast` (with `useToast` store in zustand)
  - `ConfirmDialog`, `Sheet` (bottom sheet on mobile, side drawer on desktop)
  - `Avatar` (initials), `Tooltip`, `DropdownMenu`, `CopyButton` (referral codes)
- **Icons:** extend the existing `PATHS` set in `brand.jsx` (inbox, queue, bell, search, filter, phone, video, bed, user-check, chart, settings, more, chevron, check-circle, alert, copy, x-ray…). Replace all emoji.
- **i18n scaffold (no new dependency):** `src/i18n.js` with a zustand `useLang` store (persisted in `localStorage`, default English), `t('key')` helper, and `src/locales/en.js` + `src/locales/am.js` dictionaries. Missing Amharic keys fall back to English, so translation can be incremental. Set `<html lang>` on switch. Use an Ethiopic-capable font stack (e.g. Noto Sans Ethiopic via Google Fonts, loaded with `display=swap`). Clinical codes, drug names and referral codes stay untranslated.
- **Global:** focus-visible ring, `prefers-reduced-motion`, consistent page container widths (`max-w-7xl` for workspace pages, `max-w-3xl` only for reading/forms).

### Phase 2 — App shell and navigation (`src/App.jsx`)
- **Desktop (≥1024px):** a collapsible left **sidebar** with icon + label + **live count badges**, grouped by role:
  - Senders: Home · Referrals · New referral · Consultations (unread) · Dashboard
  - Reception: Home · Inbound queue (unassigned) · All referrals · Availability · Dashboard
  - IT: Home · Staff accounts (pending) · Availability · Dashboard
  - Oversight: Dashboard · Referrals
  - Patient: a simplified shell (see Phase 9)
- **Top bar:** facility + role context chip; **global search** (referral code or patient name, `/` keyboard shortcut); **notifications bell** that combines assignments, declined-needs-reroute, outcomes to acknowledge, consultation invites and pending verifications (built from data the existing endpoints already return); user menu (name, role, facility, verification state, sign out); **language toggle (EN / አማ)** next to the user menu, also in the mobile "More" sheet.
- **Tablet:** the sidebar collapses to icons.
- **Mobile:** a bottom nav with **icons + labels** (max 4 items, plus "More" opening a sheet), a floating **"+ New referral"** button for senders, and the consultation incoming-call banner kept docked at the top.
- After sign-in, every staff role goes to **`/home`** (Phase 3) instead of the raw list. `homeFor()` is updated; patients still go to `/portal`.
- The landing page and **login page (including the demo-accounts panel) stay unchanged**. Only the post-login experience changes.

### Phase 3 — Role-based "Home / Today" page (new `src/Home.jsx`)
One page, with content chosen by role, built from existing endpoints (`/v1/referrals?direction=`, `/v1/analytics/overview`, consultations list, IT pending list):
- **Action inbox:** cards grouped by "Needs you now", sorted by urgency, then SLA remaining. Each card has its one primary action inline (e.g. *Assign*, *Accept*, *Acknowledge outcome*, *Reroute*).
- **Senders:** awaiting response · declined → reroute · outcomes to acknowledge · cases assigned to me · consultation invites.
- **Reception:** unassigned queue (prominent count + SLA countdown) · expected arrivals today · SLA at risk · a compact bed-availability widget with "Update" link.
- **IT:** accounts awaiting verification, with inline Verify.
- **Oversight:** redirect to Dashboard.
- **Zero state:** "You're all caught up" + shortcuts (New referral, View all).
- Small KPI strip at top (3–4 tiles max).

### Phase 4 — Referral list becomes a work queue (`ReferralList` in `src/Pages.jsx`)
- **Saved views as tabs:** *Needs action* · *Active* · *In transit* · *Closed* · *All* (direction becomes a filter, not the main tabs).
- **Toolbar:** search (name/code/diagnosis), filter chips (urgency, status group, facility, "assigned to me", "unassigned"), sort (urgency+SLA default, newest, oldest).
- **Desktop:** a dense `DataTable` with an urgency colour bar on the left of each row, patient, diagnosis, route (origin → target), status pill, assignee, SLA countdown chip (turns amber/red), and age (dual date on hover). Sticky header; the whole row is clickable.
- **Mobile:** `ListRow` cards with the same information hierarchy.
- Filters live in the URL query string, so views are shareable and survive refresh.
- Filtering/search run client-side on the already-fetched list (no API change). Pagination is added only if the list is long.

### Phase 5 — Referral detail becomes a case view (`ReferralDetail`)
- **Header:** patient name, sex/age, pregnant/CBHI tags, urgency, status, referral code with copy button, SLA countdown, origin → target route.
- **Lifecycle stepper** under the header: Sent → Acknowledged → Accepted → Departed → Arrived → In care → Outcome → Loop closed. Declined/redirected/rerouted/cancelled show as a branch state with the reason.
- **Two-column layout (desktop):**
  - **Left (tabs):** *Overview* (presenting complaint, diagnosis, **vital tiles with abnormal flags**, pre-referral treatment, sender card, receiving clinician) · *Documents* · *Referral chain* · *Activity* (audit trail as a vertical timeline).
  - **Right (sticky) "Next step" panel:** one plain-language sentence about what is expected of *you* ("Reception is waiting for you to assign a clinician"), **one primary button**, secondary actions in an overflow menu, destructive actions (Decline/Cancel) separated and confirmed. It also holds the reception assignment card and a "Consult a colleague" action.
- **Mobile:** single column, with the Next-step panel as a **sticky bottom action bar**.
- Action modals become `Sheet`s with an explanation of the consequence. Every successful action shows a toast ("Referral accepted — bed reserved at …").
- The 403 "Not assigned to you" screen gets the `EmptyState` treatment with a clear next step.

---

> ⬇️ **Release 2:** the phases below are on hold until release 1 is reviewed.

### Phase 6 — New referral wizard (`src/NewReferral.jsx`)
- Sticky stepper (Patient · Clinical · Destination · Confirm) with completion ticks; you can go back without losing data.
- **Live summary sidebar** (desktop) / collapsible summary (mobile): patient, reason, computed urgency badge, chosen destination.
- **Patient step:** search first with result cards; "Register new patient" opens inline. Latin/Amharic name fields side by side.
- **Clinical step:** reason picker as a searchable list grouped by category (obstetric, paediatric, trauma…) showing the default urgency. Vitals grouped in a grid with units and **inline abnormal-range hints** (e.g. SpO₂ < 92 highlighted). Stabilisation as checkable chips.
- **Destination step:** routing candidates as **comparison cards**: "Recommended" ribbon on rank 1, distance, travel time, free beds, tier, staleness of bed data. Choosing a non-top option reveals the override-reason field in place, with a short explanation.
- **Confirm step:** review sections, each with an "Edit" link that jumps to its step; consent/lawful-basis text made explicit.
- **Draft autosave** to `localStorage` (per user) with "Resume draft?" on return. It's cleared on submit.
- Inline field validation instead of only a top error box.

### Phase 7 — Consultations as a messaging workspace (`src/consultations/*`)
- **Refactor first:** reformat the minified code into readable components with no behaviour change, so the redesign is reviewable.
- **Inbox:** two-pane layout on desktop (conversation list on the left with avatar, name, facility, last message, unread dot, urgent tag; open conversation on the right). On mobile, list → conversation navigation.
- **Conversation:** header (colleague, facility, status, linked patient/referral chip, Start audio/video, Close), chat bubbles grouped by sender and day, document messages as file chips, opinions visually distinct, and a composer with an attach button. Accept/Decline appears as a banner for the invited doctor.
- **Call panel:** docked picture-in-picture that stays visible while scrolling the chat; clear connection-status text.
- **New consultation:** one **colleague picker** (a searchable combobox listing doctor cards with name, specialty and facility, plus facility/specialty filter chips) replacing the chained selects. Topic and priority as chips; patient context in a collapsible "Add clinical context" section.
- ⚠️ `tests/consultation-browser.cjs` drives `<select>` elements by label (`Facility`, `Consulting doctor`). Either keep accessible labelled controls with the same names, or **update the test in the same change** (recommended).

### Phase 8 — Dashboards (`Dashboard`, `MyWorkDashboard`, `FacilityOpsDashboard`, `AnalyticsDashboard`)
- KPI row with `KpiTile`s (value, short label, target/benchmark where one exists).
- **Loop-closure rate** as a hero gauge/progress with explanation.
- Status breakdown as a horizontal **funnel** (sent → accepted → arrived → outcome → closed).
- Decline reasons and routing overrides as **sorted bar charts** with counts.
- Referral flow as an origin → target table with inline bars.
- Bed availability as ward tiles with stale-data warnings (already partly there; restyled).
- All charts are hand-rolled SVG, colour-blind safe, with text labels (no legend-only meaning) and visible in print.

### Phase 9 — Availability, IT admin, patient portal
- **Availability:** each ward as a card with large **− / +** steppers (thumb-friendly), "last updated X min ago" with stale warning, and one Save with toast.
- **IT admin:** "Awaiting verification" as a prominent queue with inline Verify/Reject. Staff as a searchable, filterable table (role, status, facility) with an actions menu and a confirm dialog for deactivation.
- **Patient portal & /track:** large type, a plain-language vertical status timeline ("Your referral was accepted. Go to … "), a facility contact card with tap-to-call, and a simple rating sheet. Minimal chrome (no sidebar).

### Phase 10 — Cross-cutting polish and QA
- Skeletons on every data load; background polling never flashes the page.
- Toasts for all mutations; `ConfirmDialog` for destructive ones.
- Error states with a retry button; offline/slow-connection banner.
- Keyboard: `/` search, `Esc` closes sheets, focus trapped in dialogs, logical tab order.
- Screen readers: landmarks, `aria-live` for new assignments/messages, labelled icon buttons.
- Check at 360px, 768px, 1280px, 1920px widths. Lighthouse accessibility ≥ 95.
- Run `npm run build`, `tests/deployment-smoke.mjs` and `tests/consultation-browser.cjs`, plus a manual pass per role using the demo accounts.

---

## 5. Guardrails (things that must NOT change)
- Brand palette, logo, landing page, **login page and demo-accounts panel** (needed for quick testing).
- Light theme only; no dark-mode work.
- API endpoints, payloads, polling intervals, permissions, lifecycle rules, audit behaviour.
- `VITE_DEMO=1` showcase mode must keep working (consultations stay hidden there).
- Accessible names used by the browser test, unless the test is updated alongside.
- No new heavy dependencies. Small utility additions only if justified.

## 6. Release 1 checks (done at the end of phase 5)
- `npm run build` passes; `tests/deployment-smoke.mjs` and `tests/consultation-browser.cjs` pass (consultation screens are untouched in release 1 apart from the new shell around them).
- Manual pass with demo accounts per role: `dr.abdi` (sender/doctor), `liaison.blacklion` (reception), `it.blacklion` (IT), `woreda.ws` (oversight), `abeba.k` (patient), plus `VITE_DEMO=1` mode.
- Language toggle switches shell, Home, list and detail; untranslated strings fall back to English.
- Layout checked at 360px, 768px, 1280px and 1920px.

## 7. Estimated size
| Phase | Effort | Release |
|---|---|---|
| 1 Foundation (+ i18n) | M | 1 |
| 2 Shell | M | 1 |
| 3 Home | M | 1 |
| 4 Work queue | M | 1 |
| 5 Case view | L | 1 |
| 6 Wizard | L | 2 |
| 7 Consultations | L | 2 |
| 8 Dashboards | M | 2 |
| 9 Availability/IT/Portal | M | 2 |
| 10 Polish/QA | M | 2 (light pass in 1) |

## Release 1 regression verification — 2026-10-07

Tested against a separate local database with synthetic data. All 230 API checks passed (88 consultation, 71 referral, 71 existing-feature checks). Backend and frontend builds passed.

Browser coverage:

- `tests/redesign-browser.cjs`: 11 workflow checks covering patient registration and referral submission, persistent queue filters, unassigned-doctor restrictions, reception assignment, acceptance, dialog keyboard focus, departure, mobile arrival/care/outcome, loop closure, history, cancellation confirmation, and coded decline reasons.
- `tests/workspace-session-browser.cjs`: delayed responses cannot restore a previous user's workspace; reset clears cached data and request ownership.
- `tests/workspace-smoke.cjs`: doctor, reception, IT, oversight, and patient screens; language persistence; referral tabs; oversight chart redaction; 360/768/1280/1920px layouts. Passed with the real local API and browser-only demo mode.
- Consultation directory and two-browser audio/video suites passed with the redesigned shell, including microphone/camera controls, hangup, persisted messages, declined calls, and permission denial.

Fixes made during review: isolate the shared workload cache by session and invalidate delayed responses; ignore stale referral detail responses when navigating between cases; keep keyboard focus inside dialogs; submit the displayed ambulance default on departure; constrain the mobile Home grid so long facility names and large overdue SLA values cannot expand it beyond the viewport. The session browser suite includes that mobile regression fixture. The doctor login expectation in the directory test now follows the new `/home` landing route.

These checks do not establish cross-network TURN connectivity. TURN provisioning and a separate-network acceptance test remain separate from the UI regression.

Deployed to the production alias on 2026-10-07. Final deployment: `https://ethio-referral-linkage-h7p5njjtg-abeltezare12-9604s-projects.vercel.app`. Live checks passed for page/API routing and sign-in, all five role screens, oversight redaction, language persistence, all four viewport widths, and the facility/specialty/name/patient consultation picker. No database migrations, reseeding, or new Git commits were performed for this UI rollout.
