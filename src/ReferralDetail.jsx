import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Link, useParams } from 'react-router-dom';
import { get, post, useAuth, humanCode, formatDual } from './lib';
import { useT, useLabels } from './i18n';
import {
  Button, Card, Field, Input, Select, Textarea, ErrorBox, Badge, Notice, UrgencyBadge, StatusBadge, Spinner,
  Empty, Stars, FileUpload, AttachmentList, checkCls, Page, Tabs, Sheet, ConfirmDialog, CopyButton, SlaChip,
  LifecycleStepper, Timeline, DescriptionList, VitalTile, EmptyState, Skeleton, DropdownMenu, Avatar, toast,
} from './ui';
import { Icon, IconTile, SectionLabel, FlowPulse } from './brand';
import { useWorkload } from './workspace';
import { LIFECYCLE, lifecycleState, vitalFlag, CLINICAL_ROLES, OVERSIGHT_ROLES, statusGroup } from './referrals';

/* ============================================================================
   REFERRAL CASE VIEW
   ----------------------------------------------------------------------------
   Header (who, how urgent, where) → lifecycle stepper → two columns:
     left   tabs: Overview · Documents · Chain · Activity
     right  sticky "Next step" panel: one primary action, the rest in a menu,
            destructive actions separated and confirmed.
   On phones the primary action becomes a sticky bottom bar.
   Every action is still gated by the server's `allowedEvents`.
   ========================================================================== */

/** Priority order for choosing the single primary action. */
const PRIMARY_ORDER = ['assign', 'acknowledge_outcome', 'reroute', 'accept', 'depart', 'arrive', 'start_care', 'submit_outcome', 'acknowledge', 'redirect'];
const DANGER = ['decline', 'cancel'];
const SIDE_OF = {
  acknowledge: 'target', accept: 'target', decline: 'target', redirect: 'target', arrive: 'target',
  start_care: 'target', submit_outcome: 'target', reroute: 'origin', depart: 'origin',
  acknowledge_outcome: 'origin', cancel: 'origin',
};
const ICON_OF = {
  assign: 'userCheck', acknowledge: 'check', accept: 'checkCircle', decline: 'x', redirect: 'route', reroute: 'route',
  depart: 'ambulance', arrive: 'pin', start_care: 'heartPulse', submit_outcome: 'doc', acknowledge_outcome: 'checkCircle', cancel: 'x',
};

/* ------------------------------------------------------------ SENDER CARD */
/** The receiving side must know exactly WHO is sending and from WHERE. */
function SenderSection({ r }) {
  const t = useT();
  const L = useLabels();
  const f = r.originFacility;
  const u = r.referringUser;
  if (!f) return null;
  return (
    <Card title={t('detail.referredBy')} subtitle={t('detail.referredBySub')}>
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="flex gap-3">
          <IconTile name="stethoscope" box="h-9 w-9" className="h-4.5 w-4.5" />
          <div className="min-w-0 text-sm">
            <SectionLabel>{t('detail.clinician')}</SectionLabel>
            <p className="mt-1 text-base font-semibold text-slate-900">{u?.name}</p>
            {u?.title && <p className="text-slate-600">{u.title}</p>}
            <div className="mt-1.5 space-y-0.5 text-slate-600">
              {u?.licenseNumber && <p>{t('detail.license')}: <span className="font-mono">{u.licenseNumber}</span></p>}
              {u?.role && <p>{L.role(u.role)}{u.department ? ` · ${u.department}` : ''}</p>}
              {u?.phone && (
                <a className="mt-1 inline-flex items-center gap-1.5 font-semibold text-brand-700 hover:text-brand-800" href={`tel:${u.phone}`}>
                  <Icon name="phone" className="h-4 w-4" />{u.phone}
                </a>
              )}
            </div>
          </div>
        </div>
        <div className="flex gap-3">
          <IconTile name="building" box="h-9 w-9" className="h-4.5 w-4.5" />
          <div className="min-w-0 text-sm">
            <SectionLabel>{t('detail.facility')}</SectionLabel>
            <p className="mt-1 text-base font-semibold text-slate-900">{f.name}</p>
            {f.nameAm && <p className="text-slate-600" lang="am">{f.nameAm}</p>}
            <div className="mt-1.5 space-y-0.5 text-slate-600">
              <p>{humanCode(f.type)} · {t('detail.tier', { n: f.tier })}</p>
              <p>{[f.address, f.woreda, f.zone, f.region].filter(Boolean).join(', ')}</p>
              {f.poBox && f.poBox !== '—' && <p>{f.poBox}</p>}
              {f.phone && (
                <a className="mt-1 inline-flex items-center gap-1.5 font-semibold text-brand-700 hover:text-brand-800" href={`tel:${f.phone}`}>
                  <Icon name="phone" className="h-4 w-4" />{f.phone}
                </a>
              )}
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}

/* --------------------------------------------------------- ASSIGNMENT */
/** Reception chooses the clinician responsible for an inbound case. */
function AssignSheet({ r, open, onClose, onAssigned }) {
  const t = useT();
  const L = useLabels();
  const [clinicians, setClinicians] = useState(null);
  const [chosen, setChosen] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setError(null); setClinicians(null); setChosen(''); setNote('');
    get(`/v1/referrals/${r.id}/assignable-clinicians`).then(setClinicians).catch(setError);
  }, [open, r.id]);

  async function submit() {
    setBusy(true); setError(null);
    try {
      await post(`/v1/referrals/${r.id}/assign`, { doctorId: chosen, note: note || undefined });
      const who = clinicians?.find((c) => c.id === chosen)?.fullName;
      toast(t('toast.assigned', { name: who || '' }));
      onClose(); onAssigned();
    } catch (e) { setError(e); } finally { setBusy(false); }
  }

  return (
    <Sheet open={open} onClose={onClose}
           title={r.assignment ? t('assign.reassignTitle') : t('assign.title')}
           description={<>{t('assign.body')} {t('assign.reason')}: <span className="font-medium text-slate-700">{humanCode(r.reason_code)}</span></>}
           footer={<Button className="w-full" disabled={busy || !chosen} onClick={submit}>{busy ? t('assign.busy') : t('assign.submit')}</Button>}>
      <div className="space-y-4">
        <ErrorBox error={error} onDismiss={() => setError(null)} />
        {!clinicians ? (!error && <Spinner />) : clinicians.length === 0 ? (
          <Empty>{t('assign.none')}</Empty>
        ) : (
          <div role="radiogroup" aria-label={t('assign.pick')} className="space-y-2">
            {clinicians.map((c) => (
              <button key={c.id} type="button" role="radio" aria-checked={chosen === c.id} onClick={() => setChosen(c.id)}
                      className={`flex w-full items-start gap-3 rounded-xl p-3 text-left ring-2 transition
                        ${chosen === c.id ? 'bg-brand-50 ring-brand-500' : 'bg-white ring-slate-200 hover:ring-brand-300'}`}>
                <Avatar name={c.fullName} />
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold text-slate-900">{c.fullName}</span>
                  <span className="block text-sm text-slate-600">{c.title || L.role(c.role)}{c.department ? ` · ${c.department}` : ''}</span>
                </span>
                <span className={`erl-nums shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${c.activeCases > 4 ? 'bg-ember-50 text-ember-700' : 'bg-slate-100 text-slate-600'}`}>
                  {t('assign.cases', { count: c.activeCases })}
                </span>
              </button>
            ))}
          </div>
        )}
        <Field label={t('assign.note')} hint={t('assign.noteHint')}>
          <Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
        </Field>
      </div>
    </Sheet>
  );
}

