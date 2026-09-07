# AI Integration Blueprint — Ethio Referral Linkage

*How artificial intelligence is layered onto the referral exchange, why each use
case earns its place, and the exact workflow to implement it safely in the
Ethiopian health system context.*

---

## 1. Design principles (read first)

Every AI feature in this system follows five non-negotiable rules:

1. **AI assists, humans decide.** No model ever accepts, declines, routes, or
   closes a referral on its own. AI drafts, ranks, flags and summarises; a
   licensed clinician or liaison confirms. This is both a safety requirement and
   an FMOH acceptability requirement.
2. **Utilise only data collected for that purpose.** The system already collects
   structured, purpose-labelled data (override reasons, decline reasons, patient
   ratings, outcomes, transit times). AI features consume exactly these streams —
   the same principle the rest of the product follows (e.g. BR-13 override
   reasons power routing improvement, nothing else).
3. **Degrade gracefully offline.** Rural facilities lose connectivity. Every AI
   feature is an *enhancement* to a flow that works without it. No AI call is on
   the critical path of an emergency referral.
4. **Data stays lawful.** Ethiopia's Personal Data Protection Proclamation
   1321/2024 restricts cross-border transfer of personal data. Two compliant
   patterns: (a) send **de-identified** payloads (no name, no Fayda ID, no phone)
   to a cloud model; (b) for anything identifiable, use in-country hosting or
   on-premise open-weight models. The gateway (§4) enforces this at one choke
   point.
5. **Amharic and Afaan Oromo are first-class.** Patient feedback, SMS, and
   clinical free text arrive in Ge'ez script and Latin script. Model choice and
   evaluation sets must cover both.

---

## 2. The seven AI use cases, ranked by pilot value

### UC-1 · Referral triage & completeness assistant (highest value, ship first)

**Problem:** HEWs and junior clinicians must pick the right reason code, urgency
and stabilisation steps under pressure. Wrong reason code → wrong routing →
declined referral.

**AI:** From the presenting complaint and vitals (structured JSON, de-identified),
the model suggests:
- the most likely reason code(s) with confidence,
- urgency validation ("BP 168/112 + proteinuria at 36 weeks is EMERGENCY, not routine"),
- missed stabilisation items ("MgSO4 loading dose not ticked — confirm before transfer"),
- danger-sign flags the referrer may have missed.

**UI:** an "AI check" panel in step 2 of the referral wizard. Suggestions are
buttons the clinician taps to accept — never auto-applied.

**Data it utilises:** the mandatory vitals (BR-05) and reason-code vocabulary the
system already enforces.

### UC-2 · Routing intelligence v2 (the moat)

**Problem:** The current routing score is a hand-tuned formula
(distance/acceptance/beds/queue). It cannot see what doctors see.

**AI:** Two layers:
1. **Learning-to-rank:** train a gradient-boosted ranker on historical
   (candidate list → chosen facility → outcome) tuples. Features: the current
   score inputs **plus override reasons, decline history per reason code,
   patient ratings, transit-time realities vs estimates**. This is the direct
   payoff of BR-13: every time a doctor overrides the top suggestion and records
   *why*, that record becomes a labelled training example of what the formula
   missed.
2. **LLM explanation:** the ranker's output is explained to the clinician in one
   sentence ("Ranked Ginchi above Guder: Guder has declined 3 of 4 recent
   obstetric referrals — no anaesthetist").

**Cadence:** retrain monthly per region; the model only *re-orders* the
capability-eligible candidates — capability hard filters (BR-10..15) are never
overridden by a learned model.

### UC-3 · Document & imaging intake

**Problem:** Referrals arrive with phone photos of paper charts, X-ray films
photographed on a lightbox, and lab PDFs. Receivers re-type and re-test.

**AI:**
- **OCR + structuring:** extract vitals, medications and lab values from
  photographed paper records into the referral's structured fields (clinician
  confirms each extracted value).
- **Attachment auto-labelling:** classify each upload ("Chest X-ray, AP",
  "CBC lab report") so the receiving doctor scans a labelled list, not
  `IMG_2041.jpg`.
- **Quality gate:** flag unreadable/blurred images *at upload time* so the
  sender can re-shoot while the patient is still in front of them.

> ⚠️ Scope guard: this is *document understanding*, *not* diagnostic radiology
> AI. No lesion detection, no automated reads — that requires EFDA/FMOH device
> pathways and is out of pilot scope.

