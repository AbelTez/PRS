# Ethio Referral Linkage — User Guide (Non-Technical)

*A plain-language guide for everyone who uses the system: doctors, liaisons,
IT administrators, patients, health extension workers, and health offices.
No technical knowledge is needed.*

---

## What is this system, in one paragraph?

When a patient needs care that your facility cannot provide, you refer them to
another facility. Today that often means a paper letter, a phone call if you're
lucky, and no way to know whether the patient arrived, was treated, or was
turned away. **Ethio Referral Linkage replaces that with a tracked, electronic
referral that behaves like a parcel with a tracking number**: the sender knows
where it is, the receiver knows what's coming, and the patient can follow it on
their own phone. The loop is only "closed" when the treatment summary comes
back to the facility that sent the patient — and the patient has had the chance
to rate the care.

**Signing in:** open the website, tap **Staff sign in**, and enter the username
and password given to you by your facility's IT administrator. You can only do
things your role allows, and only in the name of the facility where you are
registered.

---

## 👩‍⚕️ For Doctors and Health Officers (sending a patient)

You send referrals. The system helps you send them to the *right* place with
the *right* information.

**To refer a patient:**
1. Tap **Referrals → + New referral**.
2. **Find or register the patient.** Search by name first — if they were
   referred before, their record exists.
