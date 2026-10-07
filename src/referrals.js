/* ============================================================================
   REFERRAL PRESENTATION HELPERS
   ----------------------------------------------------------------------------
   Pure functions that decide how a referral is *shown*: which side the viewer
   is on, what (if anything) they should do next, which status group it belongs
   to and where it sits in the lifecycle. The server's state machine stays the
   authority — the detail screen still only offers `allowedEvents`. Nothing here
   permits an action; it only ranks and labels.
   ========================================================================== */

export const SENDER_ROLES = ['hew', 'doctor', 'clinician', 'specialist'];
export const CLINICAL_ROLES = ['doctor', 'clinician', 'specialist'];
export const RECEPTION_ROLES = ['liaison', 'triage', 'facility_admin'];
export const OVERSIGHT_ROLES = ['woreda', 'region', 'moh', 'cbhi', 'sysadmin'];
export const ADMIN_ROLES = ['it_admin', 'facility_admin', 'sysadmin'];

export const URGENCY_RANK = { emergency: 0, urgent: 1, routine: 2 };

/** waiting · active · transit · problem · closed — drives tabs and colour. */
export function statusGroup(status = '') {
  if (status.startsWith('CLOSED_')) return 'closed';
  if (status === 'IN_TRANSIT') return 'transit';
  if (['DECLINED', 'REDIRECTED', 'NOT_ARRIVED', 'ACCEPTED_LAPSED', 'ESCALATED'].includes(status)) return 'problem';
  if (['ACCEPTED', 'ARRIVED', 'IN_CARE', 'OUTCOME_RETURNED', 'REFERRED_ONWARD'].includes(status)) return 'active';
  return 'waiting';
}

/** Which side of a list row the viewer is on (the list API has no actorSide). */
export function rowSide(r, user) {
  if (!user?.facilityId) return 'none';
  if (r.target_facility_id === user.facilityId) return 'target';
  if (r.origin_facility_id === user.facilityId) return 'origin';
  return 'none';
}

/**
 * The single next step the viewer is expected to take on a list row, or null.
 * Mirrors the state machine (origin vs target actor) and the reception-first
 * rule: on the receiving side a clinician only acts on cases assigned to them.
 * Returns { key, tone } — `key` is an i18n key under `next.`.
 */
export function nextStep(r, user) {
  const role = user?.role;
  if (!role || OVERSIGHT_ROLES.includes(role) || role === 'patient' || role === 'it_admin') return null;
  const s = r.status;
  if (s?.startsWith('CLOSED_')) return null;
  const side = rowSide(r, user);
  const reception = RECEPTION_ROLES.includes(role);

  if (side === 'target') {
    if (reception && r.awaitingAssignment) return { key: 'assign', tone: 'warn' };
    if (!reception && !r.assignedToMe) return null;
    if (['SUBMITTED', 'ESCALATED', 'ACKNOWLEDGED'].includes(s)) return { key: 'decide', tone: s === 'ESCALATED' ? 'danger' : 'brand' };
    if (['ACCEPTED', 'IN_TRANSIT', 'NOT_ARRIVED'].includes(s)) return { key: 'arrival', tone: 'brand' };
    if (['ARRIVED', 'IN_CARE', 'REFERRED_ONWARD'].includes(s)) return { key: 'outcome', tone: 'brand' };
    return null;
  }
  if (side === 'origin') {
    // Reception does not own outbound clinical follow-through unless it is a facility admin.
    if (reception && role !== 'facility_admin') return null;
    if (['DECLINED', 'ACCEPTED_LAPSED'].includes(s)) return { key: 'reroute', tone: 'danger' };
    if (s === 'INFO_REQUESTED') return { key: 'info', tone: 'warn' };
    if (s === 'ACCEPTED') return { key: 'depart', tone: 'brand' };
    if (s === 'OUTCOME_RETURNED') return { key: 'ackOutcome', tone: 'success' };
  }
  return null;
}

/** Urgency first, then the tightest SLA, then newest. */
export function compareByPriority(a, b) {
  const u = (URGENCY_RANK[a.urgency] ?? 3) - (URGENCY_RANK[b.urgency] ?? 3);
  if (u) return u;
  const sa = a.slaRemainingMinutes ?? Infinity;
  const sb = b.slaRemainingMinutes ?? Infinity;
  if (sa !== sb) return sa - sb;
  return new Date(b.created_at) - new Date(a.created_at);
}

