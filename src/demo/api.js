/**
 * Demo API — an in-browser implementation of the ERL server contract.
 *
 * Purpose: let the full product run as a static site (Vercel) for the pilot
 * demonstration, with the SAME business rules the NestJS API enforces
 * (state machine, BR-01/04/05/13/22/23/26/51, SLA clocks, capability routing).
 * State persists in localStorage, so a demo session survives a refresh.
 *
 * The real deployment swaps this out by setting VITE_API_BASE — nothing in the
 * UI changes, because the request/response shapes are identical.
 */
import { buildSeedState, SEED_VERSION, CONFIG } from './data';
import {
  resolve, isTerminal, allowedEvents, SLA_ACTIVE_STATES,
  DECLINE_REASONS, OVERRIDE_REASONS, TIER_SKIP_REASONS,
  TRANSPORT_MODES, DISPOSITIONS, ARRIVAL_METHODS,
} from './machine';

const LS_KEY = 'erl_demo_state';

/* ------------------------------------------------------------------ store */
let state = null;

function load() {
  if (state) return state;
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.seedVersion === SEED_VERSION) { state = parsed; return state; }
    }
  } catch { /* corrupted -> reseed */ }
  state = buildSeedState();
  save();
  return state;
}

function save() {
  try { localStorage.setItem(LS_KEY, JSON.stringify(state)); }
  catch (e) {
    // localStorage quota (attachments) — drop the oldest attachment payloads and retry
    try {
      const all = state.referrals.flatMap((r) => r.attachments || []);
      all.sort((a, b) => new Date(a.uploadedAt) - new Date(b.uploadedAt));
      for (const att of all.slice(0, 3)) { att.dataUrl = null; att.evicted = true; }
      localStorage.setItem(LS_KEY, JSON.stringify(state));
    } catch { console.warn('demo store not persisted:', e); }
  }
}

export function resetDemo() {
  localStorage.removeItem(LS_KEY);
  state = null;
  load();
}

/* ------------------------------------------------------------------ utils */
const err = (status, body) => {
  const e = new Error(typeof body === 'string' ? body : body?.message || 'error');
  e.demoStatus = status;
  e.demoBody = typeof body === 'string' ? { message: body } : body;
  throw e;
};

const uuid = () => (crypto.randomUUID ? crypto.randomUUID()
  : 'xxxxxxxx-xxxx-4xxx'.replace(/x/g, () => Math.floor(Math.random() * 16).toString(16)) + '-' + Date.now());

function genCode() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const pick = (n) => Array.from({ length: n }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join('');
  const body = `${pick(4)}-${pick(2)}`;
  const checksum = body.split('').reduce((a, c) => a + c.charCodeAt(0), 0) % 10;
  return `ERL-${body}${checksum}`;
}

const haversineKm = (aLat, aLon, bLat, bLon) => {
  if (aLat == null || bLat == null) return null;
  const rad = (d) => (d * Math.PI) / 180;
  const dLat = rad(bLat - aLat), dLon = rad(bLon - aLon);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(aLat)) * Math.cos(rad(bLat)) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(h));
};

const nowIso = () => new Date().toISOString();
const facility = (id) => load().facilities.find((f) => f.id === id);
const userById = (id) => load().users.find((u) => u.id === id);

function currentUser(token) {
  if (!token || !token.startsWith('demo-token-')) err(401, 'Missing or invalid session — sign in again');
  const u = userById(token.slice('demo-token-'.length));
  if (!u) err(401, 'Session user no longer exists');
  if (u.status !== 'active') err(401, 'Your account is not active');
  const f = u.facilityId ? facility(u.facilityId) : null;
  return {
    ...u, facilityName: f?.name || null, facilityTier: f?.tier || null,
  };
}

function audit(user, action, resourceType, resourceId, detail) {
  const s = load();
  s.audit.push({ at: nowIso(), actorUserId: user?.id || 'system', actorName: user?.fullName || 'system', action, resourceType, resourceId, detail: detail || null });
  if (s.audit.length > 2000) s.audit.splice(0, s.audit.length - 2000);
}

function notify(n) {
  const s = load();
  s.notifications.push({ id: uuid(), at: nowIso(), delivered: true, ...n });
  if (s.notifications.length > 500) s.notifications.splice(0, s.notifications.length - 500);
}

/* -------------------------------------------------- scheduler (lazy tick) */
/** SLA breach, reservation lapse and arrival-grace expiry, applied on read —
 *  the browser stands in for the server's cron scheduler. */
function tick() {
  const s = load();
  const now = Date.now();
  let dirty = false;
  for (const r of s.referrals) {
    if (isTerminal(r.status)) continue;
    // BR-20/21: SLA breach -> ESCALATED
    if (SLA_ACTIVE_STATES.includes(r.status) && r.status !== 'ESCALATED'
        && r.slaDeadlineAt && new Date(r.slaDeadlineAt).getTime() < now && !r.slaBreached) {
      const chk = resolve(r.status, 'sla_breach', 'system');
      if (chk.ok) {
        r.transitions.push({ from: r.status, to: chk.to, event: 'sla_breach', actorName: 'system (SLA monitor)', at: nowIso() });
        r.status = chk.to; r.slaBreached = true; r.escalationLevel = Math.min((r.escalationLevel || 0) + 1, 3);
        r.version += 1; dirty = true;
        notify({ channel: 'sms', template: 'sla_escalation', referralId: r.id, body: `SLA breached for ${r.code} — escalated at ${facility(r.targetFacilityId)?.name}` });
      }
    }
    // BR-26: bed reservation lapses
    if (r.status === 'ACCEPTED' && r.bedReserved && r.bedReservationExpiresAt
        && new Date(r.bedReservationExpiresAt).getTime() < now) {
      const chk = resolve(r.status, 'reservation_lapse', 'system');
      if (chk.ok) {
        r.transitions.push({ from: r.status, to: chk.to, event: 'reservation_lapse', actorName: 'system (reservation monitor)', at: nowIso(), note: 'Bed reservation expired and was released' });
        r.status = chk.to; r.bedReserved = false; r.version += 1; dirty = true;
        releaseBed(r);
      }
    }
    // BR-32: not arrived within grace
    if (r.status === 'IN_TRANSIT' && r.expectedArrivalAt && new Date(r.expectedArrivalAt).getTime() < now) {
      const chk = resolve(r.status, 'grace_expiry', 'system');
      if (chk.ok) {
        r.transitions.push({ from: r.status, to: chk.to, event: 'grace_expiry', actorName: 'system (arrival monitor)', at: nowIso() });
        r.status = chk.to; r.version += 1; dirty = true;
        notify({ channel: 'sms', template: 'not_arrived', referralId: r.id, body: `Referral ${r.code} has NOT ARRIVED — origin follow-up task created` });
      }
    }
  }
  if (dirty) save();
}

/* ------------------------------------------------------- capacity helpers */
function latestCapacity(facilityId, wardType) {
  return load().capacity.find((c) => c.facilityId === facilityId && c.wardType === wardType) || null;
}

function reserveBed(r, wardType) {
  const cap = latestCapacity(r.targetFacilityId, wardType) || latestCapacity(r.targetFacilityId, 'general');
  if (!cap || cap.bedsFree <= 0) return false;
  cap.bedsFree -= 1;
  cap.reportedAt = nowIso();
  cap.reportedBy = 'reservation (auto)';
  r.reservedWardType = cap.wardType;
  return true;
}

function releaseBed(r) {
  if (!r.reservedWardType) return;
  const cap = latestCapacity(r.targetFacilityId, r.reservedWardType);
  if (cap && cap.bedsFree < cap.bedsTotal) {
    cap.bedsFree += 1; cap.reportedAt = nowIso(); cap.reportedBy = 'reservation released (auto)';
  }
  r.reservedWardType = null;
}

/* ------------------------------------------------------- rating helpers */
function facilityRating(facilityId) {
  const rows = load().feedback.filter((f) => f.facilityId === facilityId);
  if (!rows.length) return { avg: null, count: 0 };
  return { avg: Math.round((rows.reduce((a, f) => a + f.rating, 0) / rows.length) * 10) / 10, count: rows.length };
}

