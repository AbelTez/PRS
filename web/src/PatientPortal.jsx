import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { get, post, humanStatus, humanCode, timeAgo, formatDual } from './lib';
import {
  Button, Card, Field, Input, Textarea, ErrorBox, Modal, Spinner, Empty,
  UrgencyBadge, StatusBadge, Stars, StarInput,
} from './ui';

/* Patient-friendly wording for the technical states */
const PATIENT_STATUS = {
  SUBMITTED: ['Your referral was sent', 'The receiving hospital has been notified and must respond within its time limit.'],
  ESCALATED: ['Waiting for the hospital — escalated', 'The response is late, so supervisors have been alerted automatically.'],
  ACKNOWLEDGED: ['The hospital has seen your referral', 'They are checking beds and staff before confirming.'],
  ACCEPTED: ['You have been accepted', 'A clinician and (if requested) a bed are reserved for you. Go as advised by your health worker.'],
  ACCEPTED_LAPSED: ['Reservation expired', 'Your bed reservation lapsed. Your health worker is finding the next option.'],
  DECLINED: ['The hospital could not accept', 'Your health worker has been alerted and is arranging another hospital.'],
  REDIRECTED: ['Redirected to another hospital', 'The first hospital arranged a better-suited one for you.'],
  IN_TRANSIT: ['On the way', 'Safe journey. Show your referral code when you arrive.'],
  ARRIVED: ['Arrival confirmed', 'The receiving team has confirmed you arrived.'],
  NOT_ARRIVED: ['The hospital says you have not arrived', 'Your health worker will contact you to help.'],
  IN_CARE: ['You are being treated', 'The receiving team has started your care.'],
  OUTCOME_RETURNED: ['Treatment summary sent back', 'Your treatment summary was returned to the facility that referred you.'],
  CLOSED_COMPLETED: ['Referral complete', 'The loop is closed. Please rate your experience below — it improves care for everyone.'],
  CLOSED_CANCELLED: ['Referral cancelled', ''],
  CLOSED_DECLINED_ALL: ['Referral closed — no hospital could accept', 'The health office has been notified.'],
  CLOSED_NOT_ARRIVED: ['Referral closed — did not arrive', ''],
  CLOSED_DECEASED: ['Closed', ''],
  CLOSED_LOST_TO_FOLLOWUP: ['Referral closed', ''],
};

function FacilityContact({ title, f }) {
  if (!f) return null;
  return (
    <div className="rounded-xl bg-slate-50 p-3 ring-1 ring-slate-200">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{title}</p>
      <p className="mt-0.5 font-semibold text-slate-900">{f.name}</p>
      {f.nameAm && <p className="text-sm text-slate-600">{f.nameAm}</p>}
      <p className="mt-1 text-sm text-slate-600">{[f.address, f.zone, f.region].filter(Boolean).join(', ')}</p>
      {f.phone && <a href={`tel:${f.phone}`} className="mt-1 block text-sm font-medium text-brand-600">{f.phone}</a>}
    </div>
  );
}

