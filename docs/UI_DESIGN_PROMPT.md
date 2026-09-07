# UI Design Prompt — for Google Stitch / Figma AI (First Draft / Make)

Copy-paste the master prompt below into Stitch (or Figma First Draft). Then use
the per-screen prompts one at a time — AI design tools produce far better
results from one focused screen prompt than from one giant prompt.

---

## Master prompt (paste first, sets the system)

```
Design a professional healthcare web application called "Ethio Referral
Linkage" (Amharic subtitle: የሪፈራል ትስስር) — a national closed-loop patient
referral exchange for Ethiopian public health facilities, from rural health
posts to specialised hospitals like Tikur Anbessa (Black Lion) in Addis Ababa.

BRAND & MOOD: calm, clinical, trustworthy, governmental-but-modern. This is a
Ministry-of-Health-grade tool used in bright sunlight on low-end Android phones
and on hospital desktops. High contrast, generous touch targets (min 44px),
16px minimum body text, no decorative clutter.

COLORS: primary deep teal #0F766E (hover #0D5F59, dark header #0A4A45),
background slate #F1F5F9, surfaces white with subtle slate ring borders,
emergency red #DC2626, urgent amber #D97706, success emerald #059669,
rating stars amber #F59E0B, routing-override violet #8B5CF6.
TYPE: Inter or Noto Sans (must render Amharic/Ge'ez glyphs — pair with Noto
Sans Ethiopic). Bold weights for numbers and statuses.

COMPONENTS: rounded-xl cards with soft shadows, pill-shaped status badges
(EMERGENCY red / Urgent amber / Routine slate), progress steppers, star
ratings, timeline/audit lists, bottom navigation on mobile, sticky teal top
bar with the user's name, role and facility.

TONE OF CONTENT: real Ethiopian names and facilities (Dr Kebede Tesfaye,
Sr Hanna Girma, Ambo General Hospital, Tikur Anbessa Specialised Hospital,
Yekatit 12), dual dates (Gregorian + Ethiopian calendar), phone numbers in
+251 format. Status colors are never the only signal — always paired with a
text label (accessibility in sunlight).

LAYOUT: mobile-first 390px screens AND a 1440px desktop dashboard variant.
```

---

## Per-screen prompts

### 1 · Landing page
```
Landing page for Ethio Referral Linkage. Deep teal gradient hero with the
headline "Every referral tracked. Every loop closed." and Amharic subtitle
የሪፈራል ትስስር. Two CTAs: "Staff sign in" (white button) and "I am a patient —
track my referral" (ghost button). A 4-step "How a referral moves" strip
(Refer → Route → Receive → Close) with small icons. A grid of 6 role cards
(Doctors, Referral liaisons, Hospital IT admins, Patients, Health bureaus,
Triage). Stats band: "21 lifecycle states · 5-minute emergency SLA · 18 pilot
facilities". Clean white footer noting "Ethiopian public health facilities".
```

### 2 · Referral wizard (doctor view, mobile)
```
4-step mobile wizard: Patient → Clinical → Destination → Confirm, with a slim
teal progress bar. Clinical step: reason-for-referral dropdown ("Severe
pre-eclampsia / eclampsia"), an auto-set EMERGENCY red badge, a grid of six
vitals inputs (BP, pulse, resp rate, temp, SpO2), a stabilisation checklist
card ("MgSO4 loading dose given" etc.), and a dashed-border upload zone
"Attach X-ray, MRI, ultrasound or PDF" with two uploaded thumbnails showing a
chest X-ray and an ultrasound. Destination step: ranked facility cards — the
top one marked "Best match" (teal chip) showing "Ambo General Hospital · 1.2km
· ~6 min · 9 maternity beds free · 94% acceptance · ★4.6 (23)"; below, a
muted "Not available for this patient" section listing "Guder Primary
Hospital — Caesarean section: unavailable — 'No anaesthetist on site since
Tuesday'" in red text. When a non-top facility is selected, a violet card
appears: "Why not the top suggestion?" with a reason dropdown.
```

