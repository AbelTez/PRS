import React, { useEffect, useMemo } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth, formatDual } from './lib';
import { useT, useLabels } from './i18n';
import {
  Button, Card, ErrorBox, EmptyState, FilterChip, Page, SearchInput, Select, SkeletonRows, SlaChip,
  StatusBadge, Tabs, UrgencyBadge, UrgencyBar, Badge,
} from './ui';
import { Icon, PageHead } from './brand';
import { useWorkload } from './workspace';
import {
  LIST_VIEWS, SENDER_ROLES, OVERSIGHT_ROLES, compareByPriority, matchesQuery, matchesView, nextStep, rowSide,
} from './referrals';

/* ============================================================================
   REFERRAL WORK QUEUE
   ----------------------------------------------------------------------------
   Saved views (tabs) + search + filter chips, all kept in the URL so a view
   can be refreshed or shared. Filtering is client-side over the shared
   workload snapshot (up to 200 referrals in scope) — no API change.
   ========================================================================== */

const SORTS = {
  priority: compareByPriority,
  newest: (a, b) => new Date(b.created_at) - new Date(a.created_at),
  oldest: (a, b) => new Date(a.created_at) - new Date(b.created_at),
};

function useFilters() {
  const [params, setParams] = useSearchParams();
  const get = (k, d = '') => params.get(k) || d;
  const set = (patch) => {
    const next = new URLSearchParams(params);
    Object.entries(patch).forEach(([k, v]) => { if (v) next.set(k, v); else next.delete(k); });
    setParams(next, { replace: true });
  };
  return { get, set, params };
}

function StepTag({ step }) {
  const t = useT();
  if (!step) return null;
  const tone = {
    danger: 'bg-danger-50 text-danger-700 ring-danger-200',
    warn: 'bg-ember-50 text-ember-800 ring-ember-200',
    success: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
    brand: 'bg-brand-50 text-brand-800 ring-brand-200',
  }[step.tone];
  return (
    <span className={`inline-flex items-center gap-1 whitespace-nowrap rounded-lg px-2 py-0.5 text-xs font-semibold ring-1 ${tone}`}>
      <Icon name="arrowRight" className="h-3.5 w-3.5" />{t(`next.${step.key}`)}
    </span>
  );
}

/** Mobile / tablet card row. */
function RowCard({ r, step }) {
  const L = useLabels();
  const t = useT();
  return (
    <li>
      <Link to={`/referrals/${r.id}`}
            className="flex gap-3 rounded-2xl bg-white p-3.5 shadow-erl-xs ring-1 ring-brand-200/60 transition hover:shadow-erl-md hover:ring-brand-300">
        <UrgencyBar urgency={r.urgency} />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="flex flex-wrap items-center gap-1.5">
              {r.urgency !== 'routine' && <UrgencyBadge urgency={r.urgency} />}
              <StatusBadge status={r.status} />
            </div>
            <span className="erl-nums shrink-0 font-mono text-[11px] text-slate-400">{r.referral_code}</span>
          </div>
          <p className="mt-1.5 truncate font-semibold text-slate-900">
            {r.patientName}
            <span className="font-normal text-slate-500"> · {[L.sex(r.sex), L.age(r.patientAge)].filter(Boolean).join(', ')}</span>
          </p>
          {r.provisional_diagnosis && <p className="truncate text-sm text-slate-600">{r.provisional_diagnosis}</p>}
          <p className="mt-1 truncate text-xs text-slate-500">
            {r.origin_facility_name} <span aria-hidden className="text-brand-400">→</span> {r.target_facility_name}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <StepTag step={step} />
            <SlaChip minutes={r.slaRemainingMinutes} />
            {r.awaitingAssignment && !step && <Badge className="bg-ember-100 text-ember-700 ring-ember-500/30">{t('list.unassigned')}</Badge>}
            {r.attachmentCount > 0 && (
              <span className="inline-flex items-center gap-1 text-xs text-slate-500"><Icon name="xray" className="h-3.5 w-3.5" />{r.attachmentCount}</span>
            )}
            <span className="ml-auto text-xs text-slate-400" title={formatDual(r.created_at)}>{L.ago(r.created_at)}</span>
          </div>
        </div>
      </Link>
    </li>
  );
}

