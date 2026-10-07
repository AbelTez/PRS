import React, { useState, useEffect, useCallback } from 'react';
import { Link, useParams } from 'react-router-dom';
import { get, post, put, useAuth, humanCode, humanStatus, slaLabel, timeAgo, formatDual } from './lib';
import {
  Button, Card, Field, Input, Select, Textarea, ErrorBox, Badge, Modal, Notice,
  UrgencyBadge, StatusBadge, Stat, Spinner, Empty, Stars, FileUpload, AttachmentList, checkCls,
} from './ui';
import { PageHead, SectionLabel, Icon, IconTile, Photo, FlowPulse } from './brand';

/* ========================================================= DASHBOARD */
/**
 * One route, three depths of view — the server decides which, this component
 * renders what it is given:
 *   my_referrals        → a clinician's own work only
 *   facility_operations → a liaison's own queue and beds
 *   it_facility_detail / network_flow → full analytics (IT for their own
 *                         hospital; health bureaus for the network)
 */
export function Dashboard() {
  const [m, setM] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => { get('/v1/analytics/overview').then(setM).catch(setError); }, []);

  if (error) return <div className="p-4"><ErrorBox error={error} /></div>;
  if (!m) return <Spinner />;
  if (m.scope === 'my_referrals') return <MyWorkDashboard m={m} />;
  if (m.scope === 'facility_operations') return <FacilityOpsDashboard m={m} />;
  return <AnalyticsDashboard m={m} />;
}

/* --------- clinician: only their own referrals, no feedback, no ratings */
function MyWorkDashboard({ m }) {
  const t = m.totals;
  const a = m.assignedToMe;
  return (
    <div className="mx-auto max-w-4xl space-y-5 p-4 py-6 sm:p-6">
      <PageHead
        eyebrow="Clinician workspace"
        title="My referrals"
        lede={`${m.viewer.name} · ${m.viewer.facilityName} — cases assigned to you, and referrals you sent.`}
      />

      {/* Cases reception made this clinician responsible for. */}
      {a && (a.open > 0 || a.total > 0) && (
        <Card title="Assigned to you"
              subtitle="Cases the referral reception has made you responsible for">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label="Open cases" value={a.open}
                  tone={a.open > 0 ? 'text-brand-700' : 'text-slate-900'} />
            <Stat label="Need your response" value={a.needsResponse}
                  tone={a.needsResponse > 0 ? 'text-danger-600' : 'text-slate-900'}
                  sub="accept or decline" />
            <Stat label="Open emergencies" value={a.openEmergencies}
                  tone={a.openEmergencies > 0 ? 'text-danger-600' : 'text-slate-900'} />
            <Stat label="Outcomes due" value={a.outcomesDue}
                  tone={a.outcomesDue > 0 ? 'text-ember-600' : 'text-slate-900'} />
          </div>
          {a.needsResponse > 0 && (
            <Link to="/referrals" className="mt-4 inline-block text-sm font-semibold text-brand-700 underline decoration-brand-300 underline-offset-4 hover:text-brand-800">
              Respond now →
            </Link>
          )}
        </Card>
      )}

      <LoopRatePanel
        label="My loop-closure rate"
        value={m.myLoopClosureRatePct}
        tone={m.myLoopClosureRatePct >= 60 ? 'text-emerald-600' : 'text-slate-900'}
        footnote={`${t.loopsClosed} of your closed referrals came back with an acknowledged outcome.`}
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Stat label="Referrals sent" value={t.sent} sub={`${t.emergencies} emergency`} />
        <Stat label="Awaiting response" value={t.awaitingResponse}
              tone={t.awaitingResponse > 0 ? 'text-brand-700' : 'text-slate-900'} />
        <Stat label="Declined — need reroute" value={t.awaitingReroute}
              tone={t.awaitingReroute > 0 ? 'text-danger-600' : 'text-slate-900'} />
        <Stat label="Outcomes to acknowledge" value={t.outcomesToAcknowledge}
              tone={t.outcomesToAcknowledge > 0 ? 'text-ember-600' : 'text-slate-900'}
              sub="acknowledging closes the loop" />
        <Stat label="Loops closed" value={t.loopsClosed} tone="text-emerald-600" />
      </div>

      <Card title="My referrals by status">
        <div className="flex flex-wrap gap-2">
          {m.byStatus.length === 0 ? <Empty>No referrals yet.</Empty> : m.byStatus.map((s) => (
            <Badge key={s.status} className="bg-slate-100 text-slate-700 ring-slate-300">
              {humanStatus(s.status)}: {s.n}
            </Badge>
          ))}
        </div>
      </Card>

      <p className="text-xs leading-relaxed text-slate-400">
        Facility-wide analytics and patient feedback are handled by your hospital's
        IT/quality administrator — this view stays limited to your own work.
      </p>
    </div>
  );
}