/* ---------------------------------------------------------------- ROUTING */
function suggest(body, user) {
  const s = load();
  const reason = s.reasonCodes.find((rc) => rc.code === body.reasonCode);
  if (!reason) err(400, `Unknown reason_code '${body.reasonCode}'`);
  const urgency = body.urgency || reason.defaultUrgency;
  const required = body.requiredCapabilities?.length ? body.requiredCapabilities : reason.requiredCapabilities;
  const origin = facility(body.originFacilityId || user.facilityId);
  const minTier = urgency === 'emergency' ? 2 : reason.minTargetTier;
  const w = s.config.routingWeights;

  const all = s.facilities
    .filter((f) => f.tier >= minTier && f.id !== origin?.id)
    .map((f) => {
      const capRows = required.map((code) => {
        const row = s.facilityCapabilities.find((fc) => fc.facilityId === f.id && fc.code === code);
        const cap = s.capabilities.find((c) => c.code === code);
        return {
          code, name: cap?.name || code,
          status: row?.status || 'unknown', note: row?.note || null,
          stale: !row?.verifiedAt || (Date.now() - new Date(row.verifiedAt)) > s.config.capabilityStaleDays * 86400000,
        };
      });
      const missing = capRows.filter((c) => c.status !== 'available');
      const stale = capRows.filter((c) => c.status === 'available' && c.stale).map((c) => c.code);

      const distanceKm = haversineKm(origin?.latitude, origin?.longitude, f.latitude, f.longitude) ?? 0;
      const cap = latestCapacity(f.id, body.wardType || 'general') || latestCapacity(f.id, 'general');
      const bedsFree = cap ? cap.bedsFree : null;
      const bedsStale = !cap || (Date.now() - new Date(cap.reportedAt)) > s.config.capacityStaleHours * 3600000;

      const decided = s.referrals.filter((r) => r.targetFacilityId === f.id && r.decision);
      const accepted = decided.filter((r) => r.decision === 'accepted');
      const acceptanceRate = decided.length ? accepted.length / decided.length : 0.5;
      const queueDepth = s.referrals.filter((r) => r.targetFacilityId === f.id && SLA_ACTIVE_STATES.includes(r.status)).length;

      const score =
        w.distance * (1 / (1 + distanceKm / 25)) +
        w.acceptance * acceptanceRate +
        w.beds * Math.min((bedsFree ?? 0) / 5, 1) -
        w.queue * Math.min(queueDepth / 10, 1);

      return {
        facilityId: f.id, mfrId: f.mfrId, name: f.name, nameAm: f.nameAm,
        facilityType: f.type, tier: f.tier,
        region: f.region, zone: f.zone, address: f.address, phone: f.phone,
        distanceKm: Math.round(distanceKm * 10) / 10,
        estimatedTravelMinutes: Math.round((distanceKm / 35) * 60),
        bedsFree, bedsReportedAt: cap?.reportedAt || null, bedsStale,
        acceptanceRate: Math.round(acceptanceRate * 100) / 100,
        queueDepth, is24h: f.is24h, hasAmbulance: f.hasAmbulance,
        // Patient feedback is intentionally NOT exposed to clinicians here —
        // it mirrors the server rule (IT/quality administration only).
        score: Math.round(score * 1000) / 1000,
        eligible: missing.length === 0,
        missingCapabilities: missing, staleCapabilities: stale,
      };
    });

  const candidates = all.filter((c) => c.eligible).sort((a, b) => b.score - a.score);
  const excluded = all.filter((c) => !c.eligible)
    .sort((a, b) => a.distanceKm - b.distanceKm)
    // only surface plausible near-misses, not every clinic in the country
    .filter((c) => c.missingCapabilities.length <= Math.max(2, required.length - 1))
    .slice(0, 5);

  return {
    reasonCode: reason.code, urgency, minTargetTier: minTier,
    requiredCapabilities: required, stabilisationItems: reason.stabilisationItems,
    candidates: candidates.slice(0, body.limit ?? 5), excluded,
  };
}

/* -------------------------------------------------------------- REFERRALS */
const CREATOR_ROLES = ['hew', 'doctor', 'clinician', 'liaison', 'triage', 'specialist', 'sysadmin'];
const MANDATORY_VITALS = ['bpSystolic', 'bpDiastolic', 'pulse', 'respRate', 'temperatureC'];

/* ------------------------------------------- reception & assignment */
const RECEPTION_ROLES = ['liaison', 'triage', 'facility_admin'];
const CLINICAL_ROLES = ['doctor', 'clinician', 'specialist'];

/**
 * Mirrors the server rule: at the receiving facility a clinician may only see
 * or act on a referral once reception has assigned it to them.
 */
function assertMayReadAtTarget(r, user) {
  if (r.targetFacilityId !== user.facilityId) return;
  if (!CLINICAL_ROLES.includes(user.role)) return;
  if (r.assignedDoctorId === user.id) return;
  err(403, {
    message: 'This referral has not been assigned to you',
    hint: r.assignedDoctorId
      ? `The referral reception assigned it to ${r.assignedDoctorName}.`
      : 'The referral reception has not yet assigned a clinician to this case.',
    awaitingAssignment: !r.assignedDoctorId,
  });
}

function actorSide(r, user) {
  if (user.role === 'sysadmin') return 'system';
  if (r.originFacilityId === user.facilityId) return 'origin';
  if (r.targetFacilityId === user.facilityId) return 'target';
  err(403, 'Your facility is not a party to this referral (BR-51: relationship-based access control)');
}

function snapshotFacility(f) {
  if (!f) return null;
  return {
    id: f.id, name: f.name, nameAm: f.nameAm, type: f.type, tier: f.tier,
    region: f.region, zone: f.zone, woreda: f.woreda, address: f.address,
    poBox: f.poBox, phone: f.phone, is24h: f.is24h, hasAmbulance: f.hasAmbulance,
    latitude: f.latitude, longitude: f.longitude,
  };
}

function hydrate(r, user) {
  const s = load();
  const patient = s.patients.find((p) => p.id === r.patientId);
  const origin = facility(r.originFacilityId);
  const target = facility(r.targetFacilityId);
  const referrer = userById(r.referringUserId);
  const feedback = s.feedback.filter((f) => f.referralId === r.id);

  let side = 'none';
  if (user.role !== 'patient') { try { side = actorSide(r, user); } catch { side = 'none'; } }

  const base = {
    id: r.id, referral_code: r.code, status: r.status, urgency: r.urgency,
    referral_type: r.referralType, reason_code: r.reasonCode,
    origin_facility_id: r.originFacilityId, target_facility_id: r.targetFacilityId,
    origin_facility_name: origin?.name, target_facility_name: target?.name,
    originFacility: snapshotFacility(origin), targetFacility: snapshotFacility(target),
    referringUser: {
      name: r.referringUserName, phone: r.referringUserPhone,
      title: r.referringUserTitle || referrer?.title || null,
      licenseNumber: r.referringUserLicense || referrer?.licenseNumber || null,
      role: referrer?.role || null, department: referrer?.department || null,
    },
    receiving_clinician_name: r.receivingClinicianName,
    receiving_clinician_phone: r.receivingClinicianPhone,
    bed_reserved: r.bedReserved, bed_reservation_expires_at: r.bedReservationExpiresAt,
    reserved_ward_type: r.reservedWardType,
    decision: r.decision, decline_reason: r.declineReason, decline_note: r.declineNote,
    suggestion_rank_of_chosen: r.suggestionRankOfChosen, override_reason: r.overrideReason,
    tier_skip_reason: r.tierSkipReason,
    distance_km: r.distanceKm, estimated_travel_minutes: r.estimatedTravelMinutes,
    departed_at: r.departedAt, transport_mode: r.transportMode, escort_type: r.escortType,
    arrived_at: r.arrivedAt, transit_minutes: r.transitMinutes,
    outcome_submitted_at: r.outcomeSubmittedAt, outcome_acknowledged_at: r.outcomeAcknowledgedAt,
    sla_breached: r.slaBreached, created_offline: r.createdOffline, sync_lag_minutes: r.syncLagMinutes,
    created_at: r.createdAt, updated_at: r.updatedAt, version: r.version,
    patient: patient ? {
      id: patient.id, name: patient.name, nameAm: patient.nameAm, sex: patient.sex,
      age: patient.ageValue ? `${patient.ageValue} ${patient.ageUnit}` : null,
      cbhiMember: patient.cbhiMember, isPregnant: patient.isPregnant,
    } : null,
    transitions: r.transitions.map((t) => ({
      from_status: t.from, to_status: t.to, event: t.event,
      actor_user_name: t.actorName, reason_code: t.reasonCode || null,
      note: t.note || null, occurred_at: t.at,
    })),
    allowedEvents: isTerminal(r.status) ? [] : allowedEvents(r.status),
    actorSide: side,
    assignment: r.assignedDoctorId ? {
      doctorId: r.assignedDoctorId,
      doctorName: r.assignedDoctorName,
      assignedAt: r.assignedAt,
      assignedByName: r.assignedByName,
      note: r.assignmentNote,
      isMine: r.assignedDoctorId === user.id,
    } : null,
    awaitingAssignment: !r.assignedDoctorId && !isTerminal(r.status),
    canAssign: r.targetFacilityId === user.facilityId
      && (RECEPTION_ROLES.includes(user.role) || user.role === 'sysadmin')
      && !isTerminal(r.status),
    slaRemainingMinutes: r.slaDeadlineAt && SLA_ACTIVE_STATES.includes(r.status)
      ? Math.round((new Date(r.slaDeadlineAt).getTime() - Date.now()) / 60000) : null,
    // Feedback follows the server rule: patients see their own; the facility's
    // IT administrator sees rows about their facility; clinicians see none.
    ...(user.role === 'patient'
      ? { feedback }
      : user.role === 'it_admin'
          && (r.originFacilityId === user.facilityId || r.targetFacilityId === user.facilityId)
        ? { feedback: feedback.filter((f) => f.facilityId === user.facilityId)
              .map((f) => ({ ...f, facility_role: f.facilityRole })) }
        : {}),
    feedbackEligible: !!r.arrivedAt || isTerminal(r.status),
  };

  /* BR-51 data minimisation by audience */
  if (user.role === 'patient') {
    return {
      ...base, clinicalRedacted: true, allowedEvents: [], actorSide: 'patient',
      provisional_diagnosis: r.provisionalDiagnosis,
      outcome: r.outcome ? { followUpInstructions: r.outcome.followUpInstructions, disposition: r.outcome.disposition } : null,
      attachments: (r.attachments || []).map(({ dataUrl, ...a }) => a),
    };
  }
  const oversight = ['woreda', 'region', 'moh', 'cbhi'].includes(user.role);
  if (oversight) return { ...base, clinicalRedacted: true, attachments: (r.attachments || []).map(({ dataUrl, ...a }) => a) };

  return {
    ...base,
    clinicalRedacted: false,
    provisional_diagnosis: r.provisionalDiagnosis,
    clinical: r.clinical, pre_referral: r.preReferral, outcome: r.outcome,
    emergency_override: r.emergencyOverride, emergency_override_reason: r.emergencyOverrideReason,
    attachments: r.attachments || [],
  };
}

