# Ethio Referral Linkage — Lightweight AI Assistant Plan (Demo)

> Status: **IMPLEMENTED on branch `ai-assistant` (2026-10-07), uncommitted.** See `docs/AI.md` for setup. Replaces the RAG plan. There's no document knowledge base, no vector database and no voice: text only.
> Purpose: a **demo** of an AI helper built into the existing workflow, using the Gemini API (free tier) and **synthetic data only**.

---

## 0. The brief (reusable implementation prompt)

> Add a **lightweight, text-only AI assistant** to Ethio Referral Linkage using the **Gemini API** from the NestJS backend. It helps doctors inside the existing screens:
> 1. suggest possible diagnoses, an urgency level, and first-line (pre-referral) advice from the case details;
> 2. draft messages (consultation requests, chat replies, patient follow-up instructions);
> 3. pick the best-matching hospital **from the rule-based routing candidates**;
> 4. find the best-matching colleague for a consultation **from the verified doctor directory**;
> 5. answer short "how do I…" and general clinical questions in a small assistant panel.
>
> Everything the AI produces is a **suggestion the doctor can apply, edit or ignore**. The existing business rules (routing eligibility, override reasons, required vitals, state machine) stay authoritative. No new database tables, no new frontend libraries; one backend module and one SDK. It is a demo: synthetic data only, clearly labelled, and it switches off cleanly.

---

## 1. Features

### F1 — Case assistant (diagnosis, urgency, first-line advice)
- **Where:** New referral form → **Clinical** step: an "✨ AI suggestions" button under the vitals.
- **Input sent:** reason category, presenting complaint, vitals, pregnancy/gestation, age and sex. **No name, phone or IDs.**
- **Output (structured JSON):**
  - **Possible diagnoses:** top 3, each with a short "why" and a likelihood (low/medium/high).
  - **Suggested urgency:** emergency / urgent / routine, with the **red flags** that drove it.
  - **Suggested reason code:** chosen **only from the platform's reason-code list**.
  - **First-line advice before referral:** stabilisation steps, and what to monitor during transfer.
  - **Missing information:** vitals or details worth adding.
- **UX:** a result card with **Apply** buttons ("Use this reason", "Add to stabilisation", "Copy to diagnosis"). The rule-based urgency from the reason code stays what's submitted; the AI urgency is shown next to it as advice ("AI suggests: Emergency — BP 170/112, headache"). The label reads "AI suggestion — for decision support only".

### F2 — Best-match hospital
- **Where:** New referral form → **Destination** step, above the routing candidates.
- **How:**
  1. The existing routing engine returns eligible candidates (capability, tier, beds, distance, acceptance rate).
  2. The AI gets those candidates plus the de-identified case and returns **one recommended facility from that list**, with a 2–3 line reason, and optionally a runner-up.
- **Rules:**
  - The AI can only choose among eligible candidates; anything else is discarded on the server.
  - Picking a non-top candidate still requires the **existing override reason**. The AI can pre-fill a suggested override reason, but the doctor confirms it.

### F3 — Best-match colleague for consultation
- **Where:** New consultation → "Choose a colleague": a "✨ Find the best match" box ("What do you need advice on?").
- **How:**
  1. The server loads verified, available doctors (name, specialty, facility, tier) with the **same query the consultation directory already uses**.
  2. Gemini ranks the **top 3** for the question, with one line of reasoning each.
  3. Clicking one selects that facility and doctor in the existing form.
- **Rules:** results are restricted to the directory list (IDs validated on the server). Only the question is sent, plus the case reason when started from a referral.

### F4 — Draft messages
| Where | Button | Draft |
|---|---|---|
| New consultation | "✨ Draft message" | Title + opening message from topic, priority and optional case context |
| Consultation chat | "✨ Draft reply" | A reply based on the last messages of the thread |
| Submit-outcome panel | "✨ Draft follow-up" | Patient-friendly follow-up instructions in **English + simple Amharic** |
| Decline panel | "✨ Draft note" | A polite, specific decline note for the selected coded reason |

Drafts always land **in the text box for editing**. Nothing is sent automatically.