/** The headline loop-closure panel shared by the clinician and analytics views. */
function LoopRatePanel({ label, value, tone, footnote, progress, children }) {
  return (
    <section className="relative overflow-hidden rounded-2xl bg-white p-5 shadow-erl-md ring-1 ring-brand-200/60">
      <span aria-hidden className="absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r from-brand-300 via-brand-500 to-brand-300" />
      <SectionLabel>{label}</SectionLabel>
      <p className={`erl-nums mt-2 text-4xl font-semibold leading-none tracking-[-0.04em] sm:text-5xl ${tone}`}>
        {value === null || value === undefined ? '—' : `${value}%`}
      </p>
      {progress != null && (
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-200">
          <div
            className="h-full rounded-full bg-gradient-to-r from-brand-400 to-brand-600 transition-all duration-700"
            style={{ width: `${Math.min(progress, 100)}%` }}
          />
        </div>
      )}
      {footnote && <p className="mt-3 text-sm leading-relaxed text-slate-500">{footnote}</p>}
      {children}
    </section>
  );
}

/** One ward's live bed count. */
function WardTile({ label, free, total, stale, ago, onClick }) {
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag
      onClick={onClick}
      className={`rounded-xl bg-slate-50 p-3.5 text-left ring-1 ring-slate-200/70 transition ${
        onClick ? 'hover:bg-brand-50 hover:ring-brand-300' : ''
      }`}
    >
      <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-500">{label}</p>
      <p className="erl-nums mt-1 text-xl font-semibold leading-none tracking-[-0.03em] text-slate-900">
        {free}<span className="text-sm font-normal text-slate-400">/{total}</span>
      </p>
      <p className={`mt-1 text-xs ${stale ? 'font-medium text-ember-700' : 'text-slate-500'}`}>
        {ago}{stale && ' · stale'}
      </p>
    </Tag>
  );
}