function AssignmentSummary({ r, onAssign }) {
  const t = useT();
  const L = useLabels();
  const a = r.assignment;
  return (
    <Card title={t('assign.card')}
          actions={r.canAssign && a && <Button variant="ghost" className="!min-h-[36px] !px-3" onClick={onAssign}>{t('assign.reassign')}</Button>}>
      {a ? (
        <div className="flex items-start gap-3">
          <Avatar name={a.doctorName} />
          <div className="min-w-0 text-sm">
            <p className="font-semibold text-slate-900">
              {a.doctorName}
              {a.isMine && <Badge className="ml-2 bg-brand-600 text-white ring-brand-700">{t('list.assignedYou')}</Badge>}
            </p>
            <p className="text-slate-500">{t('assign.by', { name: a.assignedByName, ago: L.ago(a.assignedAt) })}</p>
            {a.note && <p className="mt-1.5 rounded-lg bg-slate-50 px-2.5 py-1.5 text-slate-700 ring-1 ring-slate-200/70">“{a.note}”</p>}
          </div>
        </div>
      ) : (
        <p className="flex items-start gap-2 text-sm text-ember-800"><Icon name="clock" className="mt-0.5 h-4 w-4 shrink-0" />{t('assign.waiting')}</p>
      )}
    </Card>
  );
}

/* ------------------------------------------------------- NEXT STEP PANEL */
function useActions(r, side, setSheet, act, confirm) {
  const t = useT();
  const can = (e) => (r.allowedEvents || []).includes(e) && SIDE_OF[e] === side;
  const handlers = {
    assign: () => setSheet('assign'),
    accept: () => setSheet('accept'),
    decline: () => setSheet('decline'),
    redirect: () => setSheet('redirect'),
    reroute: () => setSheet('reroute'),
    depart: () => setSheet('depart'),
    submit_outcome: () => setSheet('outcome'),
    acknowledge: () => act('acknowledge', {}, 'toast.acknowledge'),
    arrive: () => act('arrive', { arrivalMethod: 'code_entry' }, 'toast.arrive'),
    start_care: () => act('start-care', {}, 'toast.start_care'),
    acknowledge_outcome: () => act('acknowledge-outcome', {}, 'toast.acknowledge_outcome'),
    cancel: () => confirm('cancel'),
  };
  const keys = [
    ...(r.canAssign && !r.assignment && side === 'target' ? ['assign'] : []),
    ...Object.keys(SIDE_OF).filter(can),
  ];
  const sorted = PRIMARY_ORDER.filter((k) => keys.includes(k));
  const primary = sorted[0] || null;
  const mk = (k) => ({ key: k, label: t(`action.${k}`), icon: ICON_OF[k], onClick: handlers[k] });
  return {
    primary: primary && mk(primary),
    secondary: sorted.slice(1).map(mk),
    danger: DANGER.filter((k) => keys.includes(k)).map(mk),
  };
}