export const slaAtRisk = (r) => r.slaRemainingMinutes != null && r.slaRemainingMinutes < 10;

/* ------------------------------------------------------------- LIFECYCLE */

/** The happy path every referral is measured against. */
export const LIFECYCLE = ['sent', 'acknowledged', 'accepted', 'transit', 'arrived', 'care', 'outcome', 'closed'];

const STAGE_OF = {
  DRAFT: 0, SUBMITTED: 0, ESCALATED: 0, INFO_REQUESTED: 1, DECLINED: 1, REDIRECTED: 1,
  ACKNOWLEDGED: 1, ACCEPTED: 2, ACCEPTED_LAPSED: 2, IN_TRANSIT: 3, NOT_ARRIVED: 3,
  ARRIVED: 4, IN_CARE: 5, REFERRED_ONWARD: 5, OUTCOME_RETURNED: 6, CLOSED_COMPLETED: 7,
};

/**
 * Where a referral is: `index` of the current stage and, when it has left the
 * happy path, a `branch` status shown at that point (declined, lapsed, closed…).
 * Terminal closures other than "completed" sit at the stage they ended from,
 * read from the transition history when available.
 */
export function lifecycleState(r) {
  const s = r.status || '';
  if (s === 'CLOSED_COMPLETED') return { index: 7, branch: null, done: true };
  if (s.startsWith('CLOSED_')) {
    const prev = [...(r.transitions || [])].reverse().find((t) => t.from_status && !t.from_status.startsWith('CLOSED_'));
    return { index: STAGE_OF[prev?.from_status] ?? 0, branch: s, done: true };
  }
  const index = STAGE_OF[s] ?? 0;
  const branch = ['ESCALATED', 'DECLINED', 'REDIRECTED', 'ACCEPTED_LAPSED', 'NOT_ARRIVED', 'INFO_REQUESTED'].includes(s) ? s : null;
  return { index, branch, done: false };
}

/* ---------------------------------------------------------------- VITALS */

export const VITAL_KEYS = ['bp', 'pulse', 'respRate', 'temperatureC', 'spo2', 'muacCm', 'gestationalAgeWeeks'];

/** Adult-ish screening bands. Paediatric pulse/RR bands differ, so they are only flagged for ages ≥ 12 years. */
export function vitalFlag(key, value, patientAge) {
  if (value === null || value === undefined || value === '') return null;
  const ageYears = /year/i.test(String(patientAge || '')) ? parseFloat(patientAge) : null;
  const adult = ageYears !== null && ageYears >= 12;
  const n = Number(value);
  switch (key) {
    case 'bpSystolic': return n >= 160 ? 'high' : n < 90 ? 'low' : null;
    case 'bpDiastolic': return n >= 110 ? 'high' : n < 50 ? 'low' : null;
    case 'pulse': return adult ? (n > 120 ? 'high' : n < 50 ? 'low' : null) : null;
    case 'respRate': return adult ? (n > 30 ? 'high' : n < 10 ? 'low' : null) : null;
    case 'temperatureC': return n >= 38.5 ? 'high' : n < 35 ? 'low' : null;
    case 'spo2': return n < 92 ? 'low' : null;
    case 'muacCm': return n < 11.5 ? 'low' : null;
    default: return null;
  }
}

/* ------------------------------------------------------- LIST FILTERING */

export const LIST_VIEWS = ['action', 'active', 'transit', 'closed', 'all'];

export function matchesView(r, view, user) {
  const g = statusGroup(r.status);
  switch (view) {
    case 'action': return !!nextStep(r, user);
    case 'active': return g !== 'closed';
    case 'transit': return g === 'transit';
    case 'closed': return g === 'closed';
    default: return true;
  }
}

export function matchesQuery(r, q) {
  if (!q) return true;
  const hay = [r.referral_code, r.patientName, r.provisional_diagnosis, r.origin_facility_name,
    r.target_facility_name, r.assigned_doctor_name].filter(Boolean).join(' ').toLowerCase();
  return q.toLowerCase().split(/\s+/).filter(Boolean).every((w) => hay.includes(w));
}
