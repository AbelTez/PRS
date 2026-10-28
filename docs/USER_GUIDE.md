# Using Ethio Referral Linkage

A plain-language guide: what the system does, who it is for, and how to get
through a working day on it. No technical detail — just the screens and the
words on them.

## The short version

When a patient needs care a facility can't give, the referral used to leave on
paper — and nobody knew what happened after that. This system keeps that
handover visible from the moment it is written until the receiving hospital
sends the outcome back.

Three things live here:

- **Referrals.** The patient's details, vitals, the treatment already given and
  the scans, sent to a facility that can genuinely take the case — and tracked
  until the loop is closed.
- **Consultations.** Doctors asking doctors at other hospitals: a conversation,
  documents, and a live video or audio call.
- **An AI assistant.** It suggests. You decide. Nothing it writes is used until
  you use it.

Patients get their own view: where they were sent, who is treating them, their
follow-up instructions, and a place to rate both hospitals.

## Who it is for

Your role decides your screens.

| Role | What you do here |
| --- | --- |
| Health extension worker | Register patients and send referrals; follow what happens to them. |
| Doctor · Clinician · Specialist | Send referrals, take the inbound cases assigned to you, and consult colleagues at other facilities. |
| Referral liaison · Triage | Receive incoming referrals and hand each one to a named clinician. Keep the bed board current. |
| Facility administrator | Everything reception does, plus staff accounts and the patient feedback about your hospital. |
| IT administrator | Create staff accounts, verify professional licences, deactivate people who leave. |
| Woreda · Region · Ministry · CBHI | Watch flow and timing across facilities. You never see the clinical chart. |
| Patient | Your own referrals — status, contacts, follow-up, and your rating. |

## Getting in

There is no sign-up. Your facility's IT administrator creates your account, and
a clinical account stays switched off until the licence number on it has been
checked against the national health-professional register. After that you sign
in with your username and password.

Switch between `EN` and `አማ` at any time from the top bar. The app is built for
a phone as seriously as for a desktop — the bottom bar on a small screen
carries the same work as the sidebar on a large one.

## Sending a referral, in four steps

1. **Patient.** Search by name or Fayda ID, or register someone new.
   Registration works with no signal at all and syncs when the network comes
   back — the offline time is not counted against anyone's clock.
2. **Clinical.** Reason for referral, provisional diagnosis, complaint, vital
   signs. Vitals are required; the only way past them is an emergency override
   with a written reason. Record what you did to stabilise the patient and
   attach the X-ray, ultrasound, MRI or lab report — so the receiving team never
   repeats a test you already did.
3. **Destination.** You get the facilities that can actually treat this patient,
   ranked by capability, distance, how reliably they accept, and free beds. The
   ones that cannot take the case are shown too, with the reason, rather than
   hidden. Choose the top suggestion or a different one — if you go off the top,
   or skip a tier, you write why. That reason is read later.
4. **Confirm.** Check it over and send. The patient gets a referral code by SMS,
   and from here on the case appears on both hospitals' screens.

## Receiving a referral

An arriving referral goes to the hospital's referral reception, not straight to
a doctor. The liaison, triage or facility administrator assigns it to a named
clinician — and until they do, no clinician can open the chart. That is
deliberate: every patient ends up with exactly one person responsible, and you
can see who.

The assigned clinician then has four honest options:

- **Accept** — and optionally reserve a real bed, which comes off the
  availability board immediately.
- **Decline** — with a coded reason. The sending team is asked to reroute, and
  the reason feeds capacity planning.
- **Redirect** — hand it to a facility better placed to receive the patient.
- **Ask for information** — when what you were sent isn't enough to decide.

## The loop

```
Sent → Acknowledged → Accepted → In transit → Arrived → In care → Outcome → Loop closed
```

The sending side marks the patient departed; the receiving side confirms arrival
and starts care; the receiving side returns the outcome; the sending side
acknowledges it. That last acknowledgement is what closes the loop — the
referring clinician finally knows what happened to their patient.

When it doesn't go that way, the system names it instead of losing it:
`Declined`, `Info requested`, `Acceptance lapsed`, `Not arrived`, `Redirected`,
`Escalated`, `Referred onward`. Each one puts a specific next step in front of a
specific person.

## Five screens, and what each is for

| Screen | Why you open it |
| --- | --- |
| Home | "Needs you now" — the one next step on each case that is waiting on you. Below it: what you're waiting on from other facilities, who is arriving, and free beds. |
| Referrals | The full list, tabbed Needs action · Active · In transit · Closed · All. Search by patient, code, diagnosis or facility; filter to inbound, outbound, assigned to me, unassigned. Most urgent and tightest deadline come first. |
| Availability | Beds per ward. Routing reads exactly these numbers, so a stale board sends you patients you cannot take. |
| Dashboard | Your own volume and status mix — plus why referrals get declined and why clinicians override the routing suggestion. |
| Staff accounts | Administrators only: verify a licence and activate, add staff, deactivate someone. Deactivation takes effect at once, on every device. |

## Asking a colleague (consultations)

Open to verified doctors, clinicians and specialists. Pick the colleague's
facility, then narrow by specialty or by name. Give the conversation a clear
title, a topic — general, patient case, second opinion or learning — a
priority, and an opening message.

A patient is optional. A consultation can simply be a question you want
answered. If you do attach a patient, only what you put in is shared, and you
confirm the sharing before it goes.

They accept or decline. Once it is open you can exchange messages, share JPEG,
PNG or PDF documents, and either of you can start a live video or audio call —
the other person has to press Join, and nothing is recorded. An answer can be
marked as an opinion or discussion summary so it stands out from the chat. The
person who asked closes the conversation, and closed conversations stay
readable. If it was about a patient, the summary can be handed straight into the
referral form.

## The assistant: it suggests, you decide

- **While writing a referral:** possible diagnoses, a suggested urgency with the
  red flags behind it, first-line advice before transfer, what to monitor on the
  way, and what you forgot to enter.
- **Choosing a destination:** one pick from the eligible facilities with the
  reason, a runner-up, and a suggested override reason if it isn't the
  top-ranked one.
- **Consulting:** the three best-matched colleagues for your question, and
  drafts for messages, replies, opinions, decline notes and patient follow-up —
  in English and simple Amharic.
- **Anywhere:** the assistant panel, for "how do I…" and clinical questions, in
  either language.

**Two rules.** Verify anything it says clinically before you act on it — it is a
prompt to think, not an authority. And don't type patient names or phone numbers
into it. Patients, IT administrators and oversight roles have no assistant at
all.

## For patients

Sign in to the portal, or use **Track a referral** with the code you were sent
by SMS and your phone number — no account needed.

You see which hospital you were referred to and who will be treating you, with
contact details; your follow-up instructions once care is finished; and you can
rate the hospital that referred you and the one that treated you. That rating
reaches the hospital's quality administration attached to the actual referral,
so it is about something specific.

## The honest limits

- This is a pilot. Sample staff and patients are labelled `Sample` or
  `Test patient` — keep real patient data out of the demo.
- Oversight roles see flow and timing only. The clinical detail is not shown to
  them.
- Every action is written to an audit trail that cannot be edited afterwards —
  who did what, and when.
- Calls need microphone and camera permission in the browser, and are never
  recorded.
- The high/low flags on vital signs use general adult screening ranges. They are
  a prompt to look again, not a diagnosis.