### UC-4 · Patient-feedback NLP

**Problem:** Star ratings say *how much* patients are unhappy; comments (in
Amharic, Afaan Oromo, English) say *why* — but nobody has time to read them.

**AI:** monthly batch job: sentiment + topic clustering over comments
("waiting time at maternity", "staff courtesy", "medication availability"),
per facility, trended. Output feeds the woreda dashboard next to the star
averages. This closes the loop on the ratings the patient portal collects —
collected for quality improvement, utilised for quality improvement.

### UC-5 · Liaison copilot (summaries & handover)

**Problem:** A liaison at Tikur Anbessa faces 40 inbound referrals; each takes
minutes to read.

**AI:** one-line SBAR-style summary per inbound referral ("27F, 36w, severe
pre-eclampsia, MgSO4 given, needs CS capability, ETA 45 min, sender: Dr Kebede,
Ambo HC, +251-91…"), plus a drafted acceptance/decline note. Also drafts the
outcome's follow-up instructions in plain language for the patient SMS.

### UC-6 · Capacity & demand forecasting

**AI:** classical time-series (or gradient boosting) on referral volumes, bed
occupancy and seasonal patterns → forecast next-week demand per receiving
facility/ward. Surfaces on the regional dashboard ("Yekatit 12 paediatrics
predicted at 96% next week — pre-position accordingly"). No LLM needed; cheap
and explainable.

### UC-7 · Patient SMS/USSD assistant

**AI:** a constrained conversational layer over SMS/USSD (Ethio Telecom) so a
patient can text "where is my referral" in Amharic and get the same status the
portal shows, plus answer follow-up questions from a fixed knowledge base
(directions to the hospital, what to bring, CBHI coverage). Strictly templated
answers with an LLM doing language understanding, not free generation.

---

## 3. What runs where (model strategy)

| Use case | Model class | Where it runs | Identifiable data? |
|---|---|---|---|
| UC-1 triage assist | Frontier LLM (Claude Opus 5, `claude-opus-5`) | Cloud via AI gateway | No — de-identified vitals + complaint only |
| UC-2 ranker | XGBoost/LightGBM | In-country server | Pseudonymised IDs only |
| UC-2 explanations | LLM (Claude Haiku 4.5 for cost, `claude-haiku-4-5`) | Cloud via gateway | No — facility stats only |
| UC-3 OCR/labelling | LLM w/ vision (Claude Opus 5) | Cloud via gateway | **Yes → must be stripped/consented or run in-country** |
| UC-4 feedback NLP | LLM batch (Batches API = 50% cost) | Cloud via gateway | No — comments scrubbed of names/phones first |
| UC-5 copilot | LLM (Claude Opus 5) | Cloud via gateway | De-identified; names re-inserted client-side |
| UC-6 forecasting | Classical ML | In-country server | Aggregates only |
| UC-7 SMS assistant | Small LLM + templates | In-country preferred | Phone number stays in telco boundary |

The pattern for identifiable content (UC-3) is **pseudonymise → process →
re-identify at the edge**: the browser/app replaces name/ID/phone with tokens
before the gateway call and re-inserts them after, so the model never sees them.

---

## 4. Architecture: one AI gateway, not scattered calls

```
 web / mobile clients
        │
        ▼
  ERL API (NestJS)  ──────────────►  Postgres (source of truth)
        │
        ▼
 ┌─────────────────────────────┐
 │        AI GATEWAY           │   single service, single audit point
 │  - purpose registry         │   (every call carries a use-case tag)
 │  - de-identification pass   │   (names/IDs/phones stripped or tokenised)
 │  - prompt templates (ver.)  │
 │  - response validation      │   (structured outputs, schema-checked)
 │  - cost & rate limits       │
 │  - full audit log           │
 └──────┬──────────────┬───────┘
        │              │
        ▼              ▼
  Claude API      In-country models
  (cloud LLM)     (ranker, forecaster, fallback LLM)
```

Rules enforced by the gateway:
- every request is tagged with its use case (UC-1..7) and logged to the same
  hash-chained audit table the rest of the system uses;
- requests containing identifiable fields to cloud targets are **rejected**;
- every LLM response is schema-validated (structured outputs) before the app
  sees it; a failed validation falls back to "no suggestion", never to raw text;
- kill switch per use case (config flag) — turning AI off never breaks a flow.

### Reference call (UC-1, TypeScript, Claude API)

```ts
import Anthropic from "@anthropic-ai/sdk";
const client = new Anthropic(); // key held by the gateway only, never the browser

const response = await client.messages.create({
  model: "claude-opus-5",
  max_tokens: 2000,
  thinking: { type: "adaptive" },
  system: TRIAGE_SYSTEM_PROMPT_V3,           // versioned, cached
  output_config: {
    format: {                                 // structured output: the app never parses prose
      type: "json_schema",
      schema: TriageSuggestionSchema,         // {reasonCodes[], urgency, missingSteps[], dangerSigns[], confidence}
    },
  },
  messages: [{
    role: "user",
    content: JSON.stringify({                 // de-identified by the gateway
      complaint: "severe headache, blurred vision, epigastric pain",
      vitals: { bpSystolic: 168, bpDiastolic: 112, pulse: 104, spo2: 96 },
      gestationalAgeWeeks: 36, age: 27, sex: "female",
    }),
  }],
});
```

For UC-4's monthly batch, use the Message Batches API (50% of the cost, no
latency requirement).

---

## 5. Implementation workflow (per AI feature)

Run every use case through the same eight-stage pipeline. Do not skip stages.

```
 1. FRAME        2. DATA          3. OFFLINE EVAL      4. SHADOW
 problem, KPI ─► curate + scrub ─► golden set, ─────► run silently in
 & guardrails    consented data    measure vs          production, log
                                   clinicians          agree/disagree
        ┌─────────────────────────────────────────────────┘
        ▼
 5. ASSIST       6. MEASURE        7. GOVERN            8. ITERATE
 show to users ─► KPI vs control ─► DPIA update, ────► retrain/refine
 (accept/edit/    (did it help?)    incident log,       from accept-
  reject logged)                    FMOH reporting      reject signals
```

**Stage gates (a feature may not advance until):**

| Gate | Criterion (example for UC-1) |
|---|---|
| 3 → 4 | ≥90% top-3 reason-code agreement with a 3-clinician panel on a 300-case golden set (Amharic + English cases) |
| 4 → 5 | ≥85% live agreement over 4 shadow weeks; zero unsafe urgency downgrades |
| 5 → 6 | Accept-rate of suggestions ≥60%; median added latency <2s; no BR violation ever suggested |
| ongoing | Any unsafe suggestion → incident review within 72h; kill switch if pattern found |

**Team & cadence for the pilot:** 1 ML engineer + 1 clinical lead (part-time) +
the existing backend team. UC-1 and UC-5 are prompt-engineering + evaluation
work (weeks, not months). UC-2's ranker needs ≥3 months of pilot data first —
which is precisely why the override/decline/rating collection ships **now**.

**Evaluation assets to build once, reuse forever:**
- a golden set of 300 anonymised referral scenarios (clinician-labelled),
- an Amharic/Afaan Oromo feedback-comment test set,
- a red-team suite: prompt injection via free-text fields, urgency-downgrade
  probes, hallucinated-facility probes.

---

## 6. Safety, privacy & governance checklist

- [ ] DPIA updated per use case before shadow mode (Proclamation 1321/2024)
- [ ] De-identification verified by automated tests in the gateway CI
- [ ] Model + prompt version recorded on every suggestion (reproducibility)
- [ ] Clinician accept/edit/reject logged — the audit answers "did AI influence this referral?"
- [ ] No AI output ever stored as fact — stored as `suggestion{source, version, acceptedBy}`
- [ ] Quarterly bias review: suggestion quality by region, language, facility tier
- [ ] FMOH digital-health & EFDA guidance reviewed before any imaging feature
- [ ] Fallback behaviour tested: gateway down ⇒ referral flow unaffected

---

## 7. Why this stands out (the pitch paragraph)

Most referral systems digitise a paper form. This one closes the loop — and the
AI layer is only possible *because* the loop is closed: override reasons teach
the router, outcomes and ratings teach the ranker, decline reasons teach the
capacity planner, and patient comments teach the quality dashboard. Every datum
is collected for a stated purpose and utilised for exactly that purpose. The AI
is not a chatbot bolted on top; it is the compounding return on disciplined
data collection — which is why it gets better every month of the pilot while a
form-digitiser stays exactly as smart as the day it launched.