function ReferralStatusCard({ r, onRate }) {
  const [t, hint] = PATIENT_STATUS[r.status] || [humanStatus(r.status), ''];
  const myOrigin = r.feedback?.find((f) => f.facilityRole === 'origin');
  const myTarget = r.feedback?.find((f) => f.facilityRole === 'target');
  const rated = myOrigin && myTarget;

  const steps = [
    ['Sent', !!r.created_at],
    ['Accepted', ['ACCEPTED', 'IN_TRANSIT', 'ARRIVED', 'IN_CARE', 'OUTCOME_RETURNED', 'CLOSED_COMPLETED'].includes(r.status) || !!r.arrived_at],
    ['Arrived', !!r.arrived_at],
    ['Treated', !!r.outcome_submitted_at],
    ['Closed', r.status === 'CLOSED_COMPLETED'],
  ];

  return (
    <Card>
      <div className="flex flex-wrap items-center gap-2">
        <UrgencyBadge urgency={r.urgency} />
        <StatusBadge status={r.status} />
        <span className="ml-auto font-mono text-sm text-slate-500">{r.referral_code}</span>
      </div>

      <h2 className="mt-2 text-lg font-bold text-slate-900">{t}</h2>
      {hint && <p className="text-sm text-slate-600">{hint}</p>}

      {/* parcel-style progress */}
      <ol className="mt-4 flex items-center">
        {steps.map(([label, done], i) => (
          <li key={label} className="flex flex-1 items-center">
            <div className="flex flex-col items-center">
              <span className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold
                ${done ? 'bg-brand-600 text-white' : 'bg-slate-200 text-slate-500'}`}>
                {done ? '✓' : i + 1}
              </span>
              <span className={`mt-1 text-[10px] ${done ? 'font-medium text-brand-700' : 'text-slate-500'}`}>{label}</span>
            </div>
            {i < steps.length - 1 && <div className={`mx-1 mb-4 h-0.5 flex-1 ${steps[i + 1][1] ? 'bg-brand-500' : 'bg-slate-200'}`} />}
          </li>
        ))}
      </ol>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <FacilityContact title="Referred from" f={r.originFacility} />
        <FacilityContact title="Referred to" f={r.targetFacility} />
      </div>

      {r.receiving_clinician_name && (
        <div className="mt-3 rounded-lg bg-brand-50 p-3 text-sm">
          <p className="font-medium text-brand-700">Your receiving clinician</p>
          <p>{r.receiving_clinician_name}{r.receiving_clinician_phone && ` · ${r.receiving_clinician_phone}`}</p>
          {r.bed_reserved && <p className="mt-1 text-xs text-brand-700">A bed is reserved for you{r.reserved_ward_type && ` (${humanCode(r.reserved_ward_type)} ward)`}.</p>}
        </div>
      )}

      {r.outcome?.followUpInstructions && (
        <div className="mt-3 rounded-lg bg-emerald-50 p-3 text-sm ring-1 ring-emerald-200">
          <p className="font-medium text-emerald-800">Your follow-up instructions</p>
          <p className="text-emerald-900">{r.outcome.followUpInstructions}</p>
        </div>
      )}

      <p className="mt-3 text-xs text-slate-500">Referred {formatDual(r.created_at)} · updated {timeAgo(r.updated_at)}</p>

      {r.feedbackEligible && onRate && (
        <div className="mt-4 border-t border-slate-200 pt-3">
          {rated ? (
            <div className="flex flex-wrap items-center gap-4 text-sm">
              <span className="text-slate-600">Your ratings:</span>
              <span>{r.originFacility?.name?.split(' ')[0]} <Stars value={myOrigin.rating} showValue={false} /></span>
              <span>{r.targetFacility?.name?.split(' ')[0]} <Stars value={myTarget.rating} showValue={false} /></span>
              <button onClick={() => onRate(r)} className="text-brand-600 underline">edit</button>
            </div>
          ) : (
            <Button onClick={() => onRate(r)} className="w-full sm:w-auto">
              ★ Rate both hospitals — help improve referrals
            </Button>
          )}
        </div>
      )}
    </Card>
  );
}

function RateModal({ r, onClose, onSaved }) {
  const [originRating, setOriginRating] = useState(r?.feedback?.find((f) => f.facilityRole === 'origin')?.rating || 0);
  const [targetRating, setTargetRating] = useState(r?.feedback?.find((f) => f.facilityRole === 'target')?.rating || 0);
  const [originComment, setOriginComment] = useState('');
  const [targetComment, setTargetComment] = useState('');
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true); setError(null);
    try {
      await post('/v1/feedback', {
        referralId: r.id,
        ratings: [
          { facilityRole: 'origin', rating: originRating, comment: originComment || undefined },
          { facilityRole: 'target', rating: targetRating, comment: targetComment || undefined },
        ],
      });
      onSaved();
    } catch (e) { setError(e); } finally { setBusy(false); }
  }

  return (
    <Modal open={!!r} title="Rate your referral experience" onClose={onClose}>
      <div className="space-y-4">
        <p className="text-sm text-slate-600">
          Your rating is anonymous to the hospitals and is used by health bureaus to
          improve referral quality.
        </p>
        <div className="rounded-xl bg-slate-50 p-3 ring-1 ring-slate-200">
          <p className="text-sm font-medium text-slate-800">{r?.originFacility?.name}</p>
          <p className="text-xs text-slate-500">The facility that referred you</p>
          <div className="mt-2"><StarInput value={originRating} onChange={setOriginRating} /></div>
          <Textarea rows={2} className="mt-2" placeholder="Optional comment…"
                    value={originComment} onChange={(e) => setOriginComment(e.target.value)} />
        </div>
        <div className="rounded-xl bg-slate-50 p-3 ring-1 ring-slate-200">
          <p className="text-sm font-medium text-slate-800">{r?.targetFacility?.name}</p>
          <p className="text-xs text-slate-500">The facility that received and treated you</p>
          <div className="mt-2"><StarInput value={targetRating} onChange={setTargetRating} /></div>
          <Textarea rows={2} className="mt-2" placeholder="Optional comment…"
                    value={targetComment} onChange={(e) => setTargetComment(e.target.value)} />
        </div>
        <ErrorBox error={error} />
        <Button className="w-full" disabled={busy || !originRating || !targetRating} onClick={submit}>
          {busy ? 'Sending…' : 'Submit ratings'}
        </Button>
      </div>
    </Modal>
  );
}

/* ============================================================ THE PORTAL */
export default function PatientPortal() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [rating, setRating] = useState(null);

  const loadAll = () => get('/v1/portal/me').then(setData).catch(setError);
  useEffect(() => { loadAll(); }, []);

  if (error) return <div className="p-4"><ErrorBox error={error} /></div>;
  if (!data) return <Spinner />;

  return (
    <div className="mx-auto max-w-3xl space-y-4 p-4">
      <div>
        <h1 className="text-xl font-bold">Selam, {data.patient?.name?.split(' ')[0]} 👋</h1>
        <p className="text-sm text-slate-500">Track your referrals and rate the care you received.</p>
      </div>
      {data.referrals.length === 0 && <Card><Empty>No referrals on record for you.</Empty></Card>}
      {data.referrals.map((r) => (
        <ReferralStatusCard key={r.id} r={r} onRate={setRating} />
      ))}
      <RateModal r={rating} onClose={() => setRating(null)}
                 onSaved={() => { setRating(null); loadAll(); }} />
      <p className="text-center text-xs text-slate-400">
        In an emergency call 907 (ambulance) — this portal does not replace emergency services.
      </p>
    </div>
  );
}

/* ============================================= PUBLIC TRACKER (no login) */
export function TrackReferral() {
  const [code, setCode] = useState('');
  const [phone, setPhone] = useState('');
  const [r, setR] = useState(null);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  async function lookup(e) {
    e?.preventDefault();
    setBusy(true); setError(null); setR(null);
    try { setR(await post('/v1/portal/lookup', { code, phone })); }
    catch (e2) { setError(e2); } finally { setBusy(false); }
  }

  return (
    <div className="min-h-screen bg-slate-100">
      <div className="bg-brand-700 py-4 text-white">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4">
          <Link to="/" className="font-bold">Ethio Referral Linkage</Link>
          <Link to="/login" className="text-sm text-brand-100 hover:text-white">Staff sign in</Link>
        </div>
      </div>
      <div className="mx-auto max-w-3xl space-y-4 p-4 py-8">
        <Card title="Track your referral" subtitle="Use the referral code you were given (also sent by SMS) and your phone number">
          <form onSubmit={lookup} className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
            <Field label="Referral code"><Input placeholder="ERL-XXXX-XX" value={code}
                   onChange={(e) => setCode(e.target.value)} autoCapitalize="characters" /></Field>
            <Field label="Phone number"><Input placeholder="+2519…" value={phone}
                   onChange={(e) => setPhone(e.target.value)} inputMode="tel" /></Field>
            <div className="flex items-end"><Button type="submit" disabled={busy || !code || !phone} className="w-full">
              {busy ? 'Checking…' : 'Track'}
            </Button></div>
          </form>
          <p className="mt-2 text-xs text-slate-500">
            Demo: try code <span className="font-mono">ERL-K7PM-42</span> with phone <span className="font-mono">0912000001</span>.
          </p>
        </Card>
        <ErrorBox error={error} onDismiss={() => setError(null)} />
        {r && <ReferralStatusCard r={r} onRate={null} />}
        {r && (
          <p className="text-center text-sm text-slate-500">
            Patients with a portal account can also <Link to="/login" className="font-medium text-brand-600">sign in</Link> to
            rate the hospitals after treatment.
          </p>
        )}
      </div>
    </div>
  );
}