### F5 — Assistant panel (small chat)
- **Where:** an "✨ Assistant" button in the top bar (clinical roles), opening a side panel.
- **What:** short Q&A, kept for the session only and not stored:
  - "how do I…" questions about the platform (it's given a short built-in guide to the screens and workflow);
  - general clinical questions (first-line advice, danger signs).
- **Context:** knows the current page name and the user's role/facility tier, never patient details. Replies in the language the user writes in (English or Amharic).

---

## 2. Architecture (lightweight)

```
React screens ──▶ POST /v1/ai/{case-assist | match-facility | match-colleague | draft | chat}
                       │
                       ▼
              server/src/ai/   (one module)
              ├─ ai.controller.ts   roles + per-user rate limit + AI_ENABLED switch
              ├─ ai.service.ts      one method per feature: prompt + JSON schema + validation
              ├─ gemini.client.ts   @google/genai wrapper (model from env, 20 s timeout, 1 retry)
              └─ redact.ts          strips names/phones/IDs before sending
                       │
                       ▼
                   Gemini API (Flash model)
```

- **No new tables.** Each AI call is recorded through the **existing `AuditService`** (action `ai_assist`, feature name; no prompt text).
- **Structured output** (`responseSchema`) for F1–F4, so the UI gets clean fields. The server validates enumerations (reason codes, facility IDs, doctor IDs, urgency values) and drops anything invalid.
- **One model** for everything: the current Gemini **Flash** model, configurable in env because Google updates model IDs often.
- **Frontend:**
  - one `src/ai/` folder with a `useAi()` hook (`status`, `busy`, `error`, `call()`) and small shared parts: `AiButton`, `AiSuggestionCard`, `AiBadge`, and `AssistantPanel`;
  - AI buttons appear only when `GET /v1/ai/status` reports `enabled: true`.
- **Demo mode note:** the in-browser showcase build (`VITE_DEMO=1`) has no backend, so AI controls are hidden there. AI works with the real API (local or deployed).

### Files touched
| Area | Files |
|---|---|
| Backend (new) | `server/src/ai/{ai.module,ai.controller,ai.service,gemini.client,redact}.ts` |
| Backend (edit) | `server/src/app.module.ts` (register module), `server/package.json` (`@google/genai`), `server/.env.example` (AI vars, no real key) |
| Frontend (new) | `src/ai/useAi.js`, `src/ai/AiParts.jsx`, `src/ai/AssistantPanel.jsx` |
| Frontend (edit) | `src/NewReferral.jsx` (F1, F2), `src/consultations/Consultations.jsx` (F3, F4), `src/ReferralDetail.jsx` (F4 outcome/decline drafts), `src/Shell.jsx` (F5 button), `src/locales/en.js`, `am.js` |

### Configuration
```
# server/.env  (gitignored — the key never goes in the repo or in VITE_* variables)
AI_ENABLED=true
GEMINI_API_KEY=<your key>
AI_MODEL=<current Gemini Flash model id>
AI_TIMEOUT_MS=20000
AI_RATE_PER_MIN=8
```
`server/.env.example` gets the same names with empty values.

---

## 3. Guardrails (light, but kept for a medical demo)
1. **Suggestions only:** every output is labelled "AI suggestion — verify clinically". Nothing is saved or sent without a click, and rule-based checks still run on submit.
2. **Synthetic data only:** the free Gemini tier may use prompts to improve Google's products, and humans may read them. That's fine for a demo with made-up patients, but not for real patients (that would need a paid key or Vertex AI).
3. **No patient identifiers:** `redact.ts` removes names, phone numbers and ID-like strings, and only clinical fields are sent.
4. **Closed choices:** hospital and colleague matches must come from server-provided lists, and reason codes from the reason-code table.
5. **Fails quietly:** on a timeout, error or the free-tier rate limit (429), the user sees "AI is busy — try again" and the form keeps working manually.
6. **Key safety:** server-side only, gitignored. Rotate the key before any public deployment, since it has been shared in chat.

---

## 4. Testing
- **Unit:** redaction (names/phones removed), validators (invalid reason code / facility / doctor ID dropped).
- **Script** `npm run test:ai` (skipped when no key is set): runs one call per feature against a local API with seed data and checks the response shape.
- **Browser walkthrough with demo accounts:**
  - `dr.selam`: new referral → AI suggestions → apply → destination recommendation;
  - `dr.abdi`: new consultation → best-match colleague → draft message → chat draft reply;
  - receiving doctor: outcome draft in Amharic + English;
  - assistant panel in both languages;
  - `AI_ENABLED=false` hides everything.
- **Regression:** `npm run build`, consultation browser test, deployment smoke test.

---

## 5. Implementation steps
| Step | Work | Size |
|---|---|---|
| 1 | AI module skeleton: Gemini client, redaction, rate limit, `/v1/ai/status`, env vars, audit hook | S |
| 2 | **F1 case assistant** + **F2 best-match hospital** (backend + wizard UI) | M |
| 3 | **F3 best-match colleague** + **F4 drafts** (consultation, outcome, decline) | M |
| 4 | **F5 assistant panel** + EN/AM strings | S |
| 5 | Tests, browser walkthrough, short `docs/AI.md` (setup, switching off, limits) | S |

Estimated total: about the size of one UI redesign phase. No database migration.

---

## 6. Confirm before implementation
1. Is the feature list right (F1–F5), or should anything be dropped? F5, the assistant panel, is the easiest to cut.
2. Should AI features be available to **doctors/clinicians/specialists only**, or also **HEWs** (F1, F2) and **reception** (decline/outcome drafts)?
3. Should I first **commit the UI redesign** (release 1) on `ui-ux-redesign`, then do the AI work on top, either on the same branch or a new `ai-assistant` branch?