function NextStepPanel({ r, side, actions, busy, user }) {
  const t = useT();
  const { primary, secondary, danger } = actions;
  const other = side === 'origin' ? r.target_facility_name : r.origin_facility_name;
  const closed = statusGroup(r.status) === 'closed';
  const message = primary ? t(`why.${primary.key}`, { other })
    : closed ? t('why.closed')
    : side === 'origin' || side === 'target' ? t('why.waiting', { other })
    : t('why.readonly');

  return (
    <section aria-labelledby="next-h" className="overflow-hidden rounded-2xl bg-white shadow-erl-md ring-1 ring-brand-200/60">
      <div className={`h-1 ${primary ? 'bg-gradient-to-r from-brand-400 to-brand-600' : 'bg-slate-200'}`} />
      <div className="p-4 sm:p-5">
        <p id="next-h" className="text-[11px] font-semibold uppercase tracking-[0.12em] text-brand-600">{t('detail.nextStep')}</p>
        <p className="mt-1.5 text-[15px] font-medium leading-relaxed text-slate-800">{message}</p>
        {(side === 'origin' || side === 'target') && (
          <p className="mt-1 text-xs text-slate-500">{t(side === 'origin' ? 'detail.youOrigin' : 'detail.youTarget')}</p>
        )}
        {primary && (
          <Button className="mt-4 w-full" onClick={primary.onClick} disabled={busy}>
            <Icon name={primary.icon} className="h-4.5 w-4.5" />{primary.label}
          </Button>
        )}
        {secondary.length > 0 && (
          <div className="mt-2 grid gap-2">
            {secondary.map((a) => (
              <Button key={a.key} variant="ghost" className="w-full" onClick={a.onClick} disabled={busy}>
                <Icon name={a.icon} className="h-4.5 w-4.5" />{a.label}
              </Button>
            ))}
          </div>
        )}
        {danger.length > 0 && (
          <div className="mt-4 border-t border-slate-200/80 pt-3">
            {danger.map((a) => (
              <button key={a.key} type="button" onClick={a.onClick} disabled={busy}
                      className="flex min-h-[40px] w-full items-center justify-center gap-2 rounded-xl text-sm font-semibold text-danger-700 transition hover:bg-danger-50 disabled:opacity-40">
                <Icon name={a.icon} className="h-4 w-4" />{a.label}
              </button>
            ))}
          </div>
        )}
        {CLINICAL_ROLES.includes(user?.role) && (side === 'origin' || side === 'target') && (
          <Link to={`/consultations/new?referralId=${r.id}`}
                className="mt-3 flex items-center justify-center gap-2 rounded-xl py-2 text-sm font-semibold text-brand-700 hover:bg-brand-50">
            <Icon name="message" className="h-4 w-4" />{t('detail.consult')}
          </Link>
        )}
      </div>
    </section>
  );
}