function createReferral(dto, user) {
  const s = load();
  if (!CREATOR_ROLES.includes(user.role)) err(403, `Role '${user.role}' may not create referrals`);
  if (!user.facilityId) err(403, 'Your account is not registered to a facility');

  const patient = s.patients.find((p) => p.id === dto.patientId);
  if (!patient) err(404, 'Patient not found');
  const reason = s.reasonCodes.find((rc) => rc.code === dto.reasonCode);
  if (!reason) err(400, `Unknown reason_code '${dto.reasonCode}'`);
  const origin = facility(user.facilityId);           // origin is ALWAYS the sender's own facility
  const target = facility(dto.targetFacilityId);
  if (!target) err(404, 'Target facility not found');
  if (target.id === origin.id) err(400, 'Cannot refer a patient to the originating facility');

  const urgency = dto.urgency || reason.defaultUrgency;

  /* BR-05 */
  const clinical = dto.clinical || {};
  if (!dto.emergencyOverride) {
    const missing = MANDATORY_VITALS.filter((v) => clinical[v] === undefined || clinical[v] === null || clinical[v] === '');
    if (missing.length) {
      err(400, { message: 'BR-05: mandatory pre-referral vitals missing', missingVitals: missing, hint: 'Supply the vitals, or set the emergency override with a reason.' });
    }
  } else if (!dto.emergencyOverrideReason) err(400, 'BR-05: emergency override requires a reason');

  /* BR-01 */
  const tierGap = target.tier - origin.tier;
  const referralType = target.tier > origin.tier ? 'up' : target.tier < origin.tier ? 'down' : 'lateral';
  if (referralType === 'up' && tierGap > 1 && urgency !== 'emergency' && !dto.tierSkipReason) {
    err(400, { message: `BR-01: referral skips ${tierGap - 1} tier(s) (${origin.tier} -> ${target.tier}); a reason is required`, allowedReasons: TIER_SKIP_REASONS });
  }
  if (dto.tierSkipReason && !TIER_SKIP_REASONS.includes(dto.tierSkipReason)) err(400, { message: 'Invalid tierSkipReason', allowed: TIER_SKIP_REASONS });

  /* BR-13 */
  const rank = dto.suggestionRankOfChosen;
  if (rank !== undefined && rank !== 1 && !dto.overrideReason) {
    err(400, { message: 'BR-13: choosing a facility other than the top suggestion requires a reason', allowedReasons: OVERRIDE_REASONS });
  }
  if (dto.overrideReason && !OVERRIDE_REASONS.includes(dto.overrideReason)) err(400, { message: 'Invalid overrideReason', allowed: OVERRIDE_REASONS });

  const id = dto.id || uuid();
  if (s.referrals.find((r) => r.id === id)) return hydrate(s.referrals.find((r) => r.id === id), user);

  const created = nowIso();
  const graceH = s.config.arrivalGraceHours[urgency];
  const slaMin = s.config.slaMinutes[urgency];

  const r = {
    id, code: genCode(), chainRootId: id, parentId: null,
    patientId: dto.patientId, status: 'DRAFT', urgency, referralType,
    originFacilityId: origin.id, targetFacilityId: target.id,
    referringUserId: user.id, referringUserName: user.fullName,
    referringUserPhone: user.phone, referringUserTitle: user.title || null,
    referringUserLicense: user.licenseNumber || null,
    reasonCode: dto.reasonCode, provisionalDiagnosis: dto.provisionalDiagnosis,
    suggestionRankOfChosen: rank ?? null, overrideReason: dto.overrideReason ?? null,
    tierSkipReason: dto.tierSkipReason ?? null,
    clinical, preReferral: dto.preReferral || {},
    attachments: (dto.attachments || []).map((a) => ({
      id: uuid(), name: a.name, type: a.type, size: a.size, dataUrl: a.dataUrl,
      uploadedBy: user.fullName, uploadedAt: created,
    })),
    emergencyOverride: !!dto.emergencyOverride, emergencyOverrideReason: dto.emergencyOverrideReason || null,
    lawfulBasis: dto.lawfulBasis || (urgency === 'emergency' ? 'vital_interest' : 'consent'),
    distanceKm: dto.distanceKm ?? null, estimatedTravelMinutes: dto.estimatedTravelMinutes ?? null,
    bedReserved: false, bedReservationExpiresAt: null, reservedWardType: null,
    receivingClinicianName: null, receivingClinicianPhone: null,
    decision: null, decisionAt: null, declineReason: null, declineNote: null,
    slaDeadlineAt: null, slaBreached: false, escalationLevel: 0,
    expectedArrivalAt: new Date(Date.now() + graceH * 3600000).toISOString(),
    departedAt: null, transportMode: null, escortType: null,
    arrivedAt: null, arrivalMethod: null, transitMinutes: null,
    outcome: null, outcomeSubmittedAt: null, outcomeAcknowledgedAt: null,
    createdOffline: !!dto.createdOffline, syncLagMinutes: 0, version: 1,
    createdAt: created, updatedAt: created,
    transitions: [{ from: null, to: 'DRAFT', event: 'create', actorName: user.fullName, at: created }],
  };
  s.referrals.unshift(r);
  audit(user, 'create', 'referral', id, { code: r.code, urgency, target: target.name });

  // submit immediately (matching the server default)
  const chk = resolve('DRAFT', 'submit', 'origin');
  r.transitions.push({ from: 'DRAFT', to: chk.to, event: 'submit', actorName: user.fullName, at: nowIso() });
  r.status = chk.to;
  r.slaDeadlineAt = new Date(Date.now() + slaMin * 60000).toISOString();
  r.version += 1;
  notify({ channel: 'sms', template: 'new_referral', referralId: id, body: `[${urgency.toUpperCase()}] New referral ${r.code} from ${origin.name}. Dx: ${r.provisionalDiagnosis}. Respond within ${slaMin} min.` });
  save();
  return hydrate(r, user);
}