/* --------- liaison / triage: their own facility's live queue and beds */
function FacilityOpsDashboard({ m }) {
  const q = m.queue;
  return (
    <div className="mx-auto max-w-4xl space-y-5 p-4 py-6 sm:p-6">
      <PageHead
        eyebrow="Live queue"
        title="Facility operations"
        lede={`${m.viewer.facilityName} — your live referral workload.`}
      />

      {q.awaitingAssignment > 0 && (
        <Notice tone="warn" icon={<Icon name="clock" />}>
          <p className="font-semibold">
            {q.awaitingAssignment} referral{q.awaitingAssignment === 1 ? '' : 's'} waiting at reception
          </p>
          <p className="mt-0.5">
            Assign a clinician so someone is responsible — no doctor can open these cases until you do.
          </p>
          <Link to="/referrals" className="mt-2 inline-block font-semibold text-ember-700 underline underline-offset-4">
            Open the inbound queue →
          </Link>
        </Notice>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Awaiting assignment" value={q.awaitingAssignment}
              tone={q.awaitingAssignment > 0 ? 'text-ember-600' : 'text-slate-900'}
              sub="nobody responsible yet" />
        <Stat label="Inbound awaiting decision" value={q.inboundAwaitingDecision}
              tone={q.inboundAwaitingDecision > 0 ? 'text-brand-700' : 'text-slate-900'} />
        <Stat label="Escalated (SLA breached)" value={q.inboundEscalated}
              tone={q.inboundEscalated > 0 ? 'text-danger-600' : 'text-slate-900'} />
        <Stat label="Accepted, awaiting arrival" value={q.acceptedAwaitingArrival} />
        <Stat label="In transit to us" value={q.inTransit} />
        <Stat label="Outcomes due" value={q.outcomesDue}
              tone={q.outcomesDue > 0 ? 'text-ember-600' : 'text-slate-900'} />
        <Stat label="Beds reserved" value={q.bedsReserved} sub="held off the board" />
        <Stat label="Our outbound awaiting" value={q.outboundAwaiting} />
        <Stat label="Outcomes to acknowledge" value={q.outboundToAcknowledge}
              tone={q.outboundToAcknowledge > 0 ? 'text-ember-600' : 'text-slate-900'} />
      </div>

      <Card title="Bed availability" subtitle="Update these on the Availability tab — routing uses exactly this data">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {m.capacity.length === 0 ? <Empty>No wards reported.</Empty> : m.capacity.map((c) => (
            <WardTile key={c.ward_type}
                      label={humanCode(c.ward_type)}
                      free={c.beds_free} total={c.beds_total}
                      ago={timeAgo(c.reported_at)} />
          ))}
        </div>
      </Card>

      <p className="text-xs leading-relaxed text-slate-400">
        Network-wide analytics and patient feedback are not part of this view.
      </p>
    </div>
  );
}

/* --------- IT admin (own facility) and health bureaus (network flow) */
function AnalyticsDashboard({ m }) {
  const closure = m.loopClosureRatePct;
  const tone = closure === null ? 'text-slate-400'
    : closure >= 60 ? 'text-emerald-600' : closure >= 30 ? 'text-ember-600' : 'text-danger-600';
  const oi = m.overrideInsights;
  const isIT = m.scope === 'it_facility_detail';

  return (
    <div className="mx-auto max-w-5xl space-y-5 p-4 py-6 sm:p-6">
      <PageHead
        eyebrow={isIT ? 'Facility analytics' : 'Network flow'}
        title={isIT ? 'Facility analytics' : 'Network dashboard'}
        lede={isIT
          ? `${m.facilityName} — detailed analytics and patient feedback for your hospital only.`
          : 'Referral flow across the network. Clinical records and patient feedback are not shown here.'}
      />

      <LoopRatePanel
        label="North star · loop-closure rate"
        value={closure}
        tone={tone}
        progress={closure || 0}
        footnote={`Baseline ${m.benchmark.loopClosureBaselinePct}% · target ${m.benchmark.loopClosureTargetPct}% · ${m.totals.loopClosed} of ${m.totals.terminalCountable} closed referrals`}
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Referrals" value={m.totals.totalReferrals} sub={`${m.totals.emergencyCount} emergency`} />
        <Stat label="Median time to accept"
              value={m.medianMinutesToAcknowledge === null ? '—' : `${m.medianMinutesToAcknowledge} min`}
              target={`target <${m.benchmark.timeToAcceptTargetMinutes} min`} />
        <Stat label="Arrival confirmed"
              value={m.arrivalConfirmationRatePct === null ? '—' : `${m.arrivalConfirmationRatePct}%`}
              target={`target ${m.benchmark.arrivalConfirmationTargetPct}%`} />
        <Stat label="Acceptance rate"
              value={m.acceptanceRatePct === null ? '—' : `${m.acceptanceRatePct}%`} />
        <Stat label="Pre-referral vitals complete"
              value={m.preReferralCompletenessPct === null ? '—' : `${m.preReferralCompletenessPct}%`}
              target={`baseline ${m.benchmark.preReferralCompletenessBaselinePct}%`} />
        <Stat label="Outcomes awaiting acknowledgement" value={m.totals.outcomesAwaitingAck}
              tone={m.totals.outcomesAwaitingAck > 0 ? 'text-ember-600' : 'text-slate-900'} />
        <Stat label="SLA breaches" value={m.totals.slaBreaches}
              tone={m.totals.slaBreaches > 0 ? 'text-danger-600' : 'text-slate-900'} />
        <Stat label="Overdue outcomes" value={m.totals.overdueOutcomes}
              tone={m.totals.overdueOutcomes > 0 ? 'text-ember-600' : 'text-slate-900'}
              sub="due within 72 h" />
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <Card title="Why referrals are declined" subtitle="The capacity-planning gold mine">
          {m.declineReasons.length === 0 ? <Empty>No declines recorded.</Empty> : (
            <ul className="space-y-3">
              {m.declineReasons.map((d) => {
                const max = Math.max(...m.declineReasons.map((x) => x.n));
                return (
                  <li key={d.decline_reason}>
                    <div className="flex justify-between gap-3 text-sm">
                      <span className="text-slate-700">{humanCode(d.decline_reason)}</span>
                      <span className="erl-nums shrink-0 font-semibold text-slate-900">{d.n}</span>
                    </div>
                    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-200">
                      <div className="h-full rounded-full bg-ember-500"
                           style={{ width: `${(d.n / max) * 100}%` }} />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        {/* BR-13 data, put to work: every override reason a doctor records
            feeds this panel, so the routing engine's blind spots are visible. */}
        <Card title="Routing override intelligence"
              subtitle="When doctors bypass the top suggestion, the reasons they record show what routing can't see yet">
          {(!oi || oi.overridden === 0) ? <Empty>No overrides recorded.</Empty> : (
            <>
              <p className="text-sm leading-relaxed text-slate-600">
                <span className="text-lg font-semibold text-slate-900">{oi.overrideRatePct ?? 0}%</span> of routed
                referrals overrode the top suggestion ({oi.overridden} of {oi.totalWithSuggestion}).
              </p>
              <ul className="mt-4 space-y-3">
                {oi.reasons.map((d) => {
                  const max = Math.max(...oi.reasons.map((x) => x.n));
                  return (
                    <li key={d.override_reason}>
                      <div className="flex justify-between gap-3 text-sm">
                        <span className="text-slate-700">{humanCode(d.override_reason)}</span>
                        <span className="erl-nums shrink-0 font-semibold text-slate-900">{d.n}</span>
                      </div>
                      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-200">
                        <div className="h-full rounded-full bg-violet-500"
                             style={{ width: `${(d.n / max) * 100}%` }} />
                      </div>
                    </li>
                  );
                })}
              </ul>
              <p className="mt-4 rounded-xl bg-violet-50 p-3 text-xs leading-relaxed text-violet-900 ring-1 ring-violet-200">
                {overrideAdvice(oi.reasons)}
              </p>
            </>
          )}
        </Card>

        {isIT && <FacilityFeedbackPanel />}

        <Card title="Referral flow">
          {m.flow.length === 0 ? <Empty>No flow yet.</Empty> : (
            <ul className="space-y-2 text-sm">
              {m.flow.slice(0, 8).map((fl, i) => (
                <li key={i} className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2">
                  <span className="truncate text-slate-600">{fl.source}</span>
                  <span aria-hidden className="shrink-0 text-brand-400">→</span>
                  <span className="truncate text-slate-600">{fl.target}</span>
                  <span className="erl-nums ml-auto shrink-0 font-semibold text-slate-900">{fl.n}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Card title="Status breakdown">
        <div className="flex flex-wrap gap-2">
          {m.byStatus.map((s) => (
            <Badge key={s.status} className="bg-slate-100 text-slate-700 ring-slate-300">
              {humanStatus(s.status)}: {s.n}
            </Badge>
          ))}
        </div>
      </Card>
    </div>
  );
}

/**
 * Patient feedback — IT administrator only, own facility only.
 *
 * Each rating is shown with the linkage that makes it actionable: which
 * referral, which doctor ordered it, and between which two hospitals. Clinical
 * staff never see this panel; it is not part of any other role's dashboard.
 */
function FacilityFeedbackPanel() {
  const [fb, setFb] = useState(null);
  const [error, setError] = useState(null);
  useEffect(() => { get('/v1/feedback/my-facility').then(setFb).catch(setError); }, []);

  return (
    <Card title="Patient feedback about your hospital"
          subtitle="Visible to IT/quality administration only — linked to the referral, the ordering doctor and the hospital pair">
      {error ? <ErrorBox error={error} />
        : !fb ? <Spinner />
        : fb.count === 0 ? <Empty>No patient feedback yet.</Empty> : (
        <>
          <div className="flex flex-wrap items-center gap-4 border-b border-slate-200 pb-3.5">
            <Stars value={fb.avgRating} count={fb.count} size="text-base" />
            {fb.lowRatings > 0 && (
              <Badge className="bg-danger-100 text-danger-800 ring-danger-500/30">
                {fb.lowRatings} rating{fb.lowRatings > 1 ? 's' : ''} ≤ 2 ★ — review
              </Badge>
            )}
          </div>
          <ul className="mt-4 space-y-2.5">
            {fb.items.slice(0, 8).map((i) => (
              <li key={i.id} className="rounded-xl bg-slate-50 p-3.5 ring-1 ring-slate-200/70">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-800">
                      {i.fromFacility} → {i.toFacility}
                      <span className="ml-2 text-xs font-normal text-slate-500">
                        (rated us as the {i.facilityRole === 'origin' ? 'referring' : 'receiving'} hospital)
                      </span>
                    </p>
                    <p className="text-xs text-slate-500">
                      <span className="font-mono">{i.referralCode}</span>
                      {i.referringDoctor && <> · ordered by {i.referringDoctor}</>}
                      {i.referringDoctorLicense && <> ({i.referringDoctorLicense})</>}
                      {i.reasonCode && <> · {humanCode(i.reasonCode)}</>}
                    </p>
                    {i.comment && <p className="mt-1 text-sm text-slate-700">“{i.comment}”</p>}
                  </div>
                  <div className="shrink-0 text-right">
                    <Stars value={i.rating} showValue={false} />
                    <p className="mt-0.5 text-xs text-slate-400">{timeAgo(i.createdAt)}</p>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </Card>
  );
}

/** Turn the top override reason into a concrete planning action. */
function overrideAdvice(reasons) {
  if (!reasons?.length) return '';
  const top = reasons[0].override_reason;
  const advice = {
    transport_availability: 'Transport is driving facility choice more than clinical fit — review ambulance coverage and dispatch coordination on these corridors.',
    patient_preference: 'Patient preference dominates — share facility ratings and travel times with patients earlier so preferences and clinical fit align.',
    family_located_there: 'Family location dominates — consider it as a soft routing signal so suggestions match social reality.',
    known_specialist: 'Doctors are routing to specific specialists — the capability matrix may be too coarse; add named specialist availability.',
    previous_care_there: 'Continuity of care drives overrides — surface previous-referral history in routing suggestions.',
    suggested_facility_unreachable: 'The suggested facility is often unreachable — audit its phone lines and liaison coverage.',
    cost_considerations: 'Cost is steering referrals — flag CBHI coverage differences between candidate facilities.',
    other: 'Review the free-text notes with the top facilities to find the pattern behind these overrides.',
  };
  return advice[top] || '';
}

/* ============================================== AVAILABILITY ADMIN */
/**
 * Who updates availability, and how it stays real:
 *  - the liaison / facility admin of each facility updates beds and the
 *    capability matrix here, stamped with their name and time;
 *  - accepting a referral with a reservation decrements a real bed;
 *  - routing shows stale data with a warning, so out-of-date boards
 *    lose the facility appropriate referrals rather than mislead anyone.
 */
export function AvailabilityAdmin() {
  const user = useAuth((s) => s.user);
  const [f, setFac] = useState(null);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(null);
  const [bedEdit, setBedEdit] = useState(null); // {wardType, bedsFree, bedsTotal}

  const load = useCallback(() => {
    get(`/v1/facilities/${user.facilityId}`).then(setFac).catch(setError);
  }, [user]);
  useEffect(load, [load]);

  async function setStatus(code, status) {
    setSaving(code);
    try {
      await put(`/v1/facilities/${user.facilityId}/capabilities/${code}`, { status });
      load();
    } catch (e) { setError(e); } finally { setSaving(null); }
  }

  async function saveBeds() {
    setSaving('beds');
    try {
      await post(`/v1/facilities/${user.facilityId}/capacity`, bedEdit);
      setBedEdit(null); load();
    } catch (e) { setError(e); } finally { setSaving(null); }
  }

  if (!f) return <Spinner />;
  const groups = f.capabilities.reduce((a, c) => {
    (a[c.category] = a[c.category] || []).push(c); return a;
  }, {});

  return (
    <div className="mx-auto max-w-3xl space-y-5 p-4 py-6 sm:p-6">
      <PageHead
        eyebrow="Availability board"
        title={f.name_lat}
        lede="Routing and reservations use exactly this data. Every update is stamped with your name; stale entries lose you appropriate referrals."
      />
      <ErrorBox error={error} onDismiss={() => setError(null)} />

      <Card title="Beds" subtitle="Reservations from accepted referrals decrement these live">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {f.capacity.map((c) => (
            <WardTile
              key={c.ward_type}
              label={humanCode(c.ward_type)}
              free={c.beds_free} total={c.beds_total}
              stale={c.stale} ago={timeAgo(c.reported_at)}
              onClick={() => setBedEdit({ wardType: c.ward_type, bedsFree: c.beds_free, bedsTotal: c.beds_total })}
            />
          ))}
        </div>
        <p className="mt-3 text-xs text-slate-500">Tap a ward to report current free beds.</p>
      </Card>

      {Object.entries(groups).map(([cat, capsRows]) => (
        <Card key={cat} title={humanCode(cat)}>
          <div className="space-y-1">
            {capsRows.map((c) => (
              <div key={c.capability_code} className="flex items-center justify-between gap-3 rounded-xl p-2.5 transition hover:bg-brand-50/60">
                <div className="min-w-0">
                  <p className="truncate font-medium text-slate-800">{c.name_lat}</p>
                  <p className={`mt-0.5 text-xs ${c.stale ? 'font-medium text-ember-700' : 'text-slate-500'}`}>
                    verified {timeAgo(c.verified_at)}{c.verified_by && ` by ${c.verified_by}`}{c.stale && ' · overdue'}
                  </p>
                  {c.blocking_note && <p className="mt-0.5 text-xs font-medium text-danger-700">{c.blocking_note}</p>}
                </div>
                <Select value={c.status} disabled={saving === c.capability_code}
                        onChange={(e) => setStatus(c.capability_code, e.target.value)}
                        className="w-40 shrink-0">
                  {['available', 'degraded', 'unavailable', 'unknown'].map((s) =>
                    <option key={s} value={s}>{humanCode(s)}</option>)}
                </Select>
              </div>
            ))}
          </div>
        </Card>
      ))}

      <Modal open={!!bedEdit} title={`Report beds — ${humanCode(bedEdit?.wardType || '')} ward`} onClose={() => setBedEdit(null)}>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Beds free now" required>
              <Input type="number" inputMode="numeric" value={bedEdit?.bedsFree ?? ''}
                     onChange={(e) => setBedEdit({ ...bedEdit, bedsFree: e.target.value })} />
            </Field>
            <Field label="Total beds">
              <Input type="number" inputMode="numeric" value={bedEdit?.bedsTotal ?? ''}
                     onChange={(e) => setBedEdit({ ...bedEdit, bedsTotal: e.target.value })} />
            </Field>
          </div>
          <p className="text-xs text-slate-500">
            Reported as {user.fullName} · {new Date().toLocaleTimeString()}. Sending facilities see this immediately.
          </p>
          <Button className="w-full" onClick={saveBeds} disabled={saving === 'beds' || bedEdit?.bedsFree === ''}>
            {saving === 'beds' ? 'Saving…' : 'Update availability'}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
