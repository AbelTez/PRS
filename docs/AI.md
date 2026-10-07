# AI assistant (demo)

A lightweight, text-only assistant powered by the Gemini API. Every output is a **suggestion** the user applies, edits or ignores. The routing engine, required vitals, override reasons and the referral state machine stay authoritative.

## What it does

| Feature | Where | Who |
|---|---|---|
| **Case assistant:** possible diagnoses, suggested urgency + red flags, a reason code from the platform list, first-line advice, things to monitor, missing info | New referral, clinical step: "Get AI suggestions" | HEW, doctor, clinician, specialist, facility admin |
| **Facility recommendation:** one pick from the routing engine's eligible list, with the reason and a runner-up; suggests an override reason if it isn't rank 1 | New referral, destination step: "Recommend a facility" | same as above |
| **Best-match colleague:** top 3 verified doctors for a question; one click selects them | New consultation: "Find the best colleague with AI" | doctor, clinician, specialist |
| **Drafts:** consultation message, chat reply / opinion, decline note, patient follow-up (English + simple Amharic) | New consultation, consultation chat, decline & outcome panels | clinical roles; reception for decline/outcome |
| **Assistant chat:** "how do I…" and general clinical questions, page-aware, EN/AM | Right-side panel (✦ button in the top bar, floating button on desktop) | all of the above |

Patients, IT admins and oversight roles have no AI access. The in-browser showcase build (`VITE_DEMO=1`) hides AI, because it has no backend to hold the key.

## Setup

In `server/.env` (gitignored; never in a `VITE_*` variable):
```
AI_ENABLED=true
GEMINI_API_KEY=<key>
AI_MODEL=gemini-3.5-flash
AI_FALLBACK_MODELS=gemini-3.8-flash,gemini-flash-lite-latest
AI_TIMEOUT_MS=20000
AI_RATE_PER_MIN=8
```
- If the primary model is overloaded (503), rate-limited (429) or retired (404), the next model is tried automatically.
- `AI_TIMEOUT_MS` is the total provider-call budget across fallbacks (capped at 24 seconds for the 30-second function).
- On Vercel, set the same variables in the project's environment settings.
- `AI_ENABLED=false` turns everything off: the UI hides all AI controls and the endpoints return 503.

## How it works

- `server/src/ai/`:
  - `gemini.client.ts` (REST `generateContent`, timeout, model fallback, logs upstream errors without prompts);
  - `ai.service.ts` (one method per feature, JSON schemas, validation);
  - `redact.ts` (strips phone numbers, e-mails, long ID numbers and known patient names);
  - `ai.module.ts` (`/v1/ai/status`, `case-assist`, `match-facility`, `match-colleague`, `draft`, `chat`).
- Closed choices are validated on the server: reason codes against `reason_code`, facilities against a fresh server-side routing result for the authenticated facility and selected reason, doctors against the same directory query consultations use. Anything else is dropped.
- Successful calls are written to the existing hash-chained audit log (`action: ai_assist`, feature, model, tokens, latency; no prompt text).
- There's a per-user rate limit (`AI_RATE_PER_MIN`, in memory per server process). It resets on restart and is not a shared quota across Vercel instances.
- Frontend `src/ai/`:
  - `useAi.js` (status + call hook + panel state);
  - `AiParts.jsx` (violet "AI suggestion" UI and a safe text formatter);
  - `AssistantPanel.jsx` (the right-side chat; history lives in memory and clears on logout, account switch or reload).

## Testing

```bash
# local API with seed data and AI enabled
API_BASE=http://127.0.0.1:3000 npm run test:ai
```
It checks role restrictions, the case assistant, server-validated facility picks (including forged browser candidates), colleague matching, drafts and chat (9 checks). It makes real Gemini calls, fails if AI is disabled, and refuses non-local APIs.

Additional regression checks:
```bash
npm run test:ai:guards
# Set PLAYWRIGHT_MODULE to a Playwright installation and CHROME_PATH if needed.
SITE_URL=http://127.0.0.1:5176 node tests/ai-session-browser.cjs
SITE_URL=http://127.0.0.1:5176 node tests/ai-browser.cjs
# Optional real AI decline and follow-up drafting during the existing lifecycle test:
TEST_AI_DRAFTS=1 SITE_URL=http://127.0.0.1:5176 API_BASE=http://127.0.0.1:3116 node tests/redesign-browser.cjs
```
Use an isolated seeded database: the workflow/browser suites create synthetic records. The session tests mock delayed/error responses; `test:ai` and `ai-browser.cjs` use real Gemini.

The UI discards pending answers after account changes, form edits, navigation, or starting a new chat. Generated drafts remain editable and require an explicit send/submit action.

## Limits (demo)

- **Free tier:** Google may use prompts to improve its products, and humans may review them. Use **synthetic data only**. Real patients need a paid key or Vertex AI, plus a legal review.
- **Free-tier models are often busy.** Users see "AI is busy — try again", and the forms keep working manually.
- **Redaction is best effort:** contacts and long numeric identifiers are stripped; known patient names are removed when provided by the workflow. Arbitrary names or identifying details typed into chat cannot reliably be detected. This is not anonymization.
- **Advice quality varies.** It's labelled "verify clinically" everywhere, and nothing is applied without a click.
- **Rotate the API key before any public deployment.**

## Local review — 2026-10-08

The review fixed account-switch chat/status leakage, stale answers overwriting edited forms, browser-trusted hospital candidates, gaps in known-name redaction, malformed JSON handling, permissive colleague references, and fallback attempts consuming the serverless timeout budget. Draft controls now show the clinical verification reminder.

Verified on the isolated, seeded `erl_ai_review_1008` database at local PostgreSQL port 55439:
- 230 existing API regression checks (71 referral, 71 existing features, 88 consultation).
- 10 deterministic AI boundary checks and 9 real-provider API checks.
- 7 real-Gemini browser checks, including mobile Amharic chat and consultation drafts.
- 13 referral browser checks, including real bilingual follow-up and reception decline drafts.
- 6 AI session/error browser checks; existing directory, workspace, responsive, session-race and demo checks.
- Two-browser consultation media test, including audio/video receipt, controls, hangup and permission denial. This uses synthetic camera/microphone streams on the same machine; it does not validate cross-network TURN connectivity.
- API, normal frontend and demo builds; no configured Gemini key found in tracked/unignored files.

Gemini returned intermittent upstream 429/503 responses during testing. The final browser walkthroughs passed with automatic model fallback. Provider availability remains external to this application; failed AI requests leave manual workflows usable. These tests verify integration and workflow behavior, not clinical accuracy.

Local preview for manual review: `http://127.0.0.1:5176`, API `http://127.0.0.1:3116`. Seed accounts include `dr.abdi`, `dr.samuel`, `dr.selam`, `liaison.blacklion` and `demo.hana`, all with password `Password123!`. Use synthetic cases only.

To restart this same preview while the scratch Postgres cluster is running:
```bash
npm run build:api
DATABASE_URL=postgresql://erl_test@127.0.0.1:55439/erl_ai_review_1008 PORT=3116 DISABLE_SCHEDULER=true node server/dist/main.js
# In a second terminal:
API_URL=http://127.0.0.1:3116 npm run dev -- --host 127.0.0.1 --port 5176 --strictPort
```
The API reads the existing ignored `server/.env` for Gemini configuration. The database override above keeps this preview separate from development and production data. Nothing was committed, pushed or deployed during this review.
