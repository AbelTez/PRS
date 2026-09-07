import React, { useState, useEffect, useCallback } from 'react';
import { Link, useParams } from 'react-router-dom';
import { get, post, put, useAuth, humanCode, humanStatus, slaLabel, timeAgo, formatDual } from './lib';
import {
  Button, Card, Field, Input, Select, Textarea, ErrorBox, Badge, Modal,
  UrgencyBadge, StatusBadge, Stat, Spinner, Empty, Stars, FileUpload, AttachmentList,
} from './ui';

/* ==================================================== REFERRAL LIST */
export function ReferralList() {
  const user = useAuth((s) => s.user);
  const senderRole = ['hew', 'doctor', 'clinician', 'specialist'].includes(user?.role);
  const isReception = ['liaison', 'triage', 'facility_admin'].includes(user?.role);
  const [dir, setDir] = useState(senderRole ? 'outbound' : 'inbound');
  const [rows, setRows] = useState(null);
  const [error, setError] = useState(null);

  const load = useCallback(() => {
    get(`/v1/referrals?direction=${dir}`).then(setRows).catch(setError);
  }, [dir]);

  useEffect(() => { load(); const t = setInterval(load, 20000); return () => clearInterval(t); }, [load]);

  const tabs = [['inbound', 'Inbound'], ['outbound', 'Outbound'], ['all', 'All']];
  // Reception is on standby for these: nobody is responsible for the patient yet.
  const unassigned = (rows || []).filter((r) => r.awaitingAssignment);

  return (
    <div className="mx-auto max-w-4xl space-y-4 p-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Referrals</h1>
        {senderRole && <Link to="/new"><Button>+ New referral</Button></Link>}
      </div>

      {isReception && unassigned.length > 0 && dir !== 'outbound' && (
        <div className="rounded-xl bg-amber-50 p-4 ring-1 ring-amber-300">
          <p className="font-semibold text-amber-900">
            {unassigned.length} referral{unassigned.length === 1 ? '' : 's'} waiting at reception
          </p>
          <p className="mt-0.5 text-sm text-amber-800">
            No clinician is responsible for {unassigned.length === 1 ? 'this patient' : 'these patients'} yet.
            Open each one and assign the doctor or specialist who should treat them.
          </p>
        </div>
      )}

      {senderRole && rows?.some((r) => r.assignedToMe) && dir !== 'outbound' && (
        <div className="rounded-xl bg-brand-50 p-4 ring-1 ring-brand-200">
          <p className="font-semibold text-brand-800">
            {rows.filter((r) => r.assignedToMe).length} case
            {rows.filter((r) => r.assignedToMe).length === 1 ? '' : 's'} assigned to you
          </p>
          <p className="mt-0.5 text-sm text-brand-700">
            Reception has made you responsible for these patients — respond as soon as you can.
          </p>
        </div>
      )}

      <div className="flex gap-1 rounded-lg bg-slate-200 p-1">
        {tabs.map(([k, l]) => (
          <button key={k} onClick={() => setDir(k)}
                  className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition
                    ${dir === k ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'}`}>
            {l}
          </button>
        ))}
      </div>

      <ErrorBox error={error} onDismiss={() => setError(null)} />

      {senderRole && dir === 'inbound' && rows?.length === 0 && (
        <p className="text-center text-sm text-slate-500">
          Inbound cases appear here once your hospital's referral reception assigns one to you.
        </p>
      )}

      {!rows ? <Spinner /> : rows.length === 0 ? (
        <Card><Empty>No referrals here yet.</Empty></Card>
      ) : (
        <div className="space-y-2">
          {rows.map((r) => {
            const sla = slaLabel(r.slaRemainingMinutes);
            return (
              <Link key={r.id} to={`/referrals/${r.id}`}
                    className="block rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200 hover:ring-brand-400">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <UrgencyBadge urgency={r.urgency} />
                      <StatusBadge status={r.status} />
                      {r.awaitingAssignment && (
                        <Badge className="bg-amber-100 text-amber-900 ring-amber-600/30">Needs assignment</Badge>
                      )}
                      {r.assignedToMe && (
                        <Badge className="bg-brand-100 text-brand-700 ring-brand-600/30">Assigned to you</Badge>
                      )}
                      {r.attachmentCount > 0 && (
                        <span className="text-xs text-slate-500" title="Attachments">🩻 {r.attachmentCount}</span>
                      )}
                    </div>
                    <p className="mt-1.5 font-semibold text-slate-900">{r.patientName} <span className="font-normal text-slate-500">· {r.sex}, {r.patientAge}</span></p>
                    <p className="truncate text-sm text-slate-600">{r.provisional_diagnosis}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      {r.origin_facility_name} → {r.target_facility_name}
                      {r.assigned_doctor_name && !r.assignedToMe && ` · ${r.assigned_doctor_name}`}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="font-mono text-xs text-slate-500">{r.referral_code}</p>
                    <p className="mt-1 text-xs text-slate-500">{timeAgo(r.created_at)}</p>
                    {sla && <p className={`mt-1 text-xs ${sla.tone}`}>{sla.text}</p>}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ============================================= SENDER IDENTITY CARD */
/** The receiving side must know exactly WHO is sending and from WHERE —
 *  full facility address and the referring clinician's registered identity. */
function SenderCard({ r }) {
  const f = r.originFacility;
  const u = r.referringUser;
  if (!f) return null;
  return (
    <Card title="Referred by" subtitle="Verified sender — registered to this facility by its IT administrator">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Clinician</p>
          <p className="mt-1 font-semibold text-slate-900">{u?.name}</p>
          {u?.title && <p className="text-sm text-slate-600">{u.title}</p>}
          <div className="mt-1 space-y-0.5 text-sm text-slate-600">
            {u?.licenseNumber && <p>MoH license: <span className="font-mono">{u.licenseNumber}</span></p>}
            {u?.role && <p>Role: {humanCode(u.role)}{u.department ? ` · ${u.department}` : ''}</p>}
            {u?.phone && <p>Direct line: <a className="font-medium text-brand-600" href={`tel:${u.phone}`}>{u.phone}</a></p>}
          </div>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Facility</p>
          <p className="mt-1 font-semibold text-slate-900">{f.name}</p>
          {f.nameAm && <p className="text-sm text-slate-600">{f.nameAm}</p>}
          <div className="mt-1 space-y-0.5 text-sm text-slate-600">
            <p>{humanCode(f.type)} · tier {f.tier}</p>
            <p>{[f.address, f.woreda, f.zone, f.region].filter(Boolean).join(', ')}</p>
            {f.poBox && f.poBox !== '—' && <p>{f.poBox}</p>}
            {f.phone && <p>Switchboard: <a className="font-medium text-brand-600" href={`tel:${f.phone}`}>{f.phone}</a></p>}
          </div>
        </div>
      </div>
    </Card>
  );
}

/* ============================================ RECEPTION ASSIGNMENT */
/**
 * The receiving hospital's reception desk decides which clinician takes the
 * case. Until that happens nobody is responsible for the patient — and no
 * clinician can open the chart — so this card is deliberately prominent while
 * the referral is unassigned.
 */
function AssignmentCard({ r, onAssigned }) {
  const [open, setOpen] = useState(false);
  const [clinicians, setClinicians] = useState(null);
  const [chosen, setChosen] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  async function openPicker() {
    setOpen(true); setError(null); setClinicians(null);
    try { setClinicians(await get(`/v1/referrals/${r.id}/assignable-clinicians`)); }
    catch (e) { setError(e); }
  }

  async function submit() {
    setBusy(true); setError(null);
    try {
      await post(`/v1/referrals/${r.id}/assign`, { doctorId: chosen, note: note || undefined });
      setOpen(false); setChosen(''); setNote('');
      onAssigned();
    } catch (e) { setError(e); } finally { setBusy(false); }
  }

  const a = r.assignment;

  return (
    <>
      <Card title="Reception & assignment"
            subtitle={a ? 'This case has a named clinician responsible for it'
              : 'Inbound referrals wait at reception until a clinician is assigned'}
            actions={r.canAssign && (
              <Button variant={a ? 'ghost' : 'primary'} onClick={openPicker}>
                {a ? 'Reassign' : 'Assign clinician'}
              </Button>
            )}>
        {a ? (
          <div className="rounded-lg bg-brand-50 p-3">
            <p className="font-semibold text-brand-800">{a.doctorName}
              {a.isMine && <Badge className="ml-2 bg-brand-600 text-white ring-brand-700">Assigned to you</Badge>}
            </p>
            <p className="mt-0.5 text-sm text-slate-600">
              Assigned by {a.assignedByName} · {timeAgo(a.assignedAt)}
            </p>
            {a.note && <p className="mt-1 text-sm text-slate-700">“{a.note}”</p>}
          </div>
        ) : (
          <div className="rounded-lg bg-amber-50 p-3 ring-1 ring-amber-200">
            <p className="font-medium text-amber-900">Awaiting assignment</p>
            <p className="text-sm text-amber-800">
              No clinician is responsible for this patient yet. Most referrals need a
              particular specialty — assign the right one so they can open the case.
            </p>
          </div>
        )}
      </Card>

      <Modal open={open} title="Assign this referral" wide onClose={() => setOpen(false)}>
        <div className="space-y-3">
          <p className="text-sm text-slate-600">
            The clinician you choose becomes responsible for this patient and is the
            only doctor who can open the chart. Reason for referral:{' '}
            <span className="font-medium">{humanCode(r.reason_code)}</span>.
          </p>
          <ErrorBox error={error} onDismiss={() => setError(null)} />
          {!clinicians ? <Spinner /> : clinicians.length === 0 ? (
            <Empty>No active clinicians are registered at this facility yet — the IT administrator adds them.</Empty>
          ) : (
            <div className="max-h-80 space-y-2 overflow-y-auto">
              {clinicians.map((c) => (
                <button key={c.id} type="button" onClick={() => setChosen(c.id)}
                        className={`w-full rounded-lg p-3 text-left ring-2 transition
                          ${chosen === c.id ? 'bg-brand-50 ring-brand-500' : 'bg-white ring-slate-200 hover:ring-slate-300'}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-900">{c.fullName}</p>
                      <p className="text-sm text-slate-600">
                        {c.title || humanCode(c.role)}{c.department ? ` · ${c.department}` : ''}
                      </p>
                      {c.licenseNumber && (
                        <p className="text-xs text-slate-500">Licence <span className="font-mono">{c.licenseNumber}</span></p>
                      )}
                    </div>
                    <span className={`shrink-0 text-xs ${c.activeCases > 4 ? 'text-amber-700' : 'text-slate-500'}`}>
                      {c.activeCases} open case{c.activeCases === 1 ? '' : 's'}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
          <Field label="Note for the clinician" hint="Why this doctor — e.g. 'on call for obstetrics tonight'">
            <Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
          </Field>
          <Button className="w-full" disabled={busy || !chosen} onClick={submit}>
            {busy ? 'Assigning…' : 'Assign and notify'}
          </Button>
        </div>
      </Modal>
    </>
  );
}

/* ================================================== REFERRAL DETAIL */
export function ReferralDetail() {
  const { id } = useParams();
  const user = useAuth((s) => s.user);
  const [r, setR] = useState(null);
  const [chain, setChain] = useState([]);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [modal, setModal] = useState(null);
  const [vocab, setVocab] = useState(null);
  const [fac, setFac] = useState([]);
  const [f, setF] = useState({});

  const load = useCallback(() => {
    get(`/v1/referrals/${id}`).then(setR).catch(setError);
    get(`/v1/referrals/${id}/chain`).then(setChain).catch(() => {});
  }, [id]);

  useEffect(() => {
    load();
    get('/v1/referrals/vocabulary').then(setVocab).catch(() => {});
    get('/v1/facilities').then(setFac).catch(() => {});
  }, [load]);

  async function act(path, body) {
    setBusy(true); setError(null);
    try { setR(await post(`/v1/referrals/${id}/${path}`, body || {})); setModal(null); setF({}); load(); }
    catch (e) { setError(e); } finally { setBusy(false); }
  }

  async function addAttachment(att) {
    setBusy(true); setError(null);
    try { await post(`/v1/referrals/${id}/attachments`, att); load(); }
    catch (e) { setError(e); } finally { setBusy(false); }
  }

  /** Content is fetched on demand — every read is audited server-side. */
  const openAttachment = (a) => get(`/v1/referrals/${id}/attachments/${a.id}`);

  // A clinician who has not been assigned the case cannot open it — explain
  // that rather than showing a bare permission error.
  if (!r && error?.status === 403) {
    const d = error.detail || {};
    return (
      <div className="mx-auto max-w-2xl space-y-4 p-4">
        <Link to="/referrals" className="text-sm text-brand-600">← All referrals</Link>
        <Card title="Not assigned to you">
          <p className="text-slate-700">
            {d.awaitingAssignment
              ? 'This referral is still with the hospital’s referral reception. A clinician has not been assigned to it yet.'
              : d.hint || 'This case has been assigned to another clinician.'}
          </p>
          <p className="mt-2 text-sm text-slate-500">
            Referrals are assigned by reception so that every patient has one clinician
            responsible for them. Ask the referral liaison if this case should be yours.
          </p>
        </Card>
      </div>
    );
  }
  if (!r) return error ? <div className="p-4"><ErrorBox error={error} /></div> : <Spinner />;
  const can = (e) => (r.allowedEvents || []).includes(e);
  const side = r.actorSide;
  const sla = slaLabel(r.slaRemainingMinutes);
  const isParty = side === 'origin' || side === 'target';

  return (
    <div className="mx-auto max-w-3xl space-y-4 p-4">
      <Link to="/referrals" className="text-sm text-brand-600">← All referrals</Link>

      <Card>
        <div className="flex flex-wrap items-center gap-2">
          <UrgencyBadge urgency={r.urgency} />
          <StatusBadge status={r.status} />
          {r.override_reason && (
            <Badge className="bg-violet-100 text-violet-800 ring-violet-600/30"
                   title="The referring clinician chose a facility other than the top routing suggestion">
              Routing overridden: {humanCode(r.override_reason)}
            </Badge>
          )}
          <span className="ml-auto font-mono text-sm text-slate-500">{r.referral_code}</span>
        </div>
        <h1 className="mt-2 text-xl font-bold">{r.patient?.name}</h1>
        <p className="text-slate-600">{r.patient?.sex}, {r.patient?.age}
          {r.patient?.isPregnant && <Badge className="ml-2 bg-pink-100 text-pink-700 ring-pink-600/30">Pregnant</Badge>}
          {r.patient?.cbhiMember && <Badge className="ml-2 bg-brand-100 text-brand-700 ring-brand-600/30">CBHI</Badge>}
        </p>
        {r.provisional_diagnosis && <p className="mt-2 text-sm text-slate-700">{r.provisional_diagnosis}</p>}
        <p className="mt-2 text-sm text-slate-500">{r.origin_facility_name} → {r.target_facility_name}</p>
        {sla && <p className={`mt-2 text-sm ${sla.tone}`}>SLA: {sla.text}</p>}
        {r.receiving_clinician_name && (
          <div className="mt-3 rounded-lg bg-brand-50 p-3 text-sm">
            <p className="font-medium text-brand-700">Receiving clinician</p>
            <p>{r.receiving_clinician_name} · {r.receiving_clinician_phone || 'no phone on file'}</p>
            {r.bed_reserved && (
              <p className="mt-1 text-xs text-brand-700">
                Bed reserved in {humanCode(r.reserved_ward_type || 'general')} ward
                {r.bed_reservation_expires_at && <> — held until {new Date(r.bed_reservation_expires_at).toLocaleString()}</>}.
                {' '}This holds a real bed on the availability board.
              </p>
            )}
          </div>
        )}
        {r.created_offline && (
          <p className="mt-2 text-xs text-slate-500">
            Created offline · synced after {r.sync_lag_minutes} min (not counted against SLA)
          </p>
        )}
      </Card>

      {/* Receiving side sees exactly who sent this and from where */}
      {side === 'target' && <SenderCard r={r} />}

      {/* Reception owns the inbound case until a clinician is named for it. */}
      {side === 'target' && (r.assignment || r.canAssign) && (
        <AssignmentCard r={r} onAssigned={load} />
      )}

      {/* ---------------- ACTIONS driven by the server's state machine */}
      <ErrorBox error={error} onDismiss={() => setError(null)} />
      {isParty && (r.allowedEvents || []).length > 0 && (
        <Card title="Actions" subtitle={`You are the ${side} facility`}>
          <div className="flex flex-wrap gap-2">
            {can('acknowledge') && side === 'target' &&
              <Button variant="ghost" onClick={() => act('acknowledge')} disabled={busy}>Acknowledge</Button>}
            {can('accept') && side === 'target' &&
              <Button onClick={() => setModal('accept')} disabled={busy}>Accept</Button>}
            {can('decline') && side === 'target' &&
              <Button variant="danger" onClick={() => setModal('decline')} disabled={busy}>Decline</Button>}
            {can('redirect') && side === 'target' &&
              <Button variant="ghost" onClick={() => setModal('redirect')} disabled={busy}>Redirect</Button>}
            {can('reroute') && side === 'origin' &&
              <Button variant="ember" onClick={() => setModal('reroute')} disabled={busy}>Reroute elsewhere</Button>}
            {can('depart') && side === 'origin' &&
              <Button onClick={() => setModal('depart')} disabled={busy}>Mark departed</Button>}
            {can('arrive') && side === 'target' &&
              <Button onClick={() => act('arrive', { arrivalMethod: 'code_entry' })} disabled={busy}>Confirm arrival</Button>}
            {can('start_care') && side === 'target' &&
              <Button variant="ghost" onClick={() => act('start-care')} disabled={busy}>Start care</Button>}
            {can('submit_outcome') && side === 'target' &&
              <Button onClick={() => setModal('outcome')} disabled={busy}>Submit outcome</Button>}
            {can('acknowledge_outcome') && side === 'origin' &&
              <Button onClick={() => act('acknowledge-outcome')} disabled={busy}>
                Acknowledge outcome — closes the loop
              </Button>}
            {can('cancel') && side === 'origin' &&
              <Button variant="ghost" onClick={() => act('cancel')} disabled={busy}>Cancel</Button>}
          </div>
        </Card>
      )}

      {/* ---------------- ATTACHMENTS (imaging & documents) */}
      {!r.clinicalRedacted && (
        <Card title="Imaging & documents"
              subtitle="X-ray, MRI, ultrasound, lab reports — travel with the referral so nothing is repeated">
          <AttachmentList attachments={r.attachments} onOpen={openAttachment} />
          {isParty && !r.status.startsWith('CLOSED_') && (
            <div className={r.attachments?.length ? 'mt-3' : ''}>
              <FileUpload onAdd={addAttachment} disabled={busy} />
            </div>
          )}
          {!r.attachments?.length && !isParty && <Empty>No attachments.</Empty>}
        </Card>
      )}

      {/* ---------------- CLINICAL */}
      {!r.clinicalRedacted && (
        <Card title="Clinical detail">
          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-3">
            {Object.entries(r.clinical || {}).filter(([, v]) => v !== null && v !== undefined && v !== '')
              .map(([k, v]) => (
                <div key={k}>
                  <dt className="text-xs uppercase tracking-wide text-slate-500">{humanCode(k)}</dt>
                  <dd className="font-medium">{String(v)}</dd>
                </div>
              ))}
          </dl>
          {r.pre_referral?.stabilisationGiven?.length > 0 && (
            <div className="mt-3">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Pre-referral stabilisation</p>
              <ul className="mt-1 list-inside list-disc text-sm text-slate-700">
                {r.pre_referral.stabilisationGiven.map((s) => <li key={s}>{s}</li>)}
              </ul>
            </div>
          )}
          {r.pre_referral?.treatmentGiven && (
            <p className="mt-2 text-sm"><span className="text-slate-500">Treatment given: </span>{r.pre_referral.treatmentGiven}</p>
          )}
        </Card>
      )}
      {r.clinicalRedacted && (
        <Card><p className="text-sm text-slate-500">
          Clinical detail is not shown for oversight roles — you see flow and timing, not the chart (BR-51).
        </p></Card>
      )}

      {r.outcome && !r.clinicalRedacted && (
        <Card title="Outcome">
          <p className="font-medium">{r.outcome.finalDiagnosis}</p>
          <p className="text-sm text-slate-600">Disposition: {humanCode(r.outcome.disposition)}</p>
          {r.outcome.treatmentProvided && <p className="mt-2 text-sm">{r.outcome.treatmentProvided}</p>}
          {r.outcome.followUpInstructions && (
            <div className="mt-2 rounded-lg bg-brand-50 p-3 text-sm">
              <p className="font-medium text-brand-700">Follow-up</p>
              <p>{r.outcome.followUpInstructions}</p>
            </div>
          )}
        </Card>
      )}

      {/* Patient feedback is deliberately NOT rendered for clinical roles.
          The server only returns it to the facility's IT administrator, who
          sees it on their dashboard — see docs/PROJECT_STATE.md § visibility. */}
      {r.feedback?.length > 0 && (
        <Card title="Patient feedback (IT/quality view)"
              subtitle="Shown because you are administering this facility">
          <div className="space-y-2">
            {r.feedback.map((fb) => (
              <div key={fb.id} className="flex items-start justify-between gap-3 rounded-lg bg-slate-50 p-3">
                <div>
                  <p className="text-sm font-medium text-slate-800">
                    Rated us as the {fb.facility_role === 'origin' ? 'referring' : 'receiving'} hospital
                  </p>
                  {fb.comment && <p className="text-sm text-slate-600">“{fb.comment}”</p>}
                </div>
                <Stars value={fb.rating} showValue={false} />
              </div>
            ))}
          </div>
        </Card>
      )}

      {chain.length > 1 && (
        <Card title="Referral chain">
          <ol className="space-y-1 text-sm">
            {chain.map((c) => (
              <li key={c.id} className={c.id === r.id ? 'font-semibold' : 'text-slate-600'}>
                <span className="font-mono text-xs">{c.referral_code}</span> · {c.target_facility_name} · {humanStatus(c.status)}
              </li>
            ))}
          </ol>
        </Card>
      )}

      <Card title="Audit trail">
        <ol className="space-y-2">
          {(r.transitions || []).map((t, i) => (
            <li key={i} className="flex gap-3 text-sm">
              <span className="w-24 shrink-0 text-xs text-slate-500">{timeAgo(t.occurred_at)}</span>
              <span>
                <span className="font-medium">{humanCode(t.event)}</span>
                {t.to_status && t.to_status !== t.from_status && <span className="text-slate-500"> → {humanStatus(t.to_status)}</span>}
                <span className="block text-xs text-slate-500">
                  {t.actor_user_name}{t.reason_code && ` · ${humanCode(t.reason_code)}`}
                </span>
                {t.note && <span className="block text-xs text-slate-600">{t.note}</span>}
              </span>
            </li>
          ))}
        </ol>
      </Card>

      {/* ------------------------------------------------- MODALS */}
      <Modal open={modal === 'accept'} title="Accept referral" onClose={() => setModal(null)}>
        <div className="space-y-3">
          <Field label="Receiving clinician"><Input value={f.receivingClinicianName || ''}
                 onChange={(e) => setF({ ...f, receivingClinicianName: e.target.value })} /></Field>
          <Field label="Contact phone"><Input value={f.receivingClinicianPhone || ''}
                 onChange={(e) => setF({ ...f, receivingClinicianPhone: e.target.value })} /></Field>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" className="h-5 w-5 rounded" checked={!!f.bedReserved}
                   onChange={(e) => setF({ ...f, bedReserved: e.target.checked })} />
            Reserve a bed — takes a real bed off the availability board
          </label>
          {f.bedReserved && (
            <Field label="Ward">
              <Select value={f.wardType || 'general'} onChange={(e) => setF({ ...f, wardType: e.target.value })}>
                {['general', 'maternity', 'paediatric', 'icu'].map((w) =>
                  <option key={w} value={w}>{humanCode(w)}</option>)}
              </Select>
            </Field>
          )}
          <Button className="w-full" onClick={() => act('accept', f)} disabled={busy}>Accept</Button>
        </div>
      </Modal>

      <Modal open={modal === 'decline'} title="Decline referral" onClose={() => setModal(null)}>
        <div className="space-y-3">
          <p className="text-sm text-slate-600">
            A reason is required. Free-text declines destroy the analytics that make capacity planning possible.
          </p>
          <Field label="Reason" required>
            <Select value={f.declineReason || ''} onChange={(e) => setF({ ...f, declineReason: e.target.value })}>
              <option value="">Select…</option>
              {vocab?.declineReasons?.map((d) => <option key={d} value={d}>{humanCode(d)}</option>)}
            </Select>
          </Field>
          <Field label="Note"><Textarea rows={2} value={f.declineNote || ''}
                 onChange={(e) => setF({ ...f, declineNote: e.target.value })} /></Field>
          <Button variant="danger" className="w-full" disabled={busy || !f.declineReason}
                  onClick={() => act('decline', f)}>Decline</Button>
        </div>
      </Modal>

      <Modal open={modal === 'redirect' || modal === 'reroute'}
             title={modal === 'redirect' ? 'Redirect to another facility' : 'Reroute this referral'}
             onClose={() => setModal(null)}>
        <div className="space-y-3">
          <Field label="Facility" required>
            <Select value={f.target || ''} onChange={(e) => setF({ ...f, target: e.target.value })}>
              <option value="">Select…</option>
              {fac.filter((x) => x.id !== r.target_facility_id).map((x) =>
                <option key={x.id} value={x.id}>{x.name_lat}</option>)}
            </Select>
          </Field>
          <Button className="w-full" disabled={busy || !f.target}
                  onClick={() => act(modal, modal === 'redirect'
                    ? { redirectTargetFacilityId: f.target } : { targetFacilityId: f.target })}>
            Confirm
          </Button>
        </div>
      </Modal>

      <Modal open={modal === 'depart'} title="Mark patient departed" onClose={() => setModal(null)}>
        <div className="space-y-3">
          <Field label="Transport">
            <Select value={f.transportMode || 'ambulance'}
                    onChange={(e) => setF({ ...f, transportMode: e.target.value })}>
              {vocab?.transportModes?.map((t) => <option key={t} value={t}>{humanCode(t)}</option>)}
            </Select>
          </Field>
          <Field label="Escort">
            <Select value={f.escortType || 'none'} onChange={(e) => setF({ ...f, escortType: e.target.value })}>
              {['none', 'hew', 'nurse', 'family'].map((t) => <option key={t} value={t}>{humanCode(t)}</option>)}
            </Select>
          </Field>
          <Button className="w-full" onClick={() => act('depart', f)} disabled={busy}>Confirm departure</Button>
        </div>
      </Modal>

      <Modal open={modal === 'outcome'} title="Submit outcome" wide onClose={() => setModal(null)}>
        <div className="space-y-3">
          <Field label="Final diagnosis" required><Input value={f.finalDiagnosis || ''}
                 onChange={(e) => setF({ ...f, finalDiagnosis: e.target.value })} /></Field>
          <Field label="Disposition" required>
            <Select value={f.disposition || ''} onChange={(e) => setF({ ...f, disposition: e.target.value })}>
              <option value="">Select…</option>
              {vocab?.dispositions?.map((d) => <option key={d} value={d}>{humanCode(d)}</option>)}
            </Select>
          </Field>
          <Field label="Treatment provided"><Textarea rows={2} value={f.treatmentProvided || ''}
                 onChange={(e) => setF({ ...f, treatmentProvided: e.target.value })} /></Field>
          <Field label="Follow-up instructions" hint="Shown to the patient in their portal and sent by SMS">
            <Textarea rows={2} value={f.followUpInstructions || ''}
                      onChange={(e) => setF({ ...f, followUpInstructions: e.target.value })} />
          </Field>
          <Button className="w-full" disabled={busy || !f.finalDiagnosis || !f.disposition}
                  onClick={() => act('outcome', { outcome: { ...f, followUpRequired: !!f.followUpInstructions } })}>
            Return outcome to {r.origin_facility_name}
          </Button>
        </div>
      </Modal>
    </div>
  );
}

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
    <div className="mx-auto max-w-4xl space-y-4 p-4">
      <div>
        <h1 className="text-xl font-bold">My referrals</h1>
        <p className="text-sm text-slate-500">
          {m.viewer.name} · {m.viewer.facilityName} — cases assigned to you, and referrals you sent.
        </p>
      </div>

      {/* Cases reception made this clinician responsible for. */}
      {a && (a.open > 0 || a.total > 0) && (
        <Card title="Assigned to you"
              subtitle="Cases the referral reception has made you responsible for">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label="Open cases" value={a.open}
                  tone={a.open > 0 ? 'text-brand-700' : 'text-slate-900'} />
            <Stat label="Need your response" value={a.needsResponse}
                  tone={a.needsResponse > 0 ? 'text-red-600' : 'text-slate-900'}
                  sub="accept or decline" />
            <Stat label="Open emergencies" value={a.openEmergencies}
                  tone={a.openEmergencies > 0 ? 'text-red-600' : 'text-slate-900'} />
            <Stat label="Outcomes due" value={a.outcomesDue}
                  tone={a.outcomesDue > 0 ? 'text-amber-600' : 'text-slate-900'} />
          </div>
          {a.needsResponse > 0 && (
            <Link to="/referrals" className="mt-3 inline-block text-sm font-medium text-brand-700 underline">
              Respond now →
            </Link>
          )}
        </Card>
      )}

      <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">My loop-closure rate</p>
        <p className={`mt-1 text-4xl font-bold ${m.myLoopClosureRatePct >= 60 ? 'text-emerald-600' : 'text-slate-900'}`}>
          {m.myLoopClosureRatePct === null ? '—' : `${m.myLoopClosureRatePct}%`}
        </p>
        <p className="mt-1 text-sm text-slate-500">
          {t.loopsClosed} of your closed referrals came back with an acknowledged outcome.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Stat label="Referrals sent" value={t.sent} sub={`${t.emergencies} emergency`} />
        <Stat label="Awaiting response" value={t.awaitingResponse}
              tone={t.awaitingResponse > 0 ? 'text-blue-600' : 'text-slate-900'} />
        <Stat label="Declined — need reroute" value={t.awaitingReroute}
              tone={t.awaitingReroute > 0 ? 'text-red-600' : 'text-slate-900'} />
        <Stat label="Outcomes to acknowledge" value={t.outcomesToAcknowledge}
              tone={t.outcomesToAcknowledge > 0 ? 'text-amber-600' : 'text-slate-900'}
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

      <p className="text-xs text-slate-400">
        Facility-wide analytics and patient feedback are handled by your hospital's
        IT/quality administrator — this view stays limited to your own work.
      </p>
    </div>
  );
}

/* --------- liaison / triage: their own facility's live queue and beds */
function FacilityOpsDashboard({ m }) {
  const q = m.queue;
  return (
    <div className="mx-auto max-w-4xl space-y-4 p-4">
      <div>
        <h1 className="text-xl font-bold">Facility operations</h1>
        <p className="text-sm text-slate-500">{m.viewer.facilityName} — your live referral workload.</p>
      </div>

      {q.awaitingAssignment > 0 && (
        <div className="rounded-xl bg-amber-50 p-4 ring-1 ring-amber-300">
          <p className="font-semibold text-amber-900">
            {q.awaitingAssignment} referral{q.awaitingAssignment === 1 ? '' : 's'} waiting at reception
          </p>
          <p className="mt-0.5 text-sm text-amber-800">
            Assign a clinician so someone is responsible — no doctor can open these cases until you do.
          </p>
          <Link to="/referrals" className="mt-2 inline-block text-sm font-medium text-amber-900 underline">
            Open the inbound queue →
          </Link>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Awaiting assignment" value={q.awaitingAssignment}
              tone={q.awaitingAssignment > 0 ? 'text-amber-600' : 'text-slate-900'}
              sub="nobody responsible yet" />
        <Stat label="Inbound awaiting decision" value={q.inboundAwaitingDecision}
              tone={q.inboundAwaitingDecision > 0 ? 'text-blue-600' : 'text-slate-900'} />
        <Stat label="Escalated (SLA breached)" value={q.inboundEscalated}
              tone={q.inboundEscalated > 0 ? 'text-red-600' : 'text-slate-900'} />
        <Stat label="Accepted, awaiting arrival" value={q.acceptedAwaitingArrival} />
        <Stat label="In transit to us" value={q.inTransit} />
        <Stat label="Outcomes due" value={q.outcomesDue}
              tone={q.outcomesDue > 0 ? 'text-amber-600' : 'text-slate-900'} />
        <Stat label="Beds reserved" value={q.bedsReserved} sub="held off the board" />
        <Stat label="Our outbound awaiting" value={q.outboundAwaiting} />
        <Stat label="Outcomes to acknowledge" value={q.outboundToAcknowledge}
              tone={q.outboundToAcknowledge > 0 ? 'text-amber-600' : 'text-slate-900'} />
      </div>

      <Card title="Bed availability" subtitle="Update these on the Availability tab — routing uses exactly this data">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {m.capacity.length === 0 ? <Empty>No wards reported.</Empty> : m.capacity.map((c) => (
            <div key={c.ward_type} className="rounded-lg bg-slate-50 p-3">
              <p className="text-xs uppercase text-slate-500">{humanCode(c.ward_type)}</p>
              <p className="text-lg font-bold">{c.beds_free}<span className="text-sm font-normal text-slate-500">/{c.beds_total}</span></p>
              <p className="text-xs text-slate-500">{timeAgo(c.reported_at)}</p>
            </div>
          ))}
        </div>
      </Card>

      <p className="text-xs text-slate-400">
        Network-wide analytics and patient feedback are not part of this view.
      </p>
    </div>
  );
}

/* --------- IT admin (own facility) and health bureaus (network flow) */
function AnalyticsDashboard({ m }) {
  const closure = m.loopClosureRatePct;
  const tone = closure === null ? 'text-slate-400'
    : closure >= 60 ? 'text-emerald-600' : closure >= 30 ? 'text-amber-600' : 'text-red-600';
  const oi = m.overrideInsights;
  const isIT = m.scope === 'it_facility_detail';

  return (
    <div className="mx-auto max-w-5xl space-y-4 p-4">
      <div>
        <h1 className="text-xl font-bold">{isIT ? 'Facility analytics' : 'Network dashboard'}</h1>
        <p className="text-sm text-slate-500">
          {isIT
            ? `${m.facilityName} — detailed analytics and patient feedback for your hospital only.`
            : 'Referral flow across the network. Clinical records and patient feedback are not shown here.'}
        </p>
      </div>

      <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">North star · loop-closure rate</p>
        <p className={`mt-1 text-5xl font-bold ${tone}`}>{closure === null ? '—' : `${closure}%`}</p>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200">
          <div className="h-full bg-brand-500 transition-all" style={{ width: `${Math.min(closure || 0, 100)}%` }} />
        </div>
        <p className="mt-2 text-sm text-slate-500">
          Baseline {m.benchmark.loopClosureBaselinePct}% · target {m.benchmark.loopClosureTargetPct}% ·
          {' '}{m.totals.loopClosed} of {m.totals.terminalCountable} closed referrals
        </p>
      </div>

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
              tone={m.totals.outcomesAwaitingAck > 0 ? 'text-amber-600' : 'text-slate-900'} />
        <Stat label="SLA breaches" value={m.totals.slaBreaches}
              tone={m.totals.slaBreaches > 0 ? 'text-red-600' : 'text-slate-900'} />
        <Stat label="Overdue outcomes" value={m.totals.overdueOutcomes}
              tone={m.totals.overdueOutcomes > 0 ? 'text-amber-600' : 'text-slate-900'}
              sub="due within 72 h" />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card title="Why referrals are declined" subtitle="The capacity-planning gold mine">
          {m.declineReasons.length === 0 ? <Empty>No declines recorded.</Empty> : (
            <ul className="space-y-2">
              {m.declineReasons.map((d) => {
                const max = Math.max(...m.declineReasons.map((x) => x.n));
                return (
                  <li key={d.decline_reason}>
                    <div className="flex justify-between text-sm">
                      <span>{humanCode(d.decline_reason)}</span>
                      <span className="font-semibold">{d.n}</span>
                    </div>
                    <div className="mt-1 h-1.5 rounded-full bg-slate-200">
                      <div className="h-full rounded-full bg-ember-500" style={{ width: `${(d.n / max) * 100}%` }} />
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
              <p className="text-sm text-slate-600">
                <span className="text-lg font-bold text-slate-900">{oi.overrideRatePct ?? 0}%</span> of routed
                referrals overrode the top suggestion ({oi.overridden} of {oi.totalWithSuggestion}).
              </p>
              <ul className="mt-3 space-y-2">
                {oi.reasons.map((d) => {
                  const max = Math.max(...oi.reasons.map((x) => x.n));
                  return (
                    <li key={d.override_reason}>
                      <div className="flex justify-between text-sm">
                        <span>{humanCode(d.override_reason)}</span>
                        <span className="font-semibold">{d.n}</span>
                      </div>
                      <div className="mt-1 h-1.5 rounded-full bg-slate-200">
                        <div className="h-full rounded-full bg-violet-500" style={{ width: `${(d.n / max) * 100}%` }} />
                      </div>
                    </li>
                  );
                })}
              </ul>
              <p className="mt-3 rounded-lg bg-violet-50 p-2 text-xs text-violet-900 ring-1 ring-violet-200">
                {overrideAdvice(oi.reasons)}
              </p>
            </>
          )}
        </Card>

        {isIT && <FacilityFeedbackPanel />}

        <Card title="Referral flow">
          {m.flow.length === 0 ? <Empty>No flow yet.</Empty> : (
            <ul className="space-y-1.5 text-sm">
              {m.flow.slice(0, 8).map((fl, i) => (
                <li key={i} className="flex justify-between gap-2">
                  <span className="truncate text-slate-600">{fl.source} → {fl.target}</span>
                  <span className="shrink-0 font-semibold">{fl.n}</span>
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
          <div className="flex flex-wrap items-center gap-4 border-b border-slate-100 pb-3">
            <Stars value={fb.avgRating} count={fb.count} size="text-base" />
            {fb.lowRatings > 0 && (
              <Badge className="bg-red-100 text-red-800 ring-red-600/30">
                {fb.lowRatings} rating{fb.lowRatings > 1 ? 's' : ''} ≤ 2 ★ — review
              </Badge>
            )}
          </div>
          <ul className="mt-3 space-y-3">
            {fb.items.slice(0, 8).map((i) => (
              <li key={i.id} className="rounded-lg bg-slate-50 p-3">
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
    <div className="mx-auto max-w-3xl space-y-4 p-4">
      <div>
        <h1 className="text-xl font-bold">{f.name_lat}</h1>
        <p className="text-sm text-slate-500">
          Availability board — routing and reservations use exactly this data.
          Every update is stamped with your name; stale entries lose you appropriate referrals.
        </p>
      </div>
      <ErrorBox error={error} onDismiss={() => setError(null)} />

      <Card title="Beds" subtitle="Reservations from accepted referrals decrement these live">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {f.capacity.map((c) => (
            <button key={c.ward_type} onClick={() => setBedEdit({ wardType: c.ward_type, bedsFree: c.beds_free, bedsTotal: c.beds_total })}
                    className="rounded-lg bg-slate-50 p-3 text-left ring-1 ring-transparent hover:ring-brand-400">
              <p className="text-xs uppercase text-slate-500">{humanCode(c.ward_type)}</p>
              <p className="text-lg font-bold">{c.beds_free}<span className="text-sm font-normal text-slate-500">/{c.beds_total}</span></p>
              <p className={`text-xs ${c.stale ? 'text-amber-700' : 'text-slate-500'}`}>
                {timeAgo(c.reported_at)}{c.stale && ' · stale'}
              </p>
            </button>
          ))}
        </div>
        <p className="mt-2 text-xs text-slate-500">Tap a ward to report current free beds.</p>
      </Card>

      {Object.entries(groups).map(([cat, capsRows]) => (
        <Card key={cat} title={humanCode(cat)}>
          <div className="space-y-2">
            {capsRows.map((c) => (
              <div key={c.capability_code} className="flex items-center justify-between gap-3 rounded-lg p-2 hover:bg-slate-50">
                <div className="min-w-0">
                  <p className="truncate font-medium text-slate-800">{c.name_lat}</p>
                  <p className={`text-xs ${c.stale ? 'text-amber-700' : 'text-slate-500'}`}>
                    verified {timeAgo(c.verified_at)}{c.verified_by && ` by ${c.verified_by}`}{c.stale && ' · overdue'}
                  </p>
                  {c.blocking_note && <p className="text-xs text-red-700">{c.blocking_note}</p>}
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