/** Desktop table: the whole row is the link target. */
function QueueTable({ rows, user }) {
  const L = useLabels();
  const t = useT();
  const nav = useNavigate();
  return (
    <div className="overflow-clip rounded-2xl bg-white shadow-erl-sm ring-1 ring-brand-200/60">
      <table className="w-full table-fixed text-left text-sm">
        <caption className="sr-only">{t('list.title')}</caption>
        <thead className="sticky top-16 z-10 border-b border-slate-200 bg-slate-50/95 text-xs font-semibold text-slate-500 backdrop-blur">
          <tr>
            <th scope="col" className="w-[30%] py-3 pl-6 pr-3">{t('list.col.patient')}</th>
            <th scope="col" className="w-[22%] px-3 py-3">{t('list.col.route')}</th>
            <th scope="col" className="w-[17%] px-3 py-3">{t('list.col.status')}</th>
            <th scope="col" className="w-[17%] px-3 py-3">{t('list.col.next')}</th>
            <th scope="col" className="w-[14%] py-3 pl-3 pr-5 text-right">{t('list.col.time')}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map(({ r, step }) => (
            <tr key={r.id}
                onClick={() => nav(`/referrals/${r.id}`)}
                className="group cursor-pointer transition hover:bg-brand-50/60">
              <td className="relative py-3 pl-6 pr-3 align-top">
                <span aria-hidden className={`absolute bottom-2 left-2 top-2 w-1 rounded-full ${r.urgency === 'emergency' ? 'bg-danger-500' : r.urgency === 'urgent' ? 'bg-ember-400' : 'bg-transparent'}`} />
                <Link to={`/referrals/${r.id}`} onClick={(e) => e.stopPropagation()}
                      className="block truncate font-semibold text-slate-900 group-hover:text-brand-800">
                  {r.patientName}
                  <span className="font-normal text-slate-500"> · {[L.sex(r.sex), L.age(r.patientAge)].filter(Boolean).join(', ')}</span>
                </Link>
                {r.provisional_diagnosis && <p className="truncate text-slate-600">{r.provisional_diagnosis}</p>}
                <div className="mt-1 flex items-center gap-2">
                  {r.urgency !== 'routine' && <UrgencyBadge urgency={r.urgency} />}
                  <span className="erl-nums font-mono text-[11px] text-slate-400">{r.referral_code}</span>
                  {r.attachmentCount > 0 && <span className="inline-flex items-center gap-0.5 text-[11px] text-slate-400"><Icon name="xray" className="h-3.5 w-3.5" />{r.attachmentCount}</span>}
                </div>
              </td>
              <td className="px-3 py-3 align-top text-xs text-slate-600">
                <p className="truncate">{r.origin_facility_name}</p>
                <p className="truncate font-semibold text-brand-700"><span aria-hidden>→ </span>{r.target_facility_name}</p>
                {r.assigned_doctor_name && <p className="mt-0.5 truncate text-slate-500">{r.assignedToMe ? t('list.assignedYou') : r.assigned_doctor_name}</p>}
              </td>
              <td className="px-3 py-3 align-top">
                <StatusBadge status={r.status} />
                {r.awaitingAssignment && rowSide(r, user) === 'target' && (
                  <p className="mt-1 text-xs font-semibold text-ember-700">{t('list.unassigned')}</p>
                )}
              </td>
              <td className="px-3 py-3 align-top">{step ? <StepTag step={step} /> : <span className="text-xs text-slate-400">—</span>}</td>
              <td className="py-3 pl-3 pr-5 text-right align-top">
                <SlaChip minutes={r.slaRemainingMinutes} />
                <p className="mt-1 text-xs text-slate-500" title={formatDual(r.created_at)}>{L.ago(r.created_at)}</p>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function ReferralList() {
  const t = useT();
  const user = useAuth((s) => s.user);
  const { referrals, error, refresh } = useWorkload();
  const f = useFilters();
  const sender = SENDER_ROLES.includes(user?.role);
  const oversight = OVERSIGHT_ROLES.includes(user?.role);
  const canAct = !oversight && user?.role !== 'it_admin';

  const view = LIST_VIEWS.includes(f.get('view')) ? f.get('view') : (canAct ? 'action' : 'active');
  const q = f.get('q');
  const dir = f.get('dir');
  const urgency = f.get('urgency');
  const assign = f.get('assign');
  const sort = SORTS[f.get('sort')] ? f.get('sort') : 'priority';

  useEffect(() => { refresh(user); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const base = useMemo(() => (referrals || []).filter((r) => {
    const side = rowSide(r, user);
    if (dir === 'inbound' && side !== 'target') return false;
    if (dir === 'outbound' && side !== 'origin') return false;
    if (urgency && r.urgency !== urgency) return false;
    if (assign === 'mine' && !r.assignedToMe) return false;
    if (assign === 'unassigned' && !r.awaitingAssignment) return false;
    return matchesQuery(r, q);
  }), [referrals, user, dir, urgency, assign, q]);

  const counts = useMemo(() => Object.fromEntries(LIST_VIEWS.map((v) => [v, base.filter((r) => matchesView(r, v, user)).length])), [base, user]);
  const rows = useMemo(() => base.filter((r) => matchesView(r, view, user))
    .sort(SORTS[sort]).map((r) => ({ r, step: nextStep(r, user) })), [base, view, sort, user]);

  const tabs = [
    ...(canAct ? [{ value: 'action', label: t('list.view.action'), count: counts.action, alert: counts.action > 0 }] : []),
    { value: 'active', label: t('list.view.active'), count: counts.active },
    { value: 'transit', label: t('list.view.transit'), count: counts.transit },
    { value: 'closed', label: t('list.view.closed'), count: counts.closed },
    { value: 'all', label: t('list.view.all'), count: counts.all },
  ];
  const anyFilter = q || dir || urgency || assign;

  return (
    <Page>
      <PageHead
        eyebrow={t('list.eyebrow')}
        title={t('list.title')}
        actions={sender && <Link to="/new" className="hidden sm:block"><Button><Icon name="plus" className="h-4 w-4" />{t('nav.newReferral')}</Button></Link>}
      />

      <Tabs items={tabs} value={view} onChange={(v) => f.set({ view: v })} label={t('list.views')} />

      <div className="space-y-3 rounded-2xl bg-white p-3 shadow-erl-xs ring-1 ring-brand-200/60 sm:p-4">
        <div className="flex flex-col gap-3 sm:flex-row">
          <SearchInput value={q} onChange={(v) => f.set({ q: v })} placeholder={t('list.search')}
                       aria-label={t('list.search')} className="flex-1" />
          <label className="flex items-center gap-2 text-sm text-slate-600 sm:w-56">
            <Icon name="sort" className="h-4.5 w-4.5 shrink-0 text-slate-400" />
            <span className="sr-only">{t('list.sort')}</span>
            <Select value={sort} onChange={(e) => f.set({ sort: e.target.value === 'priority' ? '' : e.target.value })}>
              <option value="priority">{t('list.sort.priority')}</option>
              <option value="newest">{t('list.sort.newest')}</option>
              <option value="oldest">{t('list.sort.oldest')}</option>
            </Select>
          </label>
        </div>
        <div className="flex flex-wrap items-center gap-2" role="group" aria-label={t('list.filters')}>
          {!oversight && (
            <>
              <FilterChip active={dir === 'inbound'} onClick={() => f.set({ dir: dir === 'inbound' ? '' : 'inbound' })}>{t('list.f.inbound')}</FilterChip>
              <FilterChip active={dir === 'outbound'} onClick={() => f.set({ dir: dir === 'outbound' ? '' : 'outbound' })}>{t('list.f.outbound')}</FilterChip>
              <span aria-hidden className="mx-1 h-5 w-px bg-slate-200" />
            </>
          )}
          <FilterChip tone="danger" active={urgency === 'emergency'} onClick={() => f.set({ urgency: urgency === 'emergency' ? '' : 'emergency' })}>{t('urgency.emergency')}</FilterChip>
          <FilterChip tone="ember" active={urgency === 'urgent'} onClick={() => f.set({ urgency: urgency === 'urgent' ? '' : 'urgent' })}>{t('urgency.urgent')}</FilterChip>
          <FilterChip active={urgency === 'routine'} onClick={() => f.set({ urgency: urgency === 'routine' ? '' : 'routine' })}>{t('urgency.routine')}</FilterChip>
          {canAct && (
            <>
              <span aria-hidden className="mx-1 h-5 w-px bg-slate-200" />
              {sender && <FilterChip active={assign === 'mine'} onClick={() => f.set({ assign: assign === 'mine' ? '' : 'mine' })}>{t('list.f.mine')}</FilterChip>}
              {!sender && <FilterChip tone="ember" active={assign === 'unassigned'} onClick={() => f.set({ assign: assign === 'unassigned' ? '' : 'unassigned' })}>{t('list.f.unassigned')}</FilterChip>}
            </>
          )}
          {anyFilter && (
            <button type="button" onClick={() => f.set({ q: '', dir: '', urgency: '', assign: '' })}
                    className="ml-auto text-sm font-semibold text-brand-700 hover:text-brand-800">
              {t('list.clear')}
            </button>
          )}
        </div>
      </div>

      <ErrorBox error={error} />

      {referrals === null && !error ? <SkeletonRows rows={6} /> : rows.length === 0 ? (
        <Card>
          {anyFilter ? (
            <EmptyState icon="search" title={t('list.noMatch')}
                        action={<Button variant="ghost" onClick={() => f.set({ q: '', dir: '', urgency: '', assign: '' })}>{t('list.clear')}</Button>}>
              {t('list.noMatchBody')}
            </EmptyState>
          ) : view === 'action' ? (
            <EmptyState icon="checkCircle" tone="success" title={t('home.caughtUp')}
                        action={<Button variant="ghost" onClick={() => f.set({ view: 'active' })}>{t('list.view.active')}</Button>}>
              {sender ? t('list.emptyActionSender') : t('home.caughtUpBody')}
            </EmptyState>
          ) : (
            <EmptyState icon="inbox" title={t('list.empty')}
                        action={sender && <Link to="/new"><Button>{t('nav.newReferral')}</Button></Link>} />
          )}
        </Card>
      ) : (
        <>
          <p className="text-sm text-slate-500" aria-live="polite">{t('list.showing', { count: rows.length })}</p>
          <div className="hidden lg:block"><QueueTable rows={rows} user={user} /></div>
          <ul className="space-y-2.5 lg:hidden">
            {rows.map(({ r, step }) => <RowCard key={r.id} r={r} step={step} />)}
          </ul>
          {(referrals?.length || 0) >= 200 && (
            <p className="text-center text-xs text-slate-400">{t('list.capped')}</p>
          )}
        </>
      )}
    </Page>
  );
}
