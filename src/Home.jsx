import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { get, post, useAuth, toEthiopian, humanCode } from './lib';
import { useT, useLabels, useLang } from './i18n';
import {
  Button, Card, ErrorBox, EmptyState, KpiTile, Page, SkeletonRows, SlaChip, UrgencyBar, UrgencyBadge,
  StatusBadge, Badge, toast,
} from './ui';
import { Icon } from './brand';
import { useWorkload, summarize } from './workspace';
import { SENDER_ROLES, RECEPTION_ROLES, CLINICAL_ROLES } from './referrals';

/* ============================================================================
   HOME — "what needs me now"
   ----------------------------------------------------------------------------
   One page, composed per role from the shared workload snapshot:
     senders    → action inbox · awaiting response · consultation invites
     reception  → action inbox (unassigned first) · expected arrivals · beds
     IT admin   → accounts awaiting verification (inline verify)
   ========================================================================== */

function Greeting({ user }) {
  const t = useT();
  const L = useLabels();
  const lang = useLang((s) => s.lang);
  const h = new Date().getHours();
  const part = h < 12 ? 'morning' : h < 18 ? 'afternoon' : 'evening';
  const first = (user?.fullName || '').replace(/^(Dr|Sr)\.?\s+/i, '').split(' ')[0];
  const today = new Date();
  return (
    <header className="flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        <p className="text-sm font-medium text-slate-500">
          {today.toLocaleDateString(lang === 'am' ? 'am-ET' : 'en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}
          <span className="text-slate-400"> · {toEthiopian(today)}</span>
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-[-0.025em] text-slate-900 sm:text-[28px]">
          {t(`home.greeting.${part}`, { name: first })}
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          {L.role(user?.role)}{user?.facilityName ? ` · ${user.facilityName}` : ''}
        </p>
      </div>
    </header>
  );
}

/** One row of the action inbox: urgency rail, who, what, and the step label as the button. */
function ActionRow({ r, step }) {
  const L = useLabels();
  const t = useT();
  const tones = {
    danger: 'bg-danger-500 text-white hover:bg-danger-600',
    warn: 'bg-ember-500 text-white hover:bg-ember-600',
    success: 'bg-emerald-500 text-white hover:bg-emerald-600',
    brand: 'bg-brand-600 text-white hover:bg-brand-700',
  };
  return (
    <li>
      <Link to={`/referrals/${r.id}`}
            className="group flex gap-3 rounded-2xl bg-white p-3.5 shadow-erl-xs ring-1 ring-brand-200/60 transition hover:shadow-erl-md hover:ring-brand-300 sm:p-4">
        <UrgencyBar urgency={r.urgency} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            {r.urgency !== 'routine' && <UrgencyBadge urgency={r.urgency} />}
            <StatusBadge status={r.status} />
            <SlaChip minutes={r.slaRemainingMinutes} />
          </div>
          <p className="mt-1.5 truncate font-semibold text-slate-900">
            {r.patientName}
            {(r.sex || r.patientAge) && <span className="font-normal text-slate-500"> · {[L.sex(r.sex), L.age(r.patientAge)].filter(Boolean).join(', ')}</span>}
          </p>
          {r.provisional_diagnosis && <p className="truncate text-sm text-slate-600">{r.provisional_diagnosis}</p>}
          <p className="mt-1 truncate text-xs text-slate-500">
            {r.origin_facility_name} <span aria-hidden className="text-brand-400">→</span> {r.target_facility_name} · {L.ago(r.created_at)}
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end justify-between gap-2">
          <span className="erl-nums hidden font-mono text-xs text-slate-400 sm:block">{r.referral_code}</span>
          <span className={`inline-flex min-h-[36px] items-center gap-1.5 rounded-xl px-3 text-xs font-semibold shadow-erl-xs transition ${tones[step.tone]}`}>
            <span className="sr-only sm:not-sr-only">{t(`next.${step.key}`)}</span>
            <Icon name="arrowRight" className="h-4 w-4" />
          </span>
        </div>
      </Link>
    </li>
  );
}

function CompactRow({ r, right }) {
  return (
    <li>
      <Link to={`/referrals/${r.id}`} className="flex items-center gap-3 rounded-xl px-2 py-2.5 transition hover:bg-brand-50">
        <UrgencyBar urgency={r.urgency} className="h-9 self-auto" />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold text-slate-900">{r.patientName}</span>
          <span className="block truncate text-xs text-slate-500">{r.target_facility_name}</span>
        </span>
        {right}
      </Link>
    </li>
  );
}

function BedWidget() {
  const L = useLabels();
  const t = useT();
  const [beds, setBeds] = useState(null);
  useEffect(() => {
    get('/v1/analytics/overview').then((m) => setBeds(m.capacity || [])).catch(() => setBeds([]));
  }, []);
  return (
    <Card title={t('home.beds')} actions={<Link to="/availability" className="text-sm font-semibold text-brand-700 hover:text-brand-800">{t('common.update')}</Link>}>
      {!beds ? <SkeletonRows rows={1} /> : beds.length === 0 ? (
        <p className="text-sm text-slate-500">{t('home.bedsNone')}</p>
      ) : (
        <ul className="space-y-3">
          {beds.map((c) => {
            const pct = c.beds_total ? Math.round((c.beds_free / c.beds_total) * 100) : 0;
            const stale = c.reported_at && Date.now() - new Date(c.reported_at).getTime() > 4 * 3600e3;
            return (
              <li key={c.ward_type}>
                <div className="flex items-baseline justify-between gap-2 text-sm">
                  <span className="font-semibold text-slate-800">{humanCode(c.ward_type)}</span>
                  <span className="erl-nums text-slate-600"><span className="font-semibold text-slate-900">{c.beds_free}</span> / {c.beds_total} {t('home.free')}</span>
                </div>
                <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-slate-200" aria-hidden>
                  <div className={`h-full rounded-full ${c.beds_free === 0 ? 'bg-danger-500' : pct < 20 ? 'bg-ember-400' : 'bg-brand-500'}`} style={{ width: `${Math.max(pct, 3)}%` }} />
                </div>
                <p className={`mt-1 text-[11px] ${stale ? 'font-semibold text-ember-700' : 'text-slate-400'}`}>
                  {stale && <Icon name="alert" className="mr-1 inline h-3 w-3" />}{t('home.updated', { ago: L.ago(c.reported_at) })}
                </p>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}

function PendingAccounts({ users, onDone }) {
  const t = useT();
  const L = useLabels();
  const [busy, setBusy] = useState(null);
  const [error, setError] = useState(null);
  async function verify(u) {
    setBusy(u.id); setError(null);
    try { await post(`/v1/users/${u.id}/verify`); toast(t('home.verified', { name: u.fullName })); onDone(); }
    catch (e) { setError(e); } finally { setBusy(null); }
  }
  return (
    <Card title={t('home.pendingTitle')} subtitle={t('home.pendingSub')}
          actions={<Link to="/it" className="text-sm font-semibold text-brand-700 hover:text-brand-800">{t('common.viewAll')}</Link>}>
      <ErrorBox error={error} onDismiss={() => setError(null)} />
      {users.length === 0 ? (
        <EmptyState icon="checkCircle" tone="success" title={t('home.pendingNone')} />
      ) : (
        <ul className="divide-y divide-slate-200/70">
          {users.slice(0, 6).map((u) => (
            <li key={u.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
              <div className="min-w-0">
                <p className="font-semibold text-slate-900">{u.fullName} <span className="font-mono text-xs font-normal text-slate-500">{u.username}</span></p>
                <p className="text-sm text-slate-600">{L.role(u.role)}{u.licenseNumber && <> · <span className="font-mono text-xs">{u.licenseNumber}</span></>}</p>
                <p className="text-xs text-slate-400">{L.ago(u.createdAt)}</p>
              </div>
              <Button onClick={() => verify(u)} disabled={busy === u.id}>{t('home.verify')}</Button>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

export default function Home() {
  const t = useT();
  const nav = useNavigate();
  const user = useAuth((s) => s.user);
  const wl = useWorkload();
  const s = useMemo(() => summarize(wl, user), [wl.referrals, wl.consultations, wl.users, user]); // eslint-disable-line react-hooks/exhaustive-deps
  const role = user?.role;
  const sender = SENDER_ROLES.includes(role);
  const reception = RECEPTION_ROLES.includes(role);
  const isIT = role === 'it_admin';
  const loading = wl.referrals === null && !wl.error;
  const refresh = () => wl.refresh(user);

  useEffect(() => { refresh(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const kpis = isIT ? [
    { label: t('kpi.pendingAccounts'), value: s.pendingUsers.length, icon: 'userCheck', tone: 'ember', onClick: () => nav('/it') },
  ] : [
    { label: t('kpi.needsYou'), value: s.actions.length, icon: 'inbox', tone: 'brand', onClick: () => nav('/referrals?view=action') },
    reception
      ? { label: t('kpi.unassigned'), value: s.unassigned.length, icon: 'clock', tone: 'ember', onClick: () => nav('/referrals?view=action&assign=unassigned') }
      : { label: t('kpi.awaitingResponse'), value: s.awaitingResponse.length, icon: 'send', tone: 'brand', onClick: () => nav('/referrals?view=active&dir=outbound') },
    { label: t('kpi.emergencies'), value: s.emergencies.length, icon: 'ambulance', tone: 'danger', onClick: () => nav('/referrals?view=active&urgency=emergency') },
    { label: t('kpi.slaRisk'), value: s.atRisk.length, icon: 'alert', tone: 'danger', sub: t('kpi.slaRiskSub') },
  ];

  return (
    <Page>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <Greeting user={user} />
        {sender && (
          <div className="hidden gap-2 sm:flex">
            {CLINICAL_ROLES.includes(role) && <Link to="/consultations/new"><Button variant="ghost"><Icon name="message" className="h-4 w-4" />{t('home.consult')}</Button></Link>}
            <Link to="/new"><Button><Icon name="plus" className="h-4 w-4" />{t('nav.newReferral')}</Button></Link>
          </div>
        )}
      </div>

      <ErrorBox error={wl.error} />

      <section aria-label={t('home.summary')} className={`grid gap-3 ${kpis.length > 1 ? 'grid-cols-2 lg:grid-cols-4' : 'sm:grid-cols-2 lg:grid-cols-4'}`}>
        {kpis.map((k) => <KpiTile key={k.label} {...k} loading={loading && !isIT} />)}
      </section>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="min-w-0 space-y-5">
          {isIT ? (
            <PendingAccounts users={s.pendingUsers} onDone={refresh} />
          ) : (
            <section aria-labelledby="inbox-h">
              <div className="mb-3 flex items-center justify-between gap-3">
                <h2 id="inbox-h" className="text-lg font-semibold tracking-[-0.02em] text-slate-900">
                  {t('home.inbox')}
                  {s.actions.length > 0 && <span className="erl-nums ml-2 text-base font-medium text-slate-400">{s.actions.length}</span>}
                </h2>
                <Link to="/referrals?view=action" className="text-sm font-semibold text-brand-700 hover:text-brand-800">{t('common.viewAll')}</Link>
              </div>
              {loading ? <SkeletonRows rows={4} /> : s.actions.length === 0 ? (
                <Card>
                  <EmptyState icon="checkCircle" tone="success" title={t('home.caughtUp')}
                              action={<>
                                {sender && <Link to="/new"><Button>{t('nav.newReferral')}</Button></Link>}
                                <Link to="/referrals"><Button variant="ghost">{t('home.allReferrals')}</Button></Link>
                              </>}>
                    {t('home.caughtUpBody')}
                  </EmptyState>
                </Card>
              ) : (
                <ul className="space-y-2.5">
                  {s.actions.slice(0, 8).map(({ r, step }) => <ActionRow key={r.id} r={r} step={step} />)}
                </ul>
              )}
              {s.actions.length > 8 && (
                <Link to="/referrals?view=action" className="mt-3 block text-center text-sm font-semibold text-brand-700">
                  {t('home.more', { count: s.actions.length - 8 })}
                </Link>
              )}
            </section>
          )}
        </div>

        <aside className="min-w-0 space-y-5">
          {sender && s.invites.length > 0 && (
            <Card title={t('home.invites')}>
              <ul className="space-y-1">
                {s.invites.map((c) => (
                  <li key={c.id}>
                    <Link to={`/consultations/${c.id}`} className="flex items-start gap-3 rounded-xl px-2 py-2.5 hover:bg-brand-50">
                      <Icon name="message" className="mt-0.5 h-5 w-5 shrink-0 text-brand-600" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold text-slate-900">{c.title}</span>
                        <span className="block truncate text-xs text-slate-500">{c.requester_name} · {c.requester_facility}</span>
                      </span>
                      {c.priority === 'urgent' && <Badge className="bg-ember-100 text-ember-800 ring-ember-500/30">{t('urgency.urgent')}</Badge>}
                    </Link>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {sender && (
            <Card title={t('home.awaiting')} subtitle={t('home.awaitingSub')}>
              {loading ? <SkeletonRows rows={2} /> : s.awaitingResponse.length === 0 ? (
                <p className="text-sm text-slate-500">{t('home.awaitingNone')}</p>
              ) : (
                <ul className="-mx-2">
                  {s.awaitingResponse.slice(0, 6).map((r) => (
                    <CompactRow key={r.id} r={r} right={<SlaChip minutes={r.slaRemainingMinutes} />} />
                  ))}
                </ul>
              )}
            </Card>
          )}

          {reception && (
            <Card title={t('home.arrivals')} subtitle={t('home.arrivalsSub')}>
              {loading ? <SkeletonRows rows={2} /> : s.expectedArrivals.length === 0 ? (
                <p className="text-sm text-slate-500">{t('home.arrivalsNone')}</p>
              ) : (
                <ul className="-mx-2">
                  {s.expectedArrivals.slice(0, 6).map((r) => (
                    <CompactRow key={r.id} r={{ ...r, target_facility_name: r.origin_facility_name }} right={<StatusBadge status={r.status} />} />
                  ))}
                </ul>
              )}
            </Card>
          )}

          {reception && <BedWidget />}

          {role === 'facility_admin' && <PendingAccounts users={s.pendingUsers} onDone={refresh} />}
        </aside>
      </div>
    </Page>
  );
}