function transition(id, event, payload, user) {
  const s = load();
  const r = s.referrals.find((x) => x.id === id);
  if (!r) err(404, 'Referral not found');
  if (user.role === 'patient') err(403, 'Patients cannot change referral state');

  const side = actorSide(r, user);
  // Acting on a case requires the same assignment as reading it.
  if (side === 'target') assertMayReadAtTarget(r, user);
  const chk = resolve(r.status, event, side);
  if (!chk.ok) err(400, chk.error);
  const from = r.status;
  const tr = { from, to: chk.to, event, actorName: user.fullName, at: nowIso(), note: payload.note || null, reasonCode: null };

  switch (event) {
    case 'reroute': {
      if (!payload.targetFacilityId) err(400, 'reroute requires targetFacilityId');
      const nt = facility(payload.targetFacilityId);
      if (!nt) err(404, 'New target facility not found');
      releaseBed(r);
      r.targetFacilityId = nt.id;
      r.decision = null; r.declineReason = null; r.declineNote = null;
      r.slaBreached = false; r.escalationLevel = 0; r.bedReserved = false;
      r.slaDeadlineAt = new Date(Date.now() + s.config.slaMinutes[r.urgency] * 60000).toISOString();
      tr.note = `Rerouted to ${nt.name}`;
      notify({ channel: 'sms', template: 'new_referral', referralId: id, body: `[${r.urgency.toUpperCase()}] Referral ${r.code} rerouted to ${nt.name}.` });
      break;
    }
    case 'acknowledge': r.acknowledgedAt = nowIso(); break;
    case 'accept': {
      r.decision = 'accepted'; r.decisionAt = nowIso();
      r.receivingClinicianName = payload.receivingClinicianName || user.fullName;
      r.receivingClinicianPhone = payload.receivingClinicianPhone || user.phone || null;
      if (payload.bedReserved) {
        const ok = reserveBed(r, payload.wardType || 'general');
        if (!ok) err(409, { message: 'No free bed to reserve in that ward — update capacity first or accept without a reservation', hint: 'Availability is real in this system: a reservation takes an actual bed.' });
        r.bedReserved = true;
        r.bedReservationExpiresAt = new Date(Date.now() + s.config.bedReservationHours[r.urgency] * 3600000).toISOString();
        tr.note = `Bed reserved (${r.reservedWardType}) until ${new Date(r.bedReservationExpiresAt).toLocaleTimeString()}`;
      }
      notify({ channel: 'sms', template: 'referral_accepted', referralId: id, body: `Your referral ${r.code} is ACCEPTED at ${facility(r.targetFacilityId)?.name}. Show this code on arrival.` });
      break;
    }
    case 'decline': {
      if (!payload.declineReason) err(400, { message: 'BR-22: a decline must carry a controlled reason code', allowedReasons: DECLINE_REASONS });
      if (!DECLINE_REASONS.includes(payload.declineReason)) err(400, { message: 'Invalid declineReason', allowed: DECLINE_REASONS });
      r.decision = 'declined'; r.decisionAt = nowIso();
      r.declineReason = payload.declineReason; r.declineNote = payload.declineNote || null;
      tr.reasonCode = payload.declineReason; tr.note = payload.declineNote || null;
      if (r.urgency === 'emergency') {
        notify({ channel: 'sms', template: 'emergency_declined', referralId: id, body: `URGENT: emergency referral ${r.code} DECLINED (${payload.declineReason}). Reroute immediately.` });
      }
      break;
    }
    case 'redirect': {
      if (!payload.redirectTargetFacilityId) err(400, 'redirect requires redirectTargetFacilityId');
      const nt = facility(payload.redirectTargetFacilityId);
      if (!nt) err(404, 'Redirect target not found');
      r.decision = 'redirected'; r.decisionAt = nowIso();
      const child = {
        ...JSON.parse(JSON.stringify(r)),
        id: uuid(), code: genCode(), parentId: r.id, chainRootId: r.chainRootId,
        status: 'SUBMITTED', decision: null, declineReason: null, declineNote: null,
        originFacilityId: r.targetFacilityId, targetFacilityId: nt.id,
        referringUserId: user.id, referringUserName: user.fullName, referringUserPhone: user.phone,
        referringUserTitle: user.title || null, referringUserLicense: user.licenseNumber || null,
        bedReserved: false, bedReservationExpiresAt: null, reservedWardType: null,
        slaDeadlineAt: new Date(Date.now() + s.config.slaMinutes[r.urgency] * 60000).toISOString(),
        slaBreached: false, escalationLevel: 0, version: 1,
        createdAt: nowIso(), updatedAt: nowIso(),
        transitions: [{ from: null, to: 'SUBMITTED', event: 'redirect_spawn', actorName: user.fullName, at: nowIso(), note: `Redirected from ${r.code}` }],
      };
      s.referrals.unshift(child);
      tr.note = `Redirected to ${nt.name} as ${child.code}`;
      break;
    }
    case 'depart': {
      if (payload.transportMode && !TRANSPORT_MODES.includes(payload.transportMode)) err(400, { message: 'Invalid transportMode', allowed: TRANSPORT_MODES });
      r.departedAt = nowIso();
      r.transportMode = payload.transportMode || 'other';
      r.escortType = payload.escortType || 'none';
      break;
    }
    case 'arrive':
    case 'found': {
      const method = payload.arrivalMethod || 'attestation';
      if (!ARRIVAL_METHODS.includes(method)) err(400, { message: 'Invalid arrivalMethod', allowed: ARRIVAL_METHODS });
      r.arrivedAt = nowIso(); r.arrivalMethod = method;
      if (r.departedAt) r.transitMinutes = Math.round((Date.now() - new Date(r.departedAt)) / 60000);
      r.bedReserved = false; r.bedReservationExpiresAt = null; // reservation consumed by the admission
      notify({ channel: 'in_app', template: 'patient_arrived', referralId: id, body: `Patient for referral ${r.code} has ARRIVED at ${facility(r.targetFacilityId)?.name}.` });
      break;
    }
    case 'submit_outcome': {
      const o = payload.outcome || {};
      if (!o.finalDiagnosis) err(400, 'outcome.finalDiagnosis is required');
      if (!o.disposition) err(400, 'outcome.disposition is required');
      if (!DISPOSITIONS.includes(o.disposition)) err(400, { message: 'Invalid disposition', allowed: DISPOSITIONS });
      r.outcome = o; r.outcomeSubmittedAt = nowIso();
      notify({ channel: 'in_app', template: 'outcome_returned', referralId: id, body: `Outcome returned for ${r.code}: ${o.finalDiagnosis} (${o.disposition}). Acknowledge to close the loop.` });
      break;
    }
    case 'acknowledge_outcome':
      r.outcomeAcknowledgedAt = nowIso();
      notify({ channel: 'sms', template: 'loop_closed', referralId: id, body: `Referral ${r.code} closed. Please rate your experience in the patient portal.` });
      break;
    case 'record_death':
      r.outcome = { ...(payload.outcome || {}), disposition: 'died' };
      r.outcomeSubmittedAt = nowIso();
      break;
    case 'cancel':
      if (r.bedReserved) releaseBed(r);
      break;
    default: break;
  }

  r.transitions.push(tr);
  r.status = chk.to;
  r.updatedAt = nowIso();
  r.version += 1;
  audit(user, `transition:${event}`, 'referral', id, { from, to: chk.to });
  save();
  return hydrate(r, user);
}