3. **Choose the reason for referral** from the list (e.g. "Severe
   pre-eclampsia"). The urgency, the capabilities the receiving hospital must
   have, and a stabilisation checklist appear automatically.
4. **Enter the vitals.** They are mandatory — the receiving team needs them.
   Only in a true emergency where the patient is too unstable can you tick
   the override box, and you must say why.
5. **Attach images and documents.** Tap the attachment box to add the X-ray,
   MRI, ultrasound photo or lab PDF. The receiving doctor sees them instantly
   — so your patient doesn't repeat tests they already paid for.
6. **Pick a facility.** The system ranks facilities that can actually treat
   this patient — considering distance, free beds, how reliably they accept,
   and how patients rated them. Facilities that *cannot* help are also shown,
   with the reason ("No anaesthetist on site since Tuesday") so you never send
   a patient somewhere that will turn them away.
   - If you choose a facility other than the top suggestion, you'll be asked
     why. **This is not bureaucracy** — your reason (e.g. "transport
     availability") teaches the system what it can't see, and health offices
     use it to fix real problems like ambulance coverage.
7. **Send.** The receiving hospital is notified and a countdown starts — for an
   emergency they must respond within 5 minutes or supervisors are alerted
   automatically.

**Afterwards:** mark the patient **Departed** when they leave, and when the
treatment summary comes back, tap **Acknowledge outcome** — that's what closes
the loop and it matters for your facility's performance.

**If you are the receiving doctor:** open the inbound referral and you'll see
the complete picture — the clinical details, the attached imaging, and a
**"Referred by" card with the sending doctor's name, title, license number,
direct phone, and the sending facility's full address and switchboard**. If
anything is unclear, call them directly; the number is right there.

---

## 🛎️ For Referral Liaisons (receiving patients)

You are the front door of your hospital. Your queue is the **Inbound** tab.

**When a referral arrives:**
1. Emergencies appear at the top with a countdown timer. Open one and read the
   summary, vitals and attachments.
2. **Accept** if you can take the patient. Enter the receiving clinician's name
   and phone (the sender and the patient both see it). Tick **Reserve a bed**
   and pick the ward — this takes a *real* bed off your availability board, so
   the promise is genuine. If there are no free beds in that ward, the system
   will tell you — update the board or accept without a reservation.
3. **Decline** only with a reason from the list ("No bed", "No specialist"…).
   You cannot decline without a reason — those reasons are how the health
   bureau learns where the gaps are and fixes them.
4. **Redirect** if another facility suits the patient better — the referral
   chain stays connected.
5. When the patient shows up, tap **Confirm arrival** (they'll show you their
   referral code). When treatment finishes, **Submit outcome** with follow-up
   instructions — the patient reads those instructions in their own portal.

**Your other job — keep the availability board honest** (the **Availability**
tab): update free beds each shift and flag capabilities that are down ("CT
scanner under maintenance"). Every update is stamped with your name and time.
A stale board doesn't just mislead colleagues — the system marks your data as
stale and sends you fewer appropriate referrals.

---

## 🖥️ For Hospital IT Administrators

You control **who** can act in your hospital's name. This is the security
backbone of the whole exchange: a referral "from Black Lion" can only be
created by someone *you* registered and verified at Black Lion.

**In the Staff accounts tab you can:**
- **Register staff** — create an account for a doctor, liaison, triage nurse or
  admin. The account starts as *pending* and cannot sign in yet.
- **Verify** — for clinical roles you must record the MoH professional license
  number and check it against the national register before activating. Once
  you tap **Verify & activate**, they can sign in.
- **Deactivate** — someone leaves or transfers? Deactivate them and their
  access ends immediately, on every device. (Transfer = the new hospital's IT
  admin registers them fresh there.)

You can only manage accounts of **your own facility** — never another
hospital's. Everything you do here is recorded in the audit log.

---

## 🧑‍🦱 For Patients

You don't need to be technical, and you don't even need an account.

**To track your referral:** open the website, tap **"I am a patient" / Track a
referral**, and enter the referral code you were given (it's also in your SMS)
plus your phone number. You'll see your referral like a parcel: **Sent →
Accepted → Arrived → Treated → Closed**, with the name and phone number of your
receiving clinician, both hospitals' addresses and phone numbers, whether a bed
is reserved for you, and — after treatment — your follow-up instructions in
plain words.

**To rate the hospitals:** if you have a portal account (sign in with the
username the health worker gave you), after you've been received you can rate
**both** hospitals — the one that referred you and the one that treated you —
from 1 to 5 stars, with a comment if you like. Your rating is anonymous to the
hospitals. It is not a formality: ratings appear on the health bureau's
dashboard and even influence where future patients are routed. Speaking up
improves care for the next family.

**In an emergency, always call 907 for an ambulance — this website is not an
emergency service.**

---

## 🏘️ For Health Extension Workers

You refer from the community, often with poor network. The referral form works
the same as for doctors (see above), with two things to remember:
- fill the vitals and tick the stabilisation checklist *before* the patient
  leaves — the receiving facility restarts the workup without them;
- if the network is down, the referral is saved and sent when signal returns,
  and the delay is never counted against you.

When the outcome comes back, acknowledge it — and follow up on the instructions
with the family on your next home visit.

---

## 🏛️ For Woreda / Regional Health Bureaus

Your **Dashboard** shows flow, never private medical charts:
- **Loop-closure rate** — the north star. Baseline was ~10%; the target is 60%.
- **Why referrals are declined** — the capacity-planning gold mine ("no bed"
  spikes at one hospital = a real, fixable problem).
- **Routing override intelligence** — when doctors bypass the system's top
  suggestion, their recorded reasons cluster into actionable findings (e.g.
  "transport availability" dominating = ambulance coordination problem, not a
  hospital problem).
- **Patient experience** — star ratings and comments by facility.
- SLA breaches, referral flows between facilities, and status breakdowns.

You see names of facilities and timings — not diagnoses. Clinical details are
only visible to the clinicians actually caring for the patient.

---

## Common questions

**I forgot my password.** Ask your facility's IT administrator to reset it.

**Why can't I edit a closed referral?** Closed referrals are permanent records
and legally immutable. If something is wrong, create a new referral or contact
your facility administrator.

**Why must I give a reason to decline / override / skip a tier?** Because those
reasons are the most valuable data in the system. Every one of them is used —
to fix capacity gaps, improve routing, and plan the network. Free-text
"other" tells nobody anything; picking the real reason takes two seconds and
changes what the health bureau funds next year.

**Who sees the patient's medical details?** Only staff at the sending and
receiving facilities involved in the care. Health offices see timings and
flows. Every single view of a patient's chart is logged.

**Is the demo data real?** The facilities are real Ethiopian institutions, but
all patients, staff accounts, referrals and ratings in the demonstration are
synthetic. No real patient data is used.
