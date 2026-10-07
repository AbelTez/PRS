import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { get, post, ApiError, useAuth, humanCode } from './lib';
import {
  Button, Card, Field, Input, Select, Textarea, ErrorBox, Badge, Notice,
  UrgencyBadge, Spinner, inputCls, FileUpload, AttachmentList, checkCls,
} from './ui';
import { PageHead, SectionLabel, Icon, IconTile } from './brand';

const STEPS = ['Patient', 'Clinical', 'Destination', 'Confirm'];

export default function NewReferral() {
  const nav = useNavigate();
  const user = useAuth((s) => s.user);

  const [step, setStep] = useState(0);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const [reasonCodes, setReasonCodes] = useState([]);
  const [patient, setPatient] = useState(null);
  const [search, setSearch] = useState('');
  const [results, setResults] = useState(null);

  const [form, setForm] = useState({
    givenNameLat: '', givenNameAm: '', fathersNameLat: '', grandfathersNameLat: '',
    sex: 'female', ageValue: '', ageUnit: 'years', phonePrimary: '',
    phoneOwnerRelation: 'self', cbhiMember: false, isPregnant: false,
  });

  const [clinical, setClinical] = useState({
    reasonCode: '', provisionalDiagnosis: '', presentingComplaint: '',
    bpSystolic: '', bpDiastolic: '', pulse: '', respRate: '', temperatureC: '',
    spo2: '', muacCm: '', gestationalAgeWeeks: '',
    emergencyOverride: false, emergencyOverrideReason: '',
  });
  const [stabilisation, setStabilisation] = useState([]);
  const [treatmentGiven, setTreatmentGiven] = useState('');
  const [attachments, setAttachments] = useState([]);

  const [routing, setRouting] = useState(null);
  const [chosen, setChosen] = useState(null);
  const [overrideReason, setOverrideReason] = useState('');
  const [tierSkipReason, setTierSkipReason] = useState('');
  const [vocab, setVocab] = useState(null);

  useEffect(() => {
    get('/v1/reason-codes').then(setReasonCodes).catch(() => {});
    get('/v1/referrals/vocabulary').then(setVocab).catch(() => {});
  }, []);

  const reason = reasonCodes.find((r) => r.code === clinical.reasonCode);
  const urgency = reason?.default_urgency || 'routine';

  /* --------------------------------------------------------- step 1 */
  async function doSearch() {
    setError(null);
    try { setResults(await post('/v1/patients/search', { name: search })); }
    catch (e) { setError(e); }
  }

  async function createPatient() {
    setBusy(true); setError(null);
    try {
      const p = await post('/v1/patients', {
        ...form,
        ageValue: form.ageValue ? Number(form.ageValue) : undefined,
        phonePrimary: form.phonePrimary || undefined,
      });
      setPatient(p); setStep(1);
    } catch (e) { setError(e); } finally { setBusy(false); }
  }

  /* --------------------------------------------------------- step 2 */
  async function loadRouting() {
    if (!clinical.reasonCode) { setError(new ApiError(400, { message: 'Select a reason for referral' })); return; }
    setBusy(true); setError(null);
    try {
      const r = await post('/v1/routing/suggest', {
        reasonCode: clinical.reasonCode,
        wardType: reason?.category === 'obstetric' ? 'maternity'
          : reason?.category === 'paediatric' ? 'paediatric' : 'general',
      });
      setRouting(r);
      setChosen(r.candidates[0] || null);
      setStep(2);
    } catch (e) { setError(e); } finally { setBusy(false); }
  }

  /* --------------------------------------------------------- submit */
  async function submit() {
    setBusy(true); setError(null);
    try {
      const rank = routing.candidates.findIndex((c) => c.facilityId === chosen.facilityId) + 1;
      const payload = {
        patientId: patient.id,
        reasonCode: clinical.reasonCode,
        targetFacilityId: chosen.facilityId,
        suggestedFacilityIds: routing.candidates.map((c) => c.facilityId),
        suggestionRankOfChosen: rank > 0 ? rank : undefined,
        overrideReason: rank !== 1 ? overrideReason || undefined : undefined,
        tierSkipReason: tierSkipReason || undefined,
        provisionalDiagnosis: clinical.provisionalDiagnosis,
        distanceKm: chosen.distanceKm,
        estimatedTravelMinutes: chosen.estimatedTravelMinutes,
        clinical: {
          presentingComplaint: clinical.presentingComplaint,
          bpSystolic: num(clinical.bpSystolic), bpDiastolic: num(clinical.bpDiastolic),
          pulse: num(clinical.pulse), respRate: num(clinical.respRate),
          temperatureC: num(clinical.temperatureC), spo2: num(clinical.spo2),
          muacCm: num(clinical.muacCm), gestationalAgeWeeks: num(clinical.gestationalAgeWeeks),
        },
        preReferral: { stabilisationGiven: stabilisation, treatmentGiven },
        attachments,
        emergencyOverride: clinical.emergencyOverride || undefined,
        emergencyOverrideReason: clinical.emergencyOverrideReason || undefined,
        clientCreatedAt: new Date().toISOString(),
        lawfulBasis: urgency === 'emergency' ? 'vital_interest' : 'consent',
        consentMethod: urgency === 'emergency' ? undefined : 'verbal_attested',
      };
      const r = await post('/v1/referrals', payload);
      nav(`/referrals/${r.id}`);
    } catch (e) { setError(e); setStep(2); } finally { setBusy(false); }
  }

  const num = (v) => (v === '' || v === null || v === undefined ? undefined : Number(v));

  return (
    <div className="mx-auto max-w-3xl space-y-5 p-4 py-6 sm:p-6">
      <PageHead
        eyebrow="Guided referral"
        title="New referral"
        lede={`From ${user?.facilityName}`}
      />

      {/* the wizard: connected nodes, joined by the brand rail */}
      <ol className="flex gap-2" aria-label="Referral wizard progress">
        {STEPS.map((s, i) => {
          const done = i < step;
          const current = i === step;
          return (
            <li key={s} className="flex-1">
              <div className="flex items-center gap-2">
                <span
                  aria-hidden
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold transition
                    ${current ? 'bg-brand-600 text-white ring-4 ring-brand-100'
                      : done ? 'bg-brand-200 text-brand-800'
                      : 'bg-slate-200 text-slate-500'}`}
                >
                  {done ? '✓' : i + 1}
                </span>
                {i < STEPS.length - 1 && (
                  <span
                    aria-hidden
                    className={`h-0.5 flex-1 rounded-full transition-colors ${done ? 'bg-brand-400' : 'bg-slate-200'}`}
                  />
                )}
              </div>
              <p className={`mt-1.5 truncate text-[11px] font-semibold uppercase tracking-[0.08em] ${
                current ? 'text-brand-700' : done ? 'text-brand-600' : 'text-slate-400'
              }`}>
                {s}
              </p>
            </li>
          );
        })}
      </ol>

      <ErrorBox error={error} onDismiss={() => setError(null)} />

      {/* ------------------------------------------------- STEP 1 */}
      {step === 0 && (
        <>
          <Card title="Find existing patient">
            <div className="flex gap-2">
              <Input placeholder="Name or Fayda ID" value={search}
                     onChange={(e) => setSearch(e.target.value)}
                     onKeyDown={(e) => e.key === 'Enter' && doSearch()} />
              <Button variant="ghost" onClick={doSearch}>Search</Button>
            </div>
            {results && (
              <div className="mt-4 space-y-2">
                {results.length === 0 && <p className="text-sm text-slate-500">No match — register below.</p>}
                {results.map((p) => (
                  <button key={p.id} onClick={() => { setPatient(p); setStep(1); }}
                          className="flex w-full items-center justify-between gap-3 rounded-xl bg-white p-3.5 text-left ring-1 ring-slate-200 transition hover:bg-brand-50 hover:ring-brand-300">
                    <div className="flex min-w-0 gap-3">
                      <IconTile name="people" box="h-9 w-9" className="h-4.5 w-4.5" />
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-900">
                          {p.name} {p.nameAm && <span className="font-normal text-slate-500">· {p.nameAm}</span>}
                        </p>
                        <p className="mt-0.5 text-sm text-slate-500">{p.sex}, {p.age}</p>
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      {p.requiresReview && (
                        <Badge className="bg-ember-100 text-ember-700 ring-ember-500/30">Review match</Badge>
                      )}
                      <p className="erl-nums mt-1 text-xs text-slate-400">
                        {Math.round(p.matchConfidence * 100)}% match
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </Card>

          <Card title="Register new patient" subtitle="Works fully offline; syncs when signal returns">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Given name (Latin)" required>
                <Input value={form.givenNameLat} onChange={(e) => setForm({ ...form, givenNameLat: e.target.value })} />
              </Field>
              <Field label="Given name (Amharic)">
                <Input value={form.givenNameAm} onChange={(e) => setForm({ ...form, givenNameAm: e.target.value })}
                       placeholder="ስም" />
              </Field>
              <Field label="Father's name"><Input value={form.fathersNameLat}
                     onChange={(e) => setForm({ ...form, fathersNameLat: e.target.value })} /></Field>
              <Field label="Grandfather's name"><Input value={form.grandfathersNameLat}
                     onChange={(e) => setForm({ ...form, grandfathersNameLat: e.target.value })} /></Field>
              <Field label="Sex" required>
                <Select value={form.sex} onChange={(e) => setForm({ ...form, sex: e.target.value })}>
                  <option value="female">Female</option><option value="male">Male</option>
                </Select>
              </Field>
              <div className="grid grid-cols-2 gap-2">
                <Field label="Age" required><Input type="number" value={form.ageValue}
                       onChange={(e) => setForm({ ...form, ageValue: e.target.value })} /></Field>
                <Field label="Unit">
                  <Select value={form.ageUnit} onChange={(e) => setForm({ ...form, ageUnit: e.target.value })}>
                    <option value="years">Years</option><option value="months">Months</option><option value="days">Days</option>
                  </Select>
                </Field>
              </div>
              <Field label="Phone" hint="Often a caregiver's or neighbour's — record whose">
                <Input value={form.phonePrimary} onChange={(e) => setForm({ ...form, phonePrimary: e.target.value })}
                       placeholder="+2519…" />
              </Field>
              <Field label="Phone belongs to">
                <Select value={form.phoneOwnerRelation} onChange={(e) => setForm({ ...form, phoneOwnerRelation: e.target.value })}>
                  {['self','spouse','relative','neighbour','kebele_official'].map((o) =>
                    <option key={o} value={o}>{humanCode(o)}</option>)}
                </Select>
              </Field>
            </div>
            <div className="mt-4 flex flex-wrap gap-5">
              <label className="flex cursor-pointer items-center gap-2.5 text-sm font-medium text-slate-700">
                <input type="checkbox" className={checkCls} checked={form.cbhiMember}
                       onChange={(e) => setForm({ ...form, cbhiMember: e.target.checked })} />
                CBHI member
              </label>
              <label className="flex cursor-pointer items-center gap-2.5 text-sm font-medium text-slate-700">
                <input type="checkbox" className={checkCls} checked={form.isPregnant}
                       onChange={(e) => setForm({ ...form, isPregnant: e.target.checked })} />
                Pregnant
              </label>
            </div>
            <Button className="mt-4 w-full" onClick={createPatient} disabled={busy}>
              {busy ? 'Saving…' : 'Register and continue'}
            </Button>
          </Card>
        </>
      )}

      {/* ------------------------------------------------- STEP 2 */}
      {step === 1 && (
        <>
          <Card title={`Patient: ${patient?.name}`} subtitle={`${patient?.sex}, ${patient?.age}`}
                actions={<Button variant="ghost" onClick={() => setStep(0)}>Change</Button>} />

          <Card title="Reason for referral">
            <Field label="Reason" required>
              <Select value={clinical.reasonCode}
                      onChange={(e) => { setClinical({ ...clinical, reasonCode: e.target.value }); setStabilisation([]); }}>
                <option value="">Select…</option>
                {reasonCodes.map((r) => <option key={r.code} value={r.code}>{r.name_lat}</option>)}
              </Select>
            </Field>
            {reason && (
              <div className="mt-4 rounded-xl bg-brand-50 p-3.5 ring-1 ring-brand-200">
                <div className="flex items-center gap-2">
                  <UrgencyBadge urgency={urgency} />
                  <span className="text-sm text-slate-600">auto-set from reason</span>
                </div>
                <SectionLabel className="mt-3">Required capabilities</SectionLabel>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {reason.required_capabilities.map((c) => (
                    <Badge key={c} className="bg-white text-brand-700 ring-brand-400/50">{humanCode(c)}</Badge>
                  ))}
                </div>
              </div>
            )}
            <div className="mt-4 grid gap-4">
              <Field label="Provisional diagnosis" required>
                <Input value={clinical.provisionalDiagnosis}
                       onChange={(e) => setClinical({ ...clinical, provisionalDiagnosis: e.target.value })} />
              </Field>
              <Field label="Presenting complaint">
                <Textarea rows={2} value={clinical.presentingComplaint}
                          onChange={(e) => setClinical({ ...clinical, presentingComplaint: e.target.value })} />
              </Field>
            </div>
          </Card>

          <Card title="Vitals" subtitle="Mandatory unless emergency override (BR-05)">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {[['bpSystolic','BP systolic'],['bpDiastolic','BP diastolic'],['pulse','Pulse'],
                ['respRate','Resp. rate'],['temperatureC','Temp °C'],['spo2','SpO₂ %']].map(([k, l]) => (
                <Field key={k} label={l} required={!clinical.emergencyOverride}>
                  <Input type="number" inputMode="decimal" value={clinical[k]}
                         onChange={(e) => setClinical({ ...clinical, [k]: e.target.value })} />
                </Field>
              ))}
              {reason?.category === 'obstetric' && (
                <Field label="Gestation (wks)">
                  <Input type="number" value={clinical.gestationalAgeWeeks}
                         onChange={(e) => setClinical({ ...clinical, gestationalAgeWeeks: e.target.value })} />
                </Field>
              )}
              {reason?.category === 'paediatric' && (
                <Field label="MUAC (cm)">
                  <Input type="number" value={clinical.muacCm}
                         onChange={(e) => setClinical({ ...clinical, muacCm: e.target.value })} />
                </Field>
              )}
            </div>
            <label className="mt-4 flex cursor-pointer items-start gap-2.5 rounded-xl bg-slate-50 p-3 text-sm font-medium text-slate-700 ring-1 ring-slate-200/80">
              <input type="checkbox" className={`${checkCls} mt-0.5`} checked={clinical.emergencyOverride}
                     onChange={(e) => setClinical({ ...clinical, emergencyOverride: e.target.checked })} />
              <span>Emergency override — patient too unstable to complete vitals</span>
            </label>
            {clinical.emergencyOverride && (
              <div className="mt-3">
                <Input placeholder="Reason for override (required)" value={clinical.emergencyOverrideReason}
                       onChange={(e) => setClinical({ ...clinical, emergencyOverrideReason: e.target.value })} />
                <p className="mt-1.5 text-xs font-medium leading-relaxed text-ember-700">
                  Overrides are tracked. If they exceed ~15% of routine referrals the workflow needs redesign.
                </p>
              </div>
            )}
          </Card>

          {reason?.stabilisation_items?.length > 0 && (
            <Card title="Pre-referral stabilisation" subtitle="Tailored to the reason code">
              <div className="space-y-1">
                {reason.stabilisation_items.map((item) => (
                  <label key={item}
                         className="flex cursor-pointer items-start gap-2.5 rounded-xl px-2.5 py-2 text-sm font-medium text-slate-700 transition hover:bg-brand-50/60">
                    <input type="checkbox" className={`${checkCls} mt-0.5`}
                           checked={stabilisation.includes(item)}
                           onChange={(e) => setStabilisation(e.target.checked
                             ? [...stabilisation, item] : stabilisation.filter((s) => s !== item))} />
                    <span>{item}</span>
                  </label>
                ))}
              </div>
              <div className="mt-3">
                <Field label="Treatment given (drug, dose, route, time)" hint="The receiving team restarts the workup without this">
                  <Textarea rows={2} value={treatmentGiven}
                            onChange={(e) => setTreatmentGiven(e.target.value)} />
                </Field>
              </div>
            </Card>
          )}

          <Card title="Imaging & documents"
                subtitle="Attach the X-ray, MRI, ultrasound or lab PDF — the receiving team should never repeat a test you already did">
            <AttachmentList attachments={attachments}
                            onRemove={(i) => setAttachments(attachments.filter((_, j) => j !== i))} compact />
            <div className={attachments.length ? 'mt-3' : ''}>
              <FileUpload onAdd={(a) => setAttachments((prev) => [...prev, a])} />
            </div>
          </Card>

          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => setStep(0)}>Back</Button>
            <Button className="flex-1" onClick={loadRouting} disabled={busy}>
              {busy ? 'Finding facilities…' : 'Find a facility'}
            </Button>
          </div>
        </>
      )}

      {/* ------------------------------------------------- STEP 3 */}
      {step === 2 && routing && (
        <>
          <Card title="Facilities that can treat this patient"
                subtitle={`Ranked by capability, distance, acceptance history and free beds`}>
            {routing.candidates.length === 0 && (
              <Notice tone="warn" icon={<Icon name="clock" />}>
                No facility has every required capability. Review the excluded list below and choose the best partial match.
              </Notice>
            )}
            <div className="mt-4 space-y-2.5">
              {routing.candidates.map((c, i) => (
                <button key={c.facilityId} onClick={() => setChosen(c)}
                        className={`w-full rounded-xl p-4 text-left ring-2 transition
                          ${chosen?.facilityId === c.facilityId
                            ? 'bg-brand-50 ring-brand-500'
                            : 'bg-white ring-slate-200 hover:ring-brand-300'}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 gap-3">
                      <IconTile name="building" box="h-9 w-9" className="h-4.5 w-4.5" />
                      <div className="min-w-0">
                        <p className="font-semibold tracking-[-0.015em] text-slate-900">
                          {i === 0 && <Badge className="mr-2 bg-brand-600 text-white ring-brand-700">Best match</Badge>}
                          {c.name}
                        </p>
                        <p className="mt-0.5 text-sm text-slate-600">
                          {c.distanceKm} km · ~{c.estimatedTravelMinutes} min · {humanCode(c.facilityType)}
                        </p>
                      </div>
                    </div>
                    <div className="erl-nums shrink-0 text-right text-sm">
                      <p className={`font-semibold ${c.bedsFree > 0 ? 'text-brand-700' : 'text-danger-700'}`}>
                        {c.bedsFree ?? '?'} beds free
                      </p>
                      {c.bedsStale && <p className="mt-0.5 text-xs font-medium text-ember-700">reported &gt;8 h ago</p>}
                    </div>
                  </div>
                  {/* Operational signals only. Patient feedback is not shown to
                      clinicians — it belongs to each hospital's IT/quality view. */}
                  <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-slate-200/70 pt-2.5 text-xs text-slate-500">
                    <span className="erl-nums font-medium">{Math.round(c.acceptanceRate * 100)}% acceptance</span>
                    <span aria-hidden className="text-brand-300">·</span>
                    <span className="erl-nums">{c.queueDepth} waiting</span>
                    {c.is24h && <span>· 24 h</span>}
                    {c.hasAmbulance && <span>· ambulance</span>}
                    {c.staleCapabilities.length > 0 &&
                      <span className="font-medium text-ember-700">· {c.staleCapabilities.length} capability check overdue</span>}
                  </div>
                  {c.phone && <p className="erl-nums mt-1.5 text-xs text-slate-400">{c.phone}</p>}
                </button>
              ))}
            </div>
          </Card>

          {/* This is the moat, rendered. Never hide an excluded facility. */}
          {routing.excluded.length > 0 && (
            <Card title="Not available for this patient" subtitle="Shown so you can see why, not hidden">
              <div className="space-y-2.5">
                {routing.excluded.map((c) => (
                  <div key={c.facilityId} className="rounded-xl bg-slate-50 p-3.5 ring-1 ring-slate-200/70">
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-semibold text-slate-700">{c.name}</p>
                      <p className="erl-nums shrink-0 text-sm text-slate-500">{c.distanceKm} km</p>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {c.missingCapabilities.map((m) => (
                        <Badge key={m.code} className="bg-danger-50 text-danger-800 ring-danger-200">
                          {humanCode(m.code)}: {m.status}
                        </Badge>
                      ))}
                    </div>
                    {c.missingCapabilities.find((m) => m.note) && (
                      <p className="mt-2 text-sm font-medium text-danger-700">
                        {c.missingCapabilities.find((m) => m.note).note}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </Card>
          )}

          {chosen && routing.candidates[0] && chosen.facilityId !== routing.candidates[0].facilityId && (
            <Card title="Why not the top suggestion?" subtitle="Required when overriding (BR-13)">
              <Select value={overrideReason} onChange={(e) => setOverrideReason(e.target.value)}>
                <option value="">Select a reason…</option>
                {vocab?.overrideReasons?.map((r) => <option key={r} value={r}>{humanCode(r)}</option>)}
              </Select>
            </Card>
          )}

          {chosen && chosen.tier - (user?.facilityTier || 1) > 1 && urgency !== 'emergency' && (
            <Card title="This referral skips a tier" subtitle="A reason is required (BR-01)">
              <Select value={tierSkipReason} onChange={(e) => setTierSkipReason(e.target.value)}>
                <option value="">Select a reason…</option>
                {vocab?.tierSkipReasons?.map((r) => <option key={r} value={r}>{humanCode(r)}</option>)}
              </Select>
            </Card>
          )}

          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => setStep(1)}>Back</Button>
            <Button className="flex-1" onClick={submit} disabled={busy || !chosen}
                    variant={urgency === 'emergency' ? 'danger' : 'primary'}>
              {busy ? 'Sending…' : `Send referral to ${chosen?.name || '…'}`}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