### 3 · Liaison inbound queue + referral detail (desktop)
```
Split view. Left: inbound referral queue sorted by urgency, each card with
EMERGENCY/Urgent badge, patient name/age, diagnosis, origin→target line, a
live SLA countdown ("3 min left" in red), and an attachment count icon.
Right: referral detail with action buttons (Accept teal, Decline red outline,
Redirect ghost); an Accept modal with receiving-clinician fields and a
"Reserve a bed" toggle + ward selector labeled "takes a real bed off the
availability board"; a "Referred by" card showing the sending doctor's photo
placeholder, name "Dr Kebede Tesfaye — General Practitioner", MoH license
MOH-MD-14501, direct phone, plus the sending facility's full address and
switchboard; an attachments gallery with X-ray thumbnails; a vertical audit
timeline (Created → Submitted → Accepted with timestamps and actor names).
```

### 4 · Patient portal (mobile)
```
Warm, simple patient view. Greeting "Selam, Abeba 👋". A referral card styled
like parcel tracking: 5-step progress (Sent ✓ Accepted ✓ Arrived ✓ Treated ✓
Closed ✓), referral code ERL-K7PM-42, two facility contact blocks with
address and tappable phone numbers, a green follow-up instructions box ("BP
check at Awaro Health Post weekly for 6 weeks"), and a prominent "★ Rate both
hospitals" button. Rating modal: two cards (referring hospital / receiving
hospital), each with five big tappable stars and an optional comment field,
note "Your rating is anonymous to the hospitals."
```

### 5 · Health bureau dashboard (desktop)
```
Analytics dashboard for a regional health bureau. Hero metric card:
"Loop-closure rate 68%" with a progress bar toward a 60% target and baseline
10%. KPI tiles: referrals, median time-to-accept vs 30min target, arrival
confirmation %, acceptance rate, patient rating ★4.3, SLA breaches (red).
Four panels: "Why referrals are declined" horizontal amber bars (No bed 12,
No specialist 7…); "Routing override intelligence" violet bars of override
reasons with an insight callout "Transport availability drives 38% of
overrides — review ambulance coverage on the Ambo–Guder corridor"; "Patient
experience" facility star-rating leaderboard with recent anonymous comments;
"Referral flow" origin→destination list. No clinical data anywhere.
```

### 6 · IT admin — staff verification (desktop)
```
Hospital IT admin console titled "Staff accounts — Tikur Anbessa Specialised
Hospital". An amber "Awaiting verification (1)" card: "Dr Yonas Getachew —
Emergency Physician, license MOH-MD-13990 — verify at MoH register" with
"Verify & activate" (teal) and "Reject" buttons. Below, a staff table with
role chips, license numbers, verified-by/when, status pills (Active emerald /
Pending amber / Disabled slate) and Deactivate actions. A "Register staff"
modal with name, username, role dropdown, MoH license field (marked required
for clinical roles) and helper text "account starts as pending until you
verify it".
```

### 7 · Availability board (liaison, mobile)
```
"Availability" screen for Sr Hanna Girma at Ambo General Hospital. Bed board:
four ward tiles (General 31/150, Maternity 9/40, Paediatric 7/30, ICU —)
each with a freshness stamp "updated 1h ago by Sr Hanna Girma"; one tile
amber-flagged "stale — 30h ago". Tapping opens a "Report beds" sheet with
number steppers. Below: capability matrix grouped by category (Emergency,
Surgical, Obstetric, Imaging…), each row a capability with a status select
(Available / Degraded / Unavailable / Unknown) and a red note field visible on
"Caesarean section — Unavailable: No anaesthetist on site since Tuesday".
```

---

## Tips for using these prompts

- Generate screens **one at a time**; after each, tell the tool what to fix
  ("increase contrast of the SLA timer", "make stars larger") rather than
  regenerating from scratch.
- In Stitch, ask for the **mobile screen first**, then "adapt this to a 1440px
  desktop layout" — it keeps the visual language consistent.
- Export to Figma and swap the font for **Noto Sans Ethiopic** wherever Amharic
  appears; most AI tools default to a Latin-only font and the Ge'ez text will
  look wrong until you do.
- Keep the teal/red/amber semantic mapping exactly as specified — status color
  consistency is a patient-safety feature, not a style choice.
```