function listReferrals(user, q) {
  const s = load();
  let rows;
  if (user.role === 'patient') {
    rows = s.referrals.filter((r) => r.patientId === user.patientId);
  } else if (['woreda', 'region', 'moh', 'sysadmin'].includes(user.role)) {
    rows = s.referrals;
  } else if (q.direction === 'inbound') {
    rows = s.referrals.filter((r) => r.targetFacilityId === user.facilityId);
  } else if (q.direction === 'outbound') {
    rows = s.referrals.filter((r) => r.originFacilityId === user.facilityId);
  } else {
    rows = s.referrals.filter((r) => r.originFacilityId === user.facilityId || r.targetFacilityId === user.facilityId);
  }
  // Reception-first: a clinician's inbound queue is what was assigned to them.
  if (CLINICAL_ROLES.includes(user.role)) {
    rows = rows.filter((r) => r.originFacilityId === user.facilityId || r.assignedDoctorId === user.id);
  }
  const urgencyRank = { emergency: 0, urgent: 1, routine: 2 };
  return rows
    .slice()
    .sort((a, b) => (urgencyRank[a.urgency] - urgencyRank[b.urgency]) || (new Date(b.createdAt) - new Date(a.createdAt)))
    .map((r) => {
      const p = s.patients.find((x) => x.id === r.patientId);
      return {
        id: r.id, referral_code: r.code, status: r.status, urgency: r.urgency,
        reason_code: r.reasonCode,
        provisional_diagnosis: user.role === 'patient' ? null : r.provisionalDiagnosis,
        origin_facility_name: facility(r.originFacilityId)?.name,
        target_facility_name: facility(r.targetFacilityId)?.name,
        origin_facility_id: r.originFacilityId, target_facility_id: r.targetFacilityId,
        created_at: r.createdAt, sla_breached: r.slaBreached,
        decision: r.decision, decline_reason: r.declineReason,
        arrived_at: r.arrivedAt, outcome_submitted_at: r.outcomeSubmittedAt,
        patientName: p?.name, sex: p?.sex, patientAge: p ? `${p.ageValue} ${p.ageUnit}` : null,
        attachmentCount: (r.attachments || []).length,
        assigned_doctor_name: r.assignedDoctorName || null,
        awaitingAssignment: r.targetFacilityId === user.facilityId
          && !r.assignedDoctorId && !isTerminal(r.status),
        assignedToMe: r.assignedDoctorId === user.id,
        slaRemainingMinutes: r.slaDeadlineAt && SLA_ACTIVE_STATES.includes(r.status)
          ? Math.round((new Date(r.slaDeadlineAt).getTime() - Date.now()) / 60000) : null,
      };
    });
}

/* -------------------------------------------------------------- ANALYTICS */
function metrics(scope) {
  const s = load();
  let rows = s.referrals;
  if (scope.facilityId) rows = rows.filter((r) => r.originFacilityId === scope.facilityId || r.targetFacilityId === scope.facilityId);

  const terminalCountable = rows.filter((r) => isTerminal(r.status) && r.status !== 'CLOSED_CANCELLED');
  const loopClosed = rows.filter((r) => r.status === 'CLOSED_COMPLETED');
  const decided = rows.filter((r) => r.decision === 'accepted' || r.decision === 'declined');
  const accepted = rows.filter((r) => r.decision === 'accepted');
  const arrived = rows.filter((r) => r.arrivedAt);
  const pct = (a, b) => (b > 0 ? Math.round((a / b) * 1000) / 10 : null);

  const declineCounts = {};
  rows.forEach((r) => {
    r.transitions.forEach((t) => { if (t.event === 'decline' && t.reasonCode) declineCounts[t.reasonCode] = (declineCounts[t.reasonCode] || 0) + 1; });
  });

  /* BR-13 utilisation: every override reason recorded, aggregated */
  const overrideCounts = {};
  const overridden = rows.filter((r) => r.overrideReason);
  overridden.forEach((r) => { overrideCounts[r.overrideReason] = (overrideCounts[r.overrideReason] || 0) + 1; });
  const ranked = rows.filter((r) => r.suggestionRankOfChosen != null);

  const flowMap = {};
  rows.forEach((r) => {
    const key = `${facility(r.originFacilityId)?.name}→${facility(r.targetFacilityId)?.name}`;
    flowMap[key] = (flowMap[key] || 0) + 1;
  });

  const ackTimes = rows.filter((r) => r.acknowledgedAt || r.decisionAt).map((r) => {
    const t = r.acknowledgedAt || r.decisionAt;
    return Math.max(0, Math.round((new Date(t) - new Date(r.createdAt)) / 60000));
  }).sort((a, b) => a - b);
  const median = (arr) => (arr.length ? arr[Math.floor(arr.length / 2)] : null);

  return {
    totals: {
      totalReferrals: rows.length,
      emergencyCount: rows.filter((r) => r.urgency === 'emergency').length,
      terminalCountable: terminalCountable.length,
      loopClosed: loopClosed.length,
      arrived: arrived.length,
      slaBreaches: rows.filter((r) => r.slaBreached).length,
      createdOffline: rows.filter((r) => r.createdOffline).length,
      outcomesAwaitingAck: rows.filter((r) => r.outcomeSubmittedAt && !r.outcomeAcknowledgedAt).length,
      overdueOutcomes: rows.filter((r) => ['ARRIVED', 'IN_CARE'].includes(r.status)
        && new Date(r.arrivedAt) < new Date(Date.now() - 72 * 3600000) && !r.outcomeSubmittedAt).length,
      withAttachments: rows.filter((r) => (r.attachments || []).length).length,
    },
    loopClosureRatePct: pct(loopClosed.length, terminalCountable.length),
    acceptanceRatePct: pct(accepted.length, decided.length),
    arrivalConfirmationRatePct: pct(arrived.length, accepted.length),
    preReferralCompletenessPct: pct(rows.filter((r) => !r.emergencyOverride).length, rows.length),
    bypassRatePct: 0,
    medianMinutesToAcknowledge: median(ackTimes),
    medianTransitMinutes: median(rows.filter((r) => r.transitMinutes != null).map((r) => r.transitMinutes).sort((a, b) => a - b)),
    declineReasons: Object.entries(declineCounts).map(([decline_reason, n]) => ({ decline_reason, n })).sort((a, b) => b.n - a.n),
    overrideInsights: {
      totalWithSuggestion: ranked.length,
      overridden: overridden.length,
      overrideRatePct: pct(overridden.length, ranked.length),
      reasons: Object.entries(overrideCounts).map(([override_reason, n]) => ({ override_reason, n })).sort((a, b) => b.n - a.n),
    },
    byStatus: Object.entries(rows.reduce((a, r) => { a[r.status] = (a[r.status] || 0) + 1; return a; }, {}))
      .map(([status, n]) => ({ status, n })).sort((a, b) => b.n - a.n),
    flow: Object.entries(flowMap).map(([k, n]) => {
      const [source, target] = k.split('→');
      return { source, target, n };
    }).sort((a, b) => b.n - a.n).slice(0, 25),
    benchmark: {
      loopClosureBaselinePct: 10, loopClosureTargetPct: 60,
      timeToAcceptTargetMinutes: 30, arrivalConfirmationTargetPct: 75,
      preReferralCompletenessBaselinePct: 39, preReferralCompletenessTargetPct: 85,
    },
  };
}