/** Phones/tablets: the primary action stays in reach while scrolling the chart. */
function MobileActionBar({ actions, busy }) {
  const t = useT();
  const { primary, secondary, danger } = actions;
  if (!primary && !secondary.length && !danger.length) return null;
  const menu = [...(primary ? secondary : secondary.slice(1)), ...(danger.length ? [null, ...danger.map((d) => ({ ...d, tone: 'danger' }))] : [])];
  const main = primary || secondary[0];
  return (
    <div className="fixed inset-x-0 bottom-[calc(64px+env(safe-area-inset-bottom))] z-30 border-t border-slate-200 bg-white/95 px-4 py-3 backdrop-blur md:bottom-0 lg:hidden">
      <div className="mx-auto flex max-w-3xl gap-2">
        {main && (
          <Button className="flex-1" onClick={main.onClick} disabled={busy}>
            <Icon name={main.icon} className="h-4.5 w-4.5" />{main.label}
          </Button>
        )}
        {menu.length > 0 && (
          <DropdownMenu align="up" items={menu}
            trigger={(p) => (
              <Button {...p} variant="ghost" aria-label={t('detail.moreActions')} className={main ? '' : 'flex-1'}>
                <Icon name="more" className="h-5 w-5" />{!main && t('detail.moreActions')}
              </Button>
            )} />
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------ OVERVIEW */
const VITAL_DEFS = [
  ['pulse', 'bpm'], ['respRate', '/min'], ['temperatureC', '°C'], ['spo2', '%'], ['muacCm', 'cm'], ['gestationalAgeWeeks', 'wk'],
];
const KNOWN_CLINICAL = new Set(['presentingComplaint', 'bpSystolic', 'bpDiastolic', ...VITAL_DEFS.map(([k]) => k)]);

function ClinicalSection({ r }) {
  const t = useT();
  const c = r.clinical || {};
  const age = r.patient?.age;
  const flagLabel = (f) => (f === 'high' ? t('vital.high') : t('vital.low'));
  const tiles = [];
  if (c.bpSystolic || c.bpDiastolic) {
    const f = vitalFlag('bpSystolic', c.bpSystolic, age) || vitalFlag('bpDiastolic', c.bpDiastolic, age);
    tiles.push(<VitalTile key="bp" label={t('vital.bp')} value={`${c.bpSystolic ?? '—'}/${c.bpDiastolic ?? '—'}`} unit="mmHg" flag={f} flagLabel={f && flagLabel(f)} />);
  }
  VITAL_DEFS.forEach(([k, unit]) => {
    if (c[k] === null || c[k] === undefined || c[k] === '') return;
    const f = vitalFlag(k, c[k], age);
    tiles.push(<VitalTile key={k} label={t(`vital.${k}`)} value={c[k]} unit={unit} flag={f} flagLabel={f && flagLabel(f)} />);
  });
  const extra = Object.entries(c).filter(([k, v]) => !KNOWN_CLINICAL.has(k) && v !== null && v !== undefined && v !== '')
    .map(([k, v]) => [humanCode(k), String(v)]);

  return (
    <Card title={t('detail.clinical')}>
      <div className="space-y-5">
        {c.presentingComplaint && (
          <div>
            <SectionLabel>{t('detail.complaint')}</SectionLabel>
            <p className="mt-1 whitespace-pre-wrap text-[15px] leading-relaxed text-slate-800">{c.presentingComplaint}</p>
          </div>
        )}
        {tiles.length > 0 && (
          <div>
            <SectionLabel>{t('detail.vitals')}</SectionLabel>
            <div className="mt-2 grid grid-cols-2 gap-2.5 sm:grid-cols-3 xl:grid-cols-4">{tiles}</div>
            {tiles.some((x) => x.props.flag) && <p className="mt-2 text-xs text-slate-500">{t('vital.note')}</p>}
          </div>
        )}
        {extra.length > 0 && <DescriptionList rows={extra} cols={3} />}
        {r.pre_referral?.stabilisationGiven?.length > 0 && (
          <div>
            <SectionLabel>{t('detail.stabilisation')}</SectionLabel>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {r.pre_referral.stabilisationGiven.map((s) => (
                <span key={s} className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-2.5 py-1 text-sm font-medium text-emerald-800 ring-1 ring-emerald-200">
                  <Icon name="check" className="h-3.5 w-3.5" />{humanCode(s)}
                </span>
              ))}
            </div>
          </div>
        )}
        {r.pre_referral?.treatmentGiven && (
          <div>
            <SectionLabel>{t('detail.treatment')}</SectionLabel>
            <p className="mt-1 text-sm text-slate-700">{r.pre_referral.treatmentGiven}</p>
          </div>
        )}
        {!c.presentingComplaint && !tiles.length && !extra.length && <p className="text-sm text-slate-500">{t('detail.noClinical')}</p>}
      </div>
    </Card>
  );
}

function OutcomeSection({ r }) {
  const t = useT();
  const o = r.outcome;
  return (
    <section className="overflow-hidden rounded-2xl bg-white shadow-erl-md ring-1 ring-emerald-200">
      <div className="flex items-center gap-2 border-b border-emerald-100 bg-emerald-50 px-4 py-3 sm:px-5">
        <Icon name="checkCircle" className="h-5 w-5 text-emerald-600" />
        <h2 className="text-[15px] font-semibold text-emerald-900">{t('detail.outcome')}</h2>
      </div>
      <div className="space-y-3 p-4 sm:p-5">
        <p className="text-base font-semibold text-slate-900">{o.finalDiagnosis}</p>
        <DescriptionList rows={[
          [t('detail.disposition'), humanCode(o.disposition)],
          [t('detail.treatmentProvided'), o.treatmentProvided],
        ]} />
        {o.followUpInstructions && (
          <div className="rounded-xl bg-brand-50 p-3.5 text-sm ring-1 ring-brand-200">
            <p className="font-semibold text-brand-800">{t('detail.followUp')}</p>
            <p className="mt-0.5 text-slate-700">{o.followUpInstructions}</p>
          </div>
        )}
      </div>
    </section>
  );
}

/* ---------------------------------------------------------------- PAGE */
export default function ReferralDetail() {
  const { id } = useParams();
  const t = useT();
  const L = useLabels();
  const user = useAuth((s) => s.user);
  const [r, setR] = useState(null);
  const [chain, setChain] = useState([]);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [sheet, setSheet] = useState(null);
  const [confirming, setConfirming] = useState(null);
  const [tab, setTab] = useState('overview');
  const [vocab, setVocab] = useState(null);
  const [fac, setFac] = useState([]);
  const [f, setF] = useState({});
  const loadVersion = useRef(0);

  const load = useCallback(() => {
    const version = ++loadVersion.current;
    get(`/v1/referrals/${id}`).then((x) => {
      if (version === loadVersion.current) { setR(x); setError(null); }
    }).catch((e) => { if (version === loadVersion.current) setError(e); });
    get(`/v1/referrals/${id}/chain`).then((x) => { if (version === loadVersion.current) setChain(x); }).catch(() => {});
  }, [id]);

  useEffect(() => {
    setR(null); setChain([]); setError(null); setTab('overview'); setSheet(null); setConfirming(null); setF({});
    load();
    get('/v1/referrals/vocabulary').then(setVocab).catch(() => {});
    get('/v1/facilities').then(setFac).catch(() => {});
    return () => { loadVersion.current++; };
  }, [load]);

  const refreshAll = () => { load(); useWorkload.getState().refresh(user); };

  async function act(path, body, toastKey) {
    setBusy(true); setError(null);
    try {
      setR(await post(`/v1/referrals/${id}/${path}`, body || {}));
      setSheet(null); setConfirming(null); setF({});
      if (toastKey) toast(t(toastKey));
      refreshAll();
    } catch (e) { setError(e); toast(t('toast.failed'), 'error'); } finally { setBusy(false); }
  }

  async function addAttachment(att) {
    setBusy(true); setError(null);
    try { await post(`/v1/referrals/${id}/attachments`, att); toast(t('toast.attached', { name: att.name })); load(); }
    catch (e) { setError(e); } finally { setBusy(false); }
  }

  /** Content is fetched on demand — every read is audited server-side. */
  const openAttachment = (a) => get(`/v1/referrals/${id}/attachments/${a.id}`);

  // BR-51: oversight and IT administration are never a clinical party, even when
  // their registered facility is the origin or target — show them a read-only view.
  const readOnly = OVERSIGHT_ROLES.includes(user?.role) || user?.role === 'it_admin';
  const side = readOnly ? 'none' : r?.actorSide;
  const actions = useActions(r || {}, side, (s) => {
    setF(s === 'depart' ? { transportMode: 'ambulance', escortType: 'none' } : {});
    setSheet(s);
  }, act, setConfirming);

  // A clinician who has not been assigned the case cannot open it — explain why.
  if (!r && error?.status === 403) {
    const d = error.detail || {};
    return (
      <Page width="narrow">
        <BackLink />
        <Card>
          <EmptyState icon="shield" tone="warn" title={t('detail.notAssigned')}
                      action={<Link to="/referrals"><Button variant="ghost">{t('detail.back')}</Button></Link>}>
            <p>{d.awaitingAssignment ? t('detail.notAssignedReception') : d.hint || t('detail.notAssignedOther')}</p>
            <p className="mt-2">{t('detail.notAssignedWhy')}</p>
          </EmptyState>
        </Card>
      </Page>
    );
  }
  if (!r) {
    return error ? <Page width="narrow"><BackLink /><ErrorBox error={error} /></Page> : (
      <Page>
        <Skeleton className="h-4 w-32" />
        <div className="space-y-3 rounded-2xl bg-white p-5 ring-1 ring-brand-200/60">
          <Skeleton className="h-5 w-40" /><Skeleton className="h-7 w-64" /><Skeleton className="h-4 w-1/2" />
        </div>
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_22rem]">
          <Skeleton className="h-64 w-full rounded-2xl" /><Skeleton className="h-48 w-full rounded-2xl" />
        </div>
      </Page>
    );
  }

  const isParty = side === 'origin' || side === 'target';
  const life = lifecycleState(r);
  const steps = LIFECYCLE.map((k) => t(`life.${k}`));
  const transitions = [...(r.transitions || [])].reverse();
  const hasActions = actions.primary || actions.secondary.length || actions.danger.length;

  const tabs = [
    { value: 'overview', label: t('detail.tab.overview') },
    ...(!r.clinicalRedacted ? [{ value: 'documents', label: t('detail.tab.documents'), count: r.attachments?.length || 0 }] : []),
    ...(chain.length > 1 ? [{ value: 'chain', label: t('detail.tab.chain'), count: chain.length }] : []),
    { value: 'activity', label: t('detail.tab.activity'), count: transitions.length },
  ];

  return (
    <Page className={hasActions ? 'pb-36 lg:pb-7' : ''}>
      <BackLink />

      {/* ------------------------------------------------ HEADER */}
      <section className="overflow-hidden rounded-2xl bg-white shadow-erl-md ring-1 ring-brand-200/60">
        <div className={`h-1 ${r.urgency === 'emergency' ? 'bg-danger-500' : r.urgency === 'urgent' ? 'bg-ember-400' : 'bg-brand-300'}`} />
        <div className="p-4 sm:p-6">
          <div className="flex flex-wrap items-center gap-1.5">
            <UrgencyBadge urgency={r.urgency} />
            <StatusBadge status={r.status} />
            <SlaChip minutes={r.slaRemainingMinutes} />
            {r.override_reason && (
              <Badge className="bg-violet-100 text-violet-800 ring-violet-500/30" title={t('detail.overrideHint')}>
                {t('detail.override')}: {humanCode(r.override_reason)}
              </Badge>
            )}
            <CopyButton value={r.referral_code} className="ml-auto" />
          </div>

          <div className="mt-3 flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
            <div className="min-w-0">
              <h1 className="text-2xl font-semibold tracking-[-0.025em] text-slate-900">{r.patient?.name}</h1>
              <p className="mt-1 flex flex-wrap items-center gap-2 text-slate-600">
                <span>{[L.sex(r.patient?.sex), L.age(r.patient?.age)].filter(Boolean).join(', ')}</span>
                {r.patient?.isPregnant && <Badge className="bg-pink-100 text-pink-700 ring-pink-600/30">{t('detail.pregnant')}</Badge>}
                {r.patient?.cbhiMember && <Badge className="bg-brand-100 text-brand-800 ring-brand-500/40">CBHI</Badge>}
              </p>
              {r.provisional_diagnosis && <p className="mt-2 max-w-2xl text-[15px] text-slate-700">{r.provisional_diagnosis}</p>}
            </div>
            <p className="text-xs text-slate-500" title={formatDual(r.created_at)}>{t('detail.created', { ago: L.ago(r.created_at) })}</p>
          </div>

          <div className="mt-4 flex flex-col gap-2 rounded-xl bg-slate-50 p-3.5 ring-1 ring-slate-200/80 sm:flex-row sm:items-center sm:gap-3">
            <span className="flex min-w-0 items-center gap-2 text-sm font-semibold text-slate-700">
              <Icon name="building" className="h-4 w-4 shrink-0 text-brand-600" />
              <span className="truncate">{r.origin_facility_name}</span>
              {side === 'origin' && <span className="shrink-0 rounded-md bg-white px-1.5 text-[11px] font-semibold text-brand-700 ring-1 ring-brand-200">{t('detail.you')}</span>}
            </span>
            <span className="hidden min-w-[3rem] flex-1 sm:block" aria-hidden><FlowPulse className="h-2 w-full" /></span>
            <Icon name="chevronDown" className="h-4 w-4 text-brand-400 sm:hidden" />
            <span className="flex min-w-0 items-center gap-2 text-sm font-semibold text-brand-700">
              <Icon name="pin" className="h-4 w-4 shrink-0" />
              <span className="truncate">{r.target_facility_name}</span>
              {side === 'target' && <span className="shrink-0 rounded-md bg-white px-1.5 text-[11px] font-semibold text-brand-700 ring-1 ring-brand-200">{t('detail.you')}</span>}
            </span>
          </div>

          <div className="mt-5 border-t border-slate-200/80 pt-5">
            <LifecycleStepper steps={steps} index={life.index} done={life.done}
                              branch={life.branch && L.status(life.branch)}
                              branchTone={['ESCALATED', 'INFO_REQUESTED', 'REDIRECTED'].includes(life.branch) ? 'ember' : 'danger'} />
          </div>

          {r.created_offline && (
            <p className="mt-4 text-xs text-slate-500">{t('detail.offline', { n: r.sync_lag_minutes })}</p>
          )}
        </div>
      </section>

      <ErrorBox error={error} onDismiss={() => setError(null)} />

      {/* ------------------------------------------------ BODY */}
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="min-w-0 space-y-4">
          <Tabs items={tabs} value={tab} onChange={setTab} label={t('detail.sections')} />

          {tab === 'overview' && (
            <div className="space-y-5" role="tabpanel">
              {r.outcome && !r.clinicalRedacted && <OutcomeSection r={r} />}
              {r.clinicalRedacted ? (
                <Notice icon={<Icon name="shield" />}>{t('detail.redacted')}</Notice>
              ) : <ClinicalSection r={r} />}
              {side === 'target' && <SenderSection r={r} />}
              {/* Patient feedback is only returned to the facility's IT administrator. */}
              {r.feedback?.length > 0 && (
                <Card title={t('detail.feedback')} subtitle={t('detail.feedbackSub')}>
                  <div className="space-y-2">
                    {r.feedback.map((fb) => (
                      <div key={fb.id} className="flex items-start justify-between gap-3 rounded-xl bg-slate-50 p-3.5 ring-1 ring-slate-200/70">
                        <div>
                          <p className="text-sm font-semibold text-slate-800">
                            {fb.facility_role === 'origin' ? t('detail.ratedOrigin') : t('detail.ratedTarget')}
                          </p>
                          {fb.comment && <p className="mt-0.5 text-sm text-slate-600">“{fb.comment}”</p>}
                        </div>
                        <Stars value={fb.rating} showValue={false} />
                      </div>
                    ))}
                  </div>
                </Card>
              )}
            </div>
          )}

          {tab === 'documents' && (
            <Card title={t('detail.documents')} subtitle={t('detail.documentsSub')}>
              <div role="tabpanel">
                <AttachmentList attachments={r.attachments} onOpen={openAttachment} />
                {isParty && !r.status.startsWith('CLOSED_') && (
                  <div className={r.attachments?.length ? 'mt-3' : ''}><FileUpload onAdd={addAttachment} disabled={busy} /></div>
                )}
                {!r.attachments?.length && !isParty && <Empty>{t('detail.noDocuments')}</Empty>}
              </div>
            </Card>
          )}

          {tab === 'chain' && (
            <Card title={t('detail.chain')} subtitle={t('detail.chainSub')}>
              <ol className="space-y-2" role="tabpanel">
                {chain.map((c, i) => (
                  <li key={c.id}>
                    <Link to={`/referrals/${c.id}`} aria-current={c.id === r.id ? 'page' : undefined}
                          className={`flex items-center gap-3 rounded-xl p-3 ring-1 transition ${c.id === r.id ? 'bg-brand-50 ring-brand-300' : 'ring-slate-200 hover:bg-slate-50'}`}>
                      <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${c.id === r.id ? 'bg-brand-600 text-white' : 'bg-brand-100 text-brand-700'}`}>{i + 1}</span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold text-slate-900">{c.target_facility_name}</span>
                        <span className="font-mono text-xs text-slate-500">{c.referral_code}</span>
                      </span>
                      <StatusBadge status={c.status} />
                    </Link>
                  </li>
                ))}
              </ol>
            </Card>
          )}

          {tab === 'activity' && (
            <Card title={t('detail.activity')} subtitle={t('detail.activitySub')}>
              <div role="tabpanel">
                {transitions.length === 0 ? <Empty>{t('detail.noActivity')}</Empty> : (
                  <Timeline items={transitions.map((x, i) => ({
                    key: i,
                    title: <>{humanCode(x.event)}{x.to_status && x.to_status !== x.from_status && <span className="font-normal text-slate-500"> → {L.status(x.to_status)}</span>}</>,
                    meta: [x.actor_user_name, x.reason_code && humanCode(x.reason_code)].filter(Boolean).join(' · '),
                    note: x.note,
                    time: x.occurred_at,
                    timeLabel: L.ago(x.occurred_at),
                    icon: ICON_OF[x.event] || 'clock',
                    tone: ['decline', 'cancel', 'sla_breach', 'grace_expiry'].includes(x.event) ? 'danger'
                      : ['acknowledge_outcome', 'accept'].includes(x.event) ? 'success' : 'brand',
                  }))} />
                )}
              </div>
            </Card>
          )}
        </div>

        {/* ------------------------------------------------ SIDE COLUMN */}
        <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start">
          <NextStepPanel r={r} side={side} actions={actions} busy={busy} user={user} />

          {side === 'target' && (r.assignment || r.canAssign) && (
            <AssignmentSummary r={r} onAssign={() => setSheet('assign')} />
          )}

          {r.receiving_clinician_name && (
            <Card title={t('detail.receiving')}>
              <div className="flex items-start gap-3 text-sm">
                <Avatar name={r.receiving_clinician_name} />
                <div className="min-w-0">
                  <p className="font-semibold text-slate-900">{r.receiving_clinician_name}</p>
                  {r.receiving_clinician_phone
                    ? <a href={`tel:${r.receiving_clinician_phone}`} className="inline-flex items-center gap-1 font-semibold text-brand-700"><Icon name="phone" className="h-3.5 w-3.5" />{r.receiving_clinician_phone}</a>
                    : <p className="text-slate-500">{t('detail.noPhone')}</p>}
                </div>
              </div>
              {r.bed_reserved && (
                <p className="mt-3 flex items-start gap-2 rounded-xl bg-brand-50 p-3 text-xs leading-relaxed text-brand-800 ring-1 ring-brand-200">
                  <Icon name="bed" className="h-4 w-4 shrink-0" />
                  <span>
                    {t('detail.bedReserved', { ward: humanCode(r.reserved_ward_type || 'general') })}
                    {r.bed_reservation_expires_at && <> {t('detail.bedUntil', { time: new Date(r.bed_reservation_expires_at).toLocaleString() })}</>}
                  </span>
                </p>
              )}
            </Card>
          )}
        </aside>
      </div>

      <MobileActionBar actions={actions} busy={busy} />

      {/* ------------------------------------------------ ACTION SHEETS */}
      {side === 'target' && <AssignSheet r={r} open={sheet === 'assign'} onClose={() => setSheet(null)} onAssigned={refreshAll} />}

      <Sheet open={sheet === 'accept'} title={t('action.accept')} description={t('sheet.acceptBody')} onClose={() => setSheet(null)}
             footer={<Button className="w-full" onClick={() => act('accept', f, 'toast.accept')} disabled={busy}>{t('action.accept')}</Button>}>
        <div className="space-y-4">
          <ErrorBox error={error} onDismiss={() => setError(null)} />
          <Field label={t('sheet.receivingClinician')}><Input value={f.receivingClinicianName || ''}
                 onChange={(e) => setF({ ...f, receivingClinicianName: e.target.value })} /></Field>
          <Field label={t('sheet.phone')}><Input type="tel" value={f.receivingClinicianPhone || ''}
                 onChange={(e) => setF({ ...f, receivingClinicianPhone: e.target.value })} /></Field>
          <label className="flex cursor-pointer items-start gap-2.5 rounded-xl bg-slate-50 p-3 text-sm ring-1 ring-slate-200/80">
            <input type="checkbox" className={`${checkCls} mt-0.5`} checked={!!f.bedReserved}
                   onChange={(e) => setF({ ...f, bedReserved: e.target.checked })} />
            <span>{t('sheet.reserveBed')}</span>
          </label>
          {f.bedReserved && (
            <Field label={t('sheet.ward')}>
              <Select value={f.wardType || 'general'} onChange={(e) => setF({ ...f, wardType: e.target.value })}>
                {['general', 'maternity', 'paediatric', 'icu'].map((w) => <option key={w} value={w}>{humanCode(w)}</option>)}
              </Select>
            </Field>
          )}
        </div>
      </Sheet>

      <Sheet open={sheet === 'decline'} title={t('action.decline')} description={t('sheet.declineBody')} onClose={() => setSheet(null)}
             footer={<Button variant="danger" className="w-full" disabled={busy || !f.declineReason} onClick={() => act('decline', f, 'toast.decline')}>{t('action.decline')}</Button>}>
        <div className="space-y-4">
          <ErrorBox error={error} onDismiss={() => setError(null)} />
          <Field label={t('sheet.reason')} required>
            <Select value={f.declineReason || ''} onChange={(e) => setF({ ...f, declineReason: e.target.value })}>
              <option value="">{t('common.select')}</option>
              {vocab?.declineReasons?.map((d) => <option key={d} value={d}>{humanCode(d)}</option>)}
            </Select>
          </Field>
          <Field label={t('sheet.note')}><Textarea rows={3} value={f.declineNote || ''}
                 onChange={(e) => setF({ ...f, declineNote: e.target.value })} /></Field>
        </div>
      </Sheet>

      <Sheet open={sheet === 'redirect' || sheet === 'reroute'} onClose={() => setSheet(null)}
             title={sheet === 'redirect' ? t('action.redirect') : t('action.reroute')}
             description={sheet === 'redirect' ? t('sheet.redirectBody') : t('sheet.rerouteBody')}
             footer={<Button className="w-full" disabled={busy || !f.target}
                             onClick={() => act(sheet, sheet === 'redirect' ? { redirectTargetFacilityId: f.target } : { targetFacilityId: f.target }, `toast.${sheet}`)}>
               {t('common.confirm')}
             </Button>}>
        <div className="space-y-4">
          <ErrorBox error={error} onDismiss={() => setError(null)} />
          <Field label={t('sheet.facility')} required>
            <Select value={f.target || ''} onChange={(e) => setF({ ...f, target: e.target.value })}>
              <option value="">{t('common.select')}</option>
              {fac.filter((x) => x.id !== r.target_facility_id).map((x) => <option key={x.id} value={x.id}>{x.name_lat}</option>)}
            </Select>
          </Field>
        </div>
      </Sheet>

      <Sheet open={sheet === 'depart'} title={t('action.depart')} description={t('sheet.departBody')} onClose={() => setSheet(null)}
             footer={<Button className="w-full" onClick={() => act('depart', f, 'toast.depart')} disabled={busy}>{t('sheet.confirmDeparture')}</Button>}>
        <div className="space-y-4">
          <ErrorBox error={error} onDismiss={() => setError(null)} />
          <Field label={t('sheet.transport')}>
            <Select value={f.transportMode || 'ambulance'} onChange={(e) => setF({ ...f, transportMode: e.target.value })}>
              {vocab?.transportModes?.map((x) => <option key={x} value={x}>{humanCode(x)}</option>)}
            </Select>
          </Field>
          <Field label={t('sheet.escort')}>
            <Select value={f.escortType || 'none'} onChange={(e) => setF({ ...f, escortType: e.target.value })}>
              {['none', 'hew', 'nurse', 'family'].map((x) => <option key={x} value={x}>{humanCode(x)}</option>)}
            </Select>
          </Field>
        </div>
      </Sheet>

      <Sheet open={sheet === 'outcome'} title={t('action.submit_outcome')} description={t('sheet.outcomeBody', { origin: r.origin_facility_name })} onClose={() => setSheet(null)}
             footer={<Button className="w-full" disabled={busy || !f.finalDiagnosis || !f.disposition}
                             onClick={() => act('outcome', { outcome: { ...f, followUpRequired: !!f.followUpInstructions } }, 'toast.submit_outcome')}>
               {t('sheet.returnOutcome', { origin: r.origin_facility_name })}
             </Button>}>
        <div className="space-y-4">
          <ErrorBox error={error} onDismiss={() => setError(null)} />
          <Field label={t('sheet.finalDiagnosis')} required><Input value={f.finalDiagnosis || ''}
                 onChange={(e) => setF({ ...f, finalDiagnosis: e.target.value })} /></Field>
          <Field label={t('sheet.disposition')} required>
            <Select value={f.disposition || ''} onChange={(e) => setF({ ...f, disposition: e.target.value })}>
              <option value="">{t('common.select')}</option>
              {vocab?.dispositions?.map((d) => <option key={d} value={d}>{humanCode(d)}</option>)}
            </Select>
          </Field>
          <Field label={t('sheet.treatmentProvided')}><Textarea rows={3} value={f.treatmentProvided || ''}
                 onChange={(e) => setF({ ...f, treatmentProvided: e.target.value })} /></Field>
          <Field label={t('sheet.followUp')} hint={t('sheet.followUpHint')}>
            <Textarea rows={3} value={f.followUpInstructions || ''} onChange={(e) => setF({ ...f, followUpInstructions: e.target.value })} />
          </Field>
        </div>
      </Sheet>

      <ConfirmDialog open={confirming === 'cancel'} tone="danger" busy={busy}
                     title={t('confirm.cancelTitle')} body={t('confirm.cancelBody', { target: r.target_facility_name })}
                     confirmLabel={t('action.cancel')} cancelLabel={t('confirm.keep')}
                     onConfirm={() => act('cancel', {}, 'toast.cancel')} onClose={() => setConfirming(null)} />
    </Page>
  );
}

function BackLink() {
  const t = useT();
  return (
    <Link to="/referrals" className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-700 transition hover:text-brand-800">
      <Icon name="arrowLeft" className="h-4 w-4" />{t('detail.back')}
    </Link>
  );
}
