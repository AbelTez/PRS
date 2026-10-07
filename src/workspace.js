import { useEffect } from 'react';
import { create } from 'zustand';
import { get, DEMO_MODE } from './lib';
import { nextStep, compareByPriority, slaAtRisk, ADMIN_ROLES, OVERSIGHT_ROLES } from './referrals';

/* ============================================================================
   WORKLOAD STORE
   ----------------------------------------------------------------------------
   One polled snapshot of "what is on my plate", read by the sidebar badges,
   the notifications bell, the Home page and the referral work queue — so the
   shell does not multiply requests. Uses only existing endpoints:
     GET /v1/referrals?direction=all&limit=200
     GET /v1/consultations            (consultation roles, not in demo mode)
     GET /v1/users                    (admins: pending verifications)
   Failures leave the previous snapshot in place; screens surface their own
   errors when they load explicitly.
   ========================================================================== */

const CONSULT_ROLES = ['doctor', 'clinician', 'specialist'];
const POLL_MS = 20000;

export const useWorkload = create((set, getState) => ({
  referrals: null,
  consultations: null,
  users: null,
  error: null,
  loadedAt: null,
  _inflight: null,
  _ownerId: null,
  _generation: 0,

  async refresh(user) {
    if (!user || user.role === 'patient') return;
    if (getState()._ownerId !== user.id) {
      getState().reset();
      set({ _ownerId: user.id });
    }
    if (getState()._inflight) return getState()._inflight;
    const generation = getState()._generation;
    const publish = (values) => {
      if (getState()._generation === generation && getState()._ownerId === user.id) set(values);
    };
    const run = (async () => {
      const jobs = [
        get('/v1/referrals?direction=all&limit=200')
          .then((referrals) => publish({ referrals, error: null }))
          .catch((error) => publish({ error })),
      ];
      if (CONSULT_ROLES.includes(user.role) && !DEMO_MODE) {
        jobs.push(get('/v1/consultations').then((consultations) => publish({ consultations })).catch(() => {}));
      }
      if (ADMIN_ROLES.includes(user.role)) {
        jobs.push(get('/v1/users').then((users) => publish({ users })).catch(() => {}));
      }
      await Promise.all(jobs);
      publish({ loadedAt: Date.now(), _inflight: null });
    })();
    set({ _inflight: run });
    return run;
  },

  reset() { set((state) => ({ referrals: null, consultations: null, users: null, error: null, loadedAt: null,
    _inflight: null, _ownerId: null, _generation: state._generation + 1 })); },
}));

/** Mount once in the shell: polls while the tab is visible. */
export function useWorkloadPolling(user) {
  const refresh = useWorkload((s) => s.refresh);
  useEffect(() => {
    if (!user || user.role === 'patient') return undefined;
    refresh(user);
    const t = setInterval(() => { if (!document.hidden) refresh(user); }, POLL_MS);
    const onVis = () => { if (!document.hidden) refresh(user); };
    document.addEventListener('visibilitychange', onVis);
    return () => { clearInterval(t); document.removeEventListener('visibilitychange', onVis); useWorkload.getState().reset(); };
  }, [user?.id, refresh]); // eslint-disable-line react-hooks/exhaustive-deps
}

/** Derived counts and queues. Cheap enough to compute on every render. */
export function summarize({ referrals, consultations, users }, user) {
  const rows = referrals || [];
  const actions = rows
    .map((r) => ({ r, step: nextStep(r, user) }))
    .filter((x) => x.step)
    .sort((a, b) => compareByPriority(a.r, b.r));
  const open = rows.filter((r) => !String(r.status).startsWith('CLOSED_'));
  const invites = (consultations || []).filter((c) => c.status === 'requested' && c.consultant_id === user?.id);
  const unreadConsults = (consultations || []).reduce((n, c) => n + (c.unread_count || 0), 0);
  const pendingUsers = (users || []).filter((u) => u.status === 'pending');
  return {
    actions,
    unassigned: rows.filter((r) => r.awaitingAssignment),
    emergencies: open.filter((r) => r.urgency === 'emergency'),
    atRisk: open.filter(slaAtRisk),
    awaitingResponse: open.filter((r) => r.origin_facility_id === user?.facilityId
      && ['SUBMITTED', 'ACKNOWLEDGED', 'ESCALATED', 'INFO_REQUESTED'].includes(r.status)),
    expectedArrivals: open.filter((r) => r.target_facility_id === user?.facilityId
      && ['ACCEPTED', 'IN_TRANSIT'].includes(r.status)),
    invites,
    unreadConsults,
    pendingUsers,
    isOversight: OVERSIGHT_ROLES.includes(user?.role),
  };
}