/* --------------------------------------------------------------- ROUTER */
export async function demoApi(method, path, body) {
  load();
  tick();
  const token = localStorage.getItem('erl_token');
  const url = new URL(path, 'http://demo.local');
  const p = url.pathname;
  const q = Object.fromEntries(url.searchParams.entries());
  const s = load();

  /* ---------- public ---------- */
  if (method === 'POST' && p === '/v1/auth/login') {
    const u = s.users.find((x) => x.username === body?.username?.trim()?.toLowerCase());
    if (!u || u.password !== body?.password) err(401, 'Invalid credentials');
    if (u.status === 'pending') err(403, 'Your account is awaiting verification by your facility IT administrator');
    if (u.status !== 'active') err(403, 'Your account has been deactivated. Contact your facility IT administrator.');
    const f = u.facilityId ? facility(u.facilityId) : null;
    audit(u, 'login', 'app_user', u.id);
    save();
    const { password, ...safe } = u;
    return {
      accessToken: `demo-token-${u.id}`,
      user: { ...safe, facilityName: f?.name || null, facilityTier: f?.tier || null },
    };
  }

  /* patient self-service lookup: referral code + phone (no account needed) */
  if (method === 'POST' && p === '/v1/portal/lookup') {
    const r = s.referrals.find((x) => x.code === body?.code?.trim()?.toUpperCase());
    if (!r) err(404, 'No referral found with that code');
    const patient = s.patients.find((x) => x.id === r.patientId);
    const phoneTail = (body?.phone || '').replace(/\D/g, '').slice(-4);
    const patientTail = (patient?.phone || '').replace(/\D/g, '').slice(-4);
    if (!phoneTail || phoneTail !== patientTail) err(403, 'The phone number does not match the one on the referral');
    const asPatient = { role: 'patient', patientId: r.patientId, fullName: patient?.name };
    return hydrate(r, asPatient);
  }

  const user = currentUser(token);

  /* ---------- vocabulary & catalogue ---------- */
  if (method === 'GET' && p === '/v1/referrals/vocabulary') {
    return {
      declineReasons: DECLINE_REASONS, overrideReasons: OVERRIDE_REASONS,
      tierSkipReasons: TIER_SKIP_REASONS, transportModes: TRANSPORT_MODES,
      dispositions: DISPOSITIONS, arrivalMethods: ARRIVAL_METHODS,
    };
  }
  if (method === 'GET' && p === '/v1/reason-codes') {
    return s.reasonCodes.map((rc) => ({
      code: rc.code, name_lat: rc.name, name_am: rc.nameAm, category: rc.category,
      default_urgency: rc.defaultUrgency, min_target_tier: rc.minTargetTier,
      required_capabilities: rc.requiredCapabilities, stabilisation_items: rc.stabilisationItems,
    }));
  }
  if (method === 'GET' && p === '/v1/capabilities') return s.capabilities;

  if (method === 'GET' && p === '/v1/facilities') {
    return s.facilities.map((f) => ({
      id: f.id, mfr_id: f.mfrId, name_lat: f.name, name_am: f.nameAm,
      facility_type: f.type, tier: f.tier, region: f.region, zone: f.zone,
      phone: f.phone, is_24h: f.is24h, has_ambulance: f.hasAmbulance,
      rating: facilityRating(f.id),
    }));
  }
  const mFac = p.match(/^\/v1\/facilities\/([^/]+)$/);
  if (method === 'GET' && mFac) {
    const f = facility(mFac[1]);
    if (!f) err(404, 'Facility not found');
    return {
      ...f, name_lat: f.name, name_am: f.nameAm, facility_type: f.type,
      rating: facilityRating(f.id),
      capabilities: s.facilityCapabilities.filter((fc) => fc.facilityId === f.id).map((fc) => {
        const cap = s.capabilities.find((c) => c.code === fc.code);
        return {
          capability_code: fc.code, name_lat: cap?.name, category: cap?.category,
          status: fc.status, blocking_note: fc.note, verified_at: fc.verifiedAt,
          verified_by: fc.verifiedBy,
          stale: !fc.verifiedAt || (Date.now() - new Date(fc.verifiedAt)) > s.config.capabilityStaleDays * 86400000,
        };
      }).sort((a, b) => (a.category || '').localeCompare(b.category || '') || (a.name_lat || '').localeCompare(b.name_lat || '')),
      capacity: s.capacity.filter((c) => c.facilityId === f.id).map((c) => ({
        ward_type: c.wardType, beds_total: c.bedsTotal, beds_free: c.bedsFree,
        reported_at: c.reportedAt, reported_by: c.reportedBy,
        stale: (Date.now() - new Date(c.reportedAt)) > s.config.capacityStaleHours * 3600000,
      })),
      feedback: s.feedback.filter((fb) => fb.facilityId === f.id).slice(-10).reverse(),
    };
  }

  const mCap = p.match(/^\/v1\/facilities\/([^/]+)\/capabilities\/([^/]+)$/);
  if (method === 'PUT' && mCap) {
    const [, facId, code] = mCap;
    if (user.facilityId !== facId && !['woreda', 'region', 'sysadmin'].includes(user.role)) {
      err(403, 'You may only edit your own facility capability matrix');
    }
    if (!['liaison', 'facility_admin', 'it_admin', 'woreda', 'region', 'sysadmin'].includes(user.role)) {
      err(403, `Role '${user.role}' may not update the capability matrix`);
    }
    if (!['available', 'degraded', 'unavailable', 'unknown'].includes(body?.status)) err(400, 'Invalid capability status');
    let row = s.facilityCapabilities.find((fc) => fc.facilityId === facId && fc.code === code);
    if (!row) { row = { facilityId: facId, code }; s.facilityCapabilities.push(row); }
    row.status = body.status;
    row.note = body.blockingNote ?? (body.status === 'available' ? null : row.note ?? null);
    row.verifiedAt = nowIso();
    row.verifiedBy = `${user.fullName} (${user.role})`;
    audit(user, 'capability_update', 'facility', facId, { code, status: body.status });
    save();
    return { ok: true, facilityId: facId, code, status: body.status };
  }

  const mCapacity = p.match(/^\/v1\/facilities\/([^/]+)\/capacity$/);
  if (method === 'POST' && mCapacity) {
    const facId = mCapacity[1];
    if (user.facilityId !== facId && user.role !== 'sysadmin') err(403, 'You may only report capacity for your own facility');
    if (!['liaison', 'facility_admin', 'triage', 'doctor', 'clinician', 'it_admin', 'sysadmin'].includes(user.role)) {
      err(403, `Role '${user.role}' may not report capacity`);
    }
    let row = s.capacity.find((c) => c.facilityId === facId && c.wardType === body.wardType);
    if (!row) { row = { facilityId: facId, wardType: body.wardType }; s.capacity.push(row); }
    if (body.bedsTotal != null) row.bedsTotal = Number(body.bedsTotal);
    row.bedsFree = Math.max(0, Math.min(Number(body.bedsFree), row.bedsTotal ?? Number(body.bedsFree)));
    row.reportedAt = nowIso();
    row.reportedBy = user.fullName;
    audit(user, 'capacity_report', 'facility', facId, { wardType: body.wardType, bedsFree: row.bedsFree });
    save();
    return { ok: true };
  }

  /* ---------- patients ---------- */
  if (method === 'POST' && p === '/v1/patients/search') {
    const name = (body?.name || '').toLowerCase();
    if (!name) return [];
    return s.patients
      .filter((x) => x.name.toLowerCase().includes(name) || (x.nameAm || '').includes(body.name))
      .slice(0, 20)
      .map((x) => ({
        id: x.id, name: x.name, nameAm: x.nameAm, sex: x.sex,
        age: `${x.ageValue} ${x.ageUnit}`, ageValue: x.ageValue, ageUnit: x.ageUnit,
        cbhiMember: x.cbhiMember, isPregnant: x.isPregnant,
        matchConfidence: x.name.toLowerCase() === name ? 0.85 : 0.6,
        matchMethod: 'name_probabilistic',
        requiresReview: x.name.toLowerCase() !== name,
      }));
  }
  if (method === 'POST' && p === '/v1/patients') {
    if (!body?.givenNameLat && !body?.givenNameAm) err(400, "At least one given name (Latin or Ge'ez) is required");
    if (!body?.sex) err(400, 'sex is required');
    if (!body?.ageValue) err(400, 'Age is required');
    const id = body.id || uuid();
    const name = [body.givenNameLat, body.fathersNameLat, body.grandfathersNameLat].filter(Boolean).join(' ');
    const patient = {
      id, name, nameAm: body.givenNameAm || null, sex: body.sex,
      ageValue: Number(body.ageValue), ageUnit: body.ageUnit || 'years',
      phone: body.phonePrimary || null, phoneOwnerRelation: body.phoneOwnerRelation || 'self',
      cbhiMember: !!body.cbhiMember, isPregnant: !!body.isPregnant,
      region: null, woreda: null, createdAt: nowIso(), createdBy: user.id,
    };
    s.patients.push(patient);
    audit(user, 'create', 'patient', id);
    save();
    return {
      id, name, nameAm: patient.nameAm, sex: patient.sex,
      age: `${patient.ageValue} ${patient.ageUnit}`, cbhiMember: patient.cbhiMember,
      isPregnant: patient.isPregnant, matchConfidence: 1, matchMethod: 'created', requiresReview: false,
    };
  }

  /* ---------- routing ---------- */
  if (method === 'POST' && p === '/v1/routing/suggest') return suggest(body || {}, user);

  /* ---------- referrals ---------- */
  if (method === 'GET' && p === '/v1/referrals') return listReferrals(user, q);
  if (method === 'POST' && p === '/v1/referrals') return createReferral(body || {}, user);

  const mChain = p.match(/^\/v1\/referrals\/([^/]+)\/chain$/);
  if (method === 'GET' && mChain) {
    const r = s.referrals.find((x) => x.id === mChain[1]);
    if (!r) err(404, 'Referral not found');
    return s.referrals.filter((x) => x.chainRootId === r.chainRootId)
      .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
      .map((x) => ({
        id: x.id, referral_code: x.code, parent_referral_id: x.parentId,
        status: x.status, urgency: x.urgency,
        origin_facility_name: facility(x.originFacilityId)?.name,
        target_facility_name: facility(x.targetFacilityId)?.name,
        created_at: x.createdAt,
      }));
  }

  const mAtt = p.match(/^\/v1\/referrals\/([^/]+)\/attachments$/);
  if (method === 'POST' && mAtt) {
    const r = s.referrals.find((x) => x.id === mAtt[1]);
    if (!r) err(404, 'Referral not found');
    actorSide(r, user); // must be a party
    if (isTerminal(r.status)) err(400, 'Closed referrals are immutable (BR-36)');
    const a = body || {};
    if (!a.dataUrl || !a.name) err(400, 'Attachment requires name and dataUrl');
    if ((a.size || 0) > 1_500_000) err(400, 'Attachment too large for the demo build (max ~1.5 MB). Compress the image first.');
    const att = { id: uuid(), name: a.name, type: a.type, size: a.size, dataUrl: a.dataUrl, uploadedBy: user.fullName, uploadedAt: nowIso() };
    r.attachments = r.attachments || [];
    r.attachments.push(att);
    r.transitions.push({ from: r.status, to: r.status, event: 'attachment_added', actorName: user.fullName, at: nowIso(), note: `Attached ${a.name}` });
    r.version += 1;
    audit(user, 'attachment_add', 'referral', r.id, { name: a.name, type: a.type });
    save();
    return hydrate(r, user);
  }

  /* ---------- reception: assignable clinicians & assignment ---------- */
  const mClin = p.match(/^\/v1\/referrals\/([^/]+)\/assignable-clinicians$/);
  if (method === 'GET' && mClin) {
    const r = s.referrals.find((x) => x.id === mClin[1]);
    if (!r) err(404, 'Referral not found');
    if (!RECEPTION_ROLES.includes(user.role) && user.role !== 'sysadmin') {
      err(403, `Role '${user.role}' may not assign referrals — this is the referral reception's responsibility`);
    }
    if (r.targetFacilityId !== user.facilityId && user.role !== 'sysadmin') {
      err(403, 'Only the receiving facility assigns a clinician');
    }
    return s.users
      .filter((u) => u.facilityId === r.targetFacilityId && u.status === 'active'
        && CLINICAL_ROLES.includes(u.role))
      .map((u) => ({
        id: u.id, fullName: u.fullName, role: u.role, title: u.title,
        department: u.department, licenseNumber: u.licenseNumber, phone: u.phone,
        activeCases: s.referrals.filter((x) => x.assignedDoctorId === u.id && !isTerminal(x.status)).length,
      }));
  }

  const mAssign = p.match(/^\/v1\/referrals\/([^/]+)\/assign$/);
  if (method === 'POST' && mAssign) {
    const r = s.referrals.find((x) => x.id === mAssign[1]);
    if (!r) err(404, 'Referral not found');
    if (!RECEPTION_ROLES.includes(user.role) && user.role !== 'sysadmin') {
      err(403, `Role '${user.role}' may not assign referrals — this is the referral reception's responsibility`);
    }
    if (r.targetFacilityId !== user.facilityId && user.role !== 'sysadmin') {
      err(403, 'Only the receiving facility assigns a clinician to a referral');
    }
    if (isTerminal(r.status)) err(400, 'Closed referrals are immutable (BR-36)');
    const doc = s.users.find((u) => u.id === body?.doctorId);
    if (!doc || doc.facilityId !== r.targetFacilityId) {
      err(400, 'That clinician is not registered at the receiving facility');
    }
    if (doc.status !== 'active') err(400, 'That account is not active');
    if (!CLINICAL_ROLES.includes(doc.role)) {
      err(400, { message: 'Referrals can only be assigned to a treating clinician', allowedRoles: CLINICAL_ROLES });
    }
    const reassignment = !!r.assignedDoctorId && r.assignedDoctorId !== doc.id;
    r.assignedDoctorId = doc.id;
    r.assignedDoctorName = doc.fullName;
    r.assignedAt = nowIso();
    r.assignedByName = user.fullName;
    r.assignmentNote = body?.note || null;
    r.version += 1;
    r.transitions.push({
      from: r.status, to: r.status, event: reassignment ? 'reassign' : 'assign',
      actorName: user.fullName, at: nowIso(),
      note: `${reassignment ? 'Reassigned' : 'Assigned'} to ${doc.fullName}`
        + `${body?.note ? ` — ${body.note}` : ''}`,
    });
    notify({
      channel: 'in_app', template: 'referral_assigned', referralId: r.id,
      body: `[${r.urgency.toUpperCase()}] Referral ${r.code} assigned to you by ${user.fullName}.`,
    });
    audit(user, reassignment ? 'referral_reassign' : 'referral_assign', 'referral', r.id, { doctorId: doc.id });
    save();
    return hydrate(r, user);
  }

  const mAct = p.match(/^\/v1\/referrals\/([^/]+)\/([a-z-]+)$/);
  if (method === 'POST' && mAct) {
    const [, id, action] = mAct;
    const eventMap = {
      acknowledge: 'acknowledge', accept: 'accept', decline: 'decline',
      redirect: 'redirect', reroute: 'reroute', cancel: 'cancel',
      depart: 'depart', arrive: 'arrive', 'start-care': 'start_care',
      outcome: 'submit_outcome', 'acknowledge-outcome': 'acknowledge_outcome',
      found: 'found', 'record-death': 'record_death', 'close-declined-all': 'close_declined_all',
      'request-info': 'request_info', 'supply-info': 'supply_info',
    };
    const event = eventMap[action];
    if (!event) err(404, `Unknown action '${action}'`);
    return transition(id, event, body || {}, user);
  }

  const mGet = p.match(/^\/v1\/referrals\/([^/]+)$/);
  if (method === 'GET' && mGet) {
    const r = s.referrals.find((x) => x.id === mGet[1]);
    if (!r) err(404, 'Referral not found');
    if (user.role === 'patient' && r.patientId !== user.patientId) err(403, 'Not your referral');
    if (user.role !== 'patient') {
      const oversight = ['woreda', 'region', 'moh', 'cbhi', 'sysadmin'].includes(user.role);
      const party = r.originFacilityId === user.facilityId || r.targetFacilityId === user.facilityId;
      if (!party && !oversight) err(403, 'BR-51: your facility is not a party to this referral');
      assertMayReadAtTarget(r, user);
    }
    audit(user, 'read_payload', 'referral', r.id);
    save();
    return hydrate(r, user);
  }

  /* ---------- feedback ---------- */
  if (method === 'POST' && p === '/v1/feedback') {
    if (user.role !== 'patient') err(403, 'Only patients can rate their referral experience');
    const r = s.referrals.find((x) => x.id === body?.referralId);
    if (!r) err(404, 'Referral not found');
    if (r.patientId !== user.patientId) err(403, 'Not your referral');
    if (!r.arrivedAt && !isTerminal(r.status)) err(400, 'You can rate after you have been received, or once the referral is closed');
    const results = [];
    for (const item of body.ratings || []) {
      const facilityId = item.facilityRole === 'origin' ? r.originFacilityId : r.targetFacilityId;
      if (!item.rating || item.rating < 1 || item.rating > 5) err(400, 'Rating must be 1–5 stars');
      const existing = s.feedback.find((f) => f.referralId === r.id && f.facilityRole === item.facilityRole);
      if (existing) { existing.rating = item.rating; existing.comment = item.comment || existing.comment; results.push(existing); continue; }
      const fb = {
        id: uuid(), referralId: r.id, patientId: user.patientId, facilityId,
        facilityRole: item.facilityRole, rating: item.rating, comment: item.comment || null, createdAt: nowIso(),
      };
      s.feedback.push(fb);
      results.push(fb);
    }
    audit(user, 'feedback', 'referral', r.id, { count: results.length });
    save();
    return { ok: true, feedback: results };
  }
  /* IT/quality administration only, and only their OWN facility. */
  if (method === 'GET' && p === '/v1/feedback/my-facility') {
    if (!['it_admin', 'sysadmin'].includes(user.role)) {
      err(403, 'Patient feedback is visible to IT/quality administration only');
    }
    const rows = s.feedback.filter((f) => f.facilityId === user.facilityId);
    const rating = facilityRating(user.facilityId);
    return {
      facilityId: user.facilityId,
      avgRating: rating.avg, count: rating.count,
      lowRatings: rows.filter((f) => f.rating <= 2).length,
      items: rows.slice().reverse().map((f) => {
        const r = s.referrals.find((x) => x.id === f.referralId);
        return {
          id: f.id, rating: f.rating, comment: f.comment,
          facilityRole: f.facilityRole, createdAt: f.createdAt,
          referralCode: r?.code, reasonCode: r?.reasonCode,
          urgency: r?.urgency, referralStatus: r?.status,
          fromFacility: facility(r?.originFacilityId)?.name,
          toFacility: facility(r?.targetFacilityId)?.name,
          referringDoctor: r?.referringUserName,
          referringDoctorLicense: r?.referringUserLicense,
        };
      }),
    };
  }

  /* ---------- patient portal ---------- */
  if (method === 'GET' && p === '/v1/portal/me') {
    if (user.role !== 'patient') err(403, 'Patient portal is for patient accounts');
    const patient = s.patients.find((x) => x.id === user.patientId);
    const referrals = s.referrals.filter((r) => r.patientId === user.patientId)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .map((r) => hydrate(r, user));
    return { patient, referrals };
  }

  /* ---------- user management (IT admin) ---------- */
  if (method === 'GET' && p === '/v1/users') {
    if (!['it_admin', 'facility_admin', 'sysadmin'].includes(user.role)) err(403, 'Only IT administrators manage accounts');
    const rows = user.role === 'sysadmin' ? s.users : s.users.filter((u) => u.facilityId === user.facilityId);
    return rows.filter((u) => u.role !== 'patient').map(({ password, ...u }) => ({ ...u, facilityName: facility(u.facilityId)?.name || null }));
  }
  if (method === 'POST' && p === '/v1/users') {
    if (!['it_admin', 'sysadmin'].includes(user.role)) err(403, 'Only IT administrators can register staff');
    const facId = user.role === 'sysadmin' ? (body.facilityId || user.facilityId) : user.facilityId; // IT can only register to OWN facility
    if (!body?.username || !body?.fullName || !body?.role) err(400, 'username, fullName and role are required');
    if (['sysadmin', 'patient'].includes(body.role)) err(400, 'That role cannot be created here');
    if (s.users.find((u) => u.username === body.username.toLowerCase())) err(409, 'Username already taken');
    if (['doctor', 'specialist'].includes(body.role) && !body.licenseNumber) {
      err(400, { message: 'A clinical role requires the MoH professional license number', hint: 'The license is checked against the national register during verification.' });
    }
    const nu = {
      id: uuid(), username: body.username.toLowerCase(), fullName: body.fullName,
      role: body.role, facilityId: facId, phone: body.phone || null,
      title: body.title || null, department: body.department || null,
      licenseNumber: body.licenseNumber || null,
      status: 'pending', createdAt: nowIso(), verifiedAt: null, verifiedBy: null,
      password: 'Password123!',
    };
    s.users.push(nu);
    audit(user, 'user_register', 'app_user', nu.id, { role: nu.role, facility: facId });
    save();
    const { password, ...safe } = nu;
    return { ...safe, note: 'Account created in PENDING state — verify to activate. Demo password: Password123!' };
  }
  const mUser = p.match(/^\/v1\/users\/([^/]+)\/(verify|deactivate|reactivate)$/);
  if (method === 'POST' && mUser) {
    if (!['it_admin', 'sysadmin'].includes(user.role)) err(403, 'Only IT administrators manage account status');
    const target = s.users.find((u) => u.id === mUser[1]);
    if (!target) err(404, 'User not found');
    if (user.role !== 'sysadmin' && target.facilityId !== user.facilityId) err(403, 'You can only manage accounts registered to your own facility');
    if (mUser[2] === 'verify') {
      target.status = 'active'; target.verifiedAt = nowIso(); target.verifiedBy = user.fullName;
    } else if (mUser[2] === 'deactivate') {
      if (target.id === user.id) err(400, 'You cannot deactivate your own account');
      target.status = 'disabled';
    } else { target.status = 'active'; }
    audit(user, `user_${mUser[2]}`, 'app_user', target.id);
    save();
    const { password, ...safe } = target;
    return safe;
  }

  /* ---------- notifications (SMS simulation log) ---------- */
  if (method === 'GET' && p === '/v1/notifications') {
    return s.notifications.slice(-30).reverse();
  }

  /* ---------- analytics: one route, a different depth per role ---------- */
  if (method === 'GET' && p === '/v1/analytics/overview') {
    if (['woreda', 'region', 'moh', 'sysadmin'].includes(user.role)) {
      return { scope: 'network_flow', ...metrics(q) };
    }
    if (user.role === 'it_admin') {
      return { scope: 'it_facility_detail', facilityName: user.facilityName, ...metrics({ facilityId: user.facilityId }) };
    }
    if (['liaison', 'triage', 'facility_admin'].includes(user.role)) {
      const own = (pred) => s.referrals.filter(pred).length;
      return {
        scope: 'facility_operations',
        viewer: { name: user.fullName, role: user.role, facilityName: user.facilityName },
        queue: {
          awaitingAssignment: own((r) => r.targetFacilityId === user.facilityId
            && !r.assignedDoctorId && !isTerminal(r.status)),
          inboundAwaitingDecision: own((r) => r.targetFacilityId === user.facilityId && ['SUBMITTED', 'ESCALATED'].includes(r.status)),
          inboundEscalated: own((r) => r.targetFacilityId === user.facilityId && r.status === 'ESCALATED'),
          acceptedAwaitingArrival: own((r) => r.targetFacilityId === user.facilityId && r.status === 'ACCEPTED'),
          inTransit: own((r) => r.targetFacilityId === user.facilityId && r.status === 'IN_TRANSIT'),
          outcomesDue: own((r) => r.targetFacilityId === user.facilityId && ['ARRIVED', 'IN_CARE'].includes(r.status) && !r.outcomeSubmittedAt),
          bedsReserved: own((r) => r.targetFacilityId === user.facilityId && r.bedReserved),
          outboundAwaiting: own((r) => r.originFacilityId === user.facilityId && SLA_ACTIVE_STATES.includes(r.status)),
          outboundToAcknowledge: own((r) => r.originFacilityId === user.facilityId && r.outcomeSubmittedAt && !r.outcomeAcknowledgedAt),
        },
        capacity: s.capacity.filter((c) => c.facilityId === user.facilityId).map((c) => ({
          ward_type: c.wardType, beds_total: c.bedsTotal, beds_free: c.bedsFree, reported_at: c.reportedAt,
        })),
      };
    }
    if (['doctor', 'clinician', 'specialist', 'hew'].includes(user.role)) {
      const mine = s.referrals.filter((r) => r.referringUserId === user.id);
      const terminal = mine.filter((r) => isTerminal(r.status) && r.status !== 'CLOSED_CANCELLED');
      const closed = mine.filter((r) => r.status === 'CLOSED_COMPLETED');
      const assigned = s.referrals.filter((r) => r.assignedDoctorId === user.id);
      return {
        scope: 'my_referrals',
        viewer: { name: user.fullName, role: user.role, facilityName: user.facilityName },
        assignedToMe: {
          total: assigned.length,
          open: assigned.filter((r) => !isTerminal(r.status)).length,
          needsResponse: assigned.filter((r) => SLA_ACTIVE_STATES.includes(r.status)).length,
          openEmergencies: assigned.filter((r) => r.urgency === 'emergency' && !isTerminal(r.status)).length,
          outcomesDue: assigned.filter((r) => ['ARRIVED', 'IN_CARE'].includes(r.status) && !r.outcomeSubmittedAt).length,
        },
        totals: {
          sent: mine.length,
          loopsClosed: closed.length,
          emergencies: mine.filter((r) => r.urgency === 'emergency').length,
          awaitingResponse: mine.filter((r) => SLA_ACTIVE_STATES.includes(r.status)).length,
          awaitingReroute: mine.filter((r) => r.status === 'DECLINED').length,
          outcomesToAcknowledge: mine.filter((r) => r.outcomeSubmittedAt && !r.outcomeAcknowledgedAt).length,
        },
        myLoopClosureRatePct: terminal.length ? Math.round((closed.length / terminal.length) * 1000) / 10 : null,
        byStatus: Object.entries(mine.reduce((a, r) => { a[r.status] = (a[r.status] || 0) + 1; return a; }, {}))
          .map(([status, n]) => ({ status, n })).sort((a, b) => b.n - a.n),
      };
    }
    err(403, `Role '${user.role}' has no analytics view`);
  }
  const mAn = p.match(/^\/v1\/analytics\/facility\/([^/]+)$/);
  if (method === 'GET' && mAn) {
    const own = user.facilityId === mAn[1];
    if (!['woreda', 'region', 'moh', 'sysadmin'].includes(user.role) && !(own && ['it_admin', 'facility_admin'].includes(user.role))) {
      err(403, "Detailed facility analytics are limited to oversight and the facility's own IT administration");
    }
    return metrics({ facilityId: mAn[1] });
  }

  err(404, `Demo API: no route for ${method} ${p}`);
}
