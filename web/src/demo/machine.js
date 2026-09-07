/**
 * Referral state machine — direct JS port of server/src/referral/state-machine.ts
 * (blueprint §10.1/§10.2, harmonised with IHE 360X / HL7 BSeR).
 * Kept pure so the in-browser demo enforces exactly the same rules as the API.
 */

export const TRANSITIONS = [
  { from: 'DRAFT', event: 'submit', to: 'SUBMITTED', actor: 'origin' },
  { from: 'DRAFT', event: 'cancel', to: 'CLOSED_CANCELLED', actor: 'origin' },

  { from: 'SUBMITTED', event: 'acknowledge', to: 'ACKNOWLEDGED', actor: 'target' },
  { from: 'SUBMITTED', event: 'sla_breach', to: 'ESCALATED', actor: 'system' },
  { from: 'SUBMITTED', event: 'cancel', to: 'CLOSED_CANCELLED', actor: 'origin' },
  { from: 'SUBMITTED', event: 'accept', to: 'ACCEPTED', actor: 'target' },
  { from: 'SUBMITTED', event: 'decline', to: 'DECLINED', actor: 'target' },

  { from: 'ESCALATED', event: 'acknowledge', to: 'ACKNOWLEDGED', actor: 'target' },
  { from: 'ESCALATED', event: 'accept', to: 'ACCEPTED', actor: 'target' },
  { from: 'ESCALATED', event: 'decline', to: 'DECLINED', actor: 'target' },
  { from: 'ESCALATED', event: 'reroute', to: 'SUBMITTED', actor: 'origin' },
  { from: 'ESCALATED', event: 'cancel', to: 'CLOSED_CANCELLED', actor: 'origin' },

  { from: 'ACKNOWLEDGED', event: 'accept', to: 'ACCEPTED', actor: 'target' },
  { from: 'ACKNOWLEDGED', event: 'decline', to: 'DECLINED', actor: 'target' },
  { from: 'ACKNOWLEDGED', event: 'redirect', to: 'REDIRECTED', actor: 'target' },
  { from: 'ACKNOWLEDGED', event: 'request_info', to: 'INFO_REQUESTED', actor: 'target' },
  { from: 'ACKNOWLEDGED', event: 'cancel', to: 'CLOSED_CANCELLED', actor: 'origin' },

  { from: 'INFO_REQUESTED', event: 'supply_info', to: 'ACKNOWLEDGED', actor: 'origin' },
  { from: 'INFO_REQUESTED', event: 'cancel', to: 'CLOSED_CANCELLED', actor: 'origin' },

  { from: 'DECLINED', event: 'reroute', to: 'SUBMITTED', actor: 'origin' },
  { from: 'DECLINED', event: 'close_declined_all', to: 'CLOSED_DECLINED_ALL', actor: 'origin' },

  { from: 'REDIRECTED', event: 'reroute', to: 'SUBMITTED', actor: 'system' },

  { from: 'ACCEPTED', event: 'depart', to: 'IN_TRANSIT', actor: 'origin' },
  { from: 'ACCEPTED', event: 'reservation_lapse', to: 'ACCEPTED_LAPSED', actor: 'system' },
  { from: 'ACCEPTED', event: 'cancel', to: 'CLOSED_CANCELLED', actor: 'origin' },
  { from: 'ACCEPTED', event: 'arrive', to: 'ARRIVED', actor: 'target' },
  { from: 'ACCEPTED_LAPSED', event: 'reroute', to: 'SUBMITTED', actor: 'origin' },

  { from: 'IN_TRANSIT', event: 'arrive', to: 'ARRIVED', actor: 'target' },
  { from: 'IN_TRANSIT', event: 'grace_expiry', to: 'NOT_ARRIVED', actor: 'system' },
  { from: 'IN_TRANSIT', event: 'record_death', to: 'CLOSED_DECEASED', actor: 'any' },

  { from: 'NOT_ARRIVED', event: 'found', to: 'ARRIVED', actor: 'any' },
  { from: 'NOT_ARRIVED', event: 'arrive', to: 'ARRIVED', actor: 'any' },
  { from: 'NOT_ARRIVED', event: 'lost_timeout', to: 'CLOSED_LOST_TO_FOLLOWUP', actor: 'system' },
  { from: 'NOT_ARRIVED', event: 'grace_expiry', to: 'CLOSED_NOT_ARRIVED', actor: 'system' },

  { from: 'ARRIVED', event: 'start_care', to: 'IN_CARE', actor: 'target' },
  { from: 'ARRIVED', event: 'submit_outcome', to: 'OUTCOME_RETURNED', actor: 'target' },
  { from: 'ARRIVED', event: 'record_death', to: 'CLOSED_DECEASED', actor: 'target' },

  { from: 'IN_CARE', event: 'submit_outcome', to: 'OUTCOME_RETURNED', actor: 'target' },
  { from: 'IN_CARE', event: 'refer_onward', to: 'REFERRED_ONWARD', actor: 'target' },
  { from: 'IN_CARE', event: 'record_death', to: 'CLOSED_DECEASED', actor: 'target' },

  { from: 'OUTCOME_RETURNED', event: 'acknowledge_outcome', to: 'CLOSED_COMPLETED', actor: 'origin' },
  { from: 'REFERRED_ONWARD', event: 'submit_outcome', to: 'OUTCOME_RETURNED', actor: 'target' },
];

export const TERMINAL_STATES = [
  'CLOSED_COMPLETED', 'CLOSED_NOT_ARRIVED', 'CLOSED_DECLINED_ALL',
  'CLOSED_CANCELLED', 'CLOSED_DECEASED', 'CLOSED_LOST_TO_FOLLOWUP',
];

export const SLA_ACTIVE_STATES = ['SUBMITTED', 'ESCALATED', 'ACKNOWLEDGED'];

export const isTerminal = (s) => TERMINAL_STATES.includes(s);
export const allowedEvents = (s) => TRANSITIONS.filter((t) => t.from === s).map((t) => t.event);

export function resolve(from, event, actorSide) {
  if (isTerminal(from)) {
    return { ok: false, error: `Referral is in terminal state ${from}; no further transitions allowed` };
  }
  const candidates = TRANSITIONS.filter((t) => t.from === from && t.event === event);
  if (!candidates.length) {
    return {
      ok: false,
      error: `Event '${event}' is not valid from state '${from}'. Allowed: ${allowedEvents(from).join(', ') || 'none'}`,
    };
  }
  const match = candidates.find(
    (t) => t.actor === 'any' || t.actor === actorSide || (actorSide === 'system' && t.actor === 'system'),
  );
  if (!match) {
    return {
      ok: false,
      error: `Actor side '${actorSide}' may not fire '${event}' from '${from}' (requires ${candidates.map((c) => c.actor).join(' or ')})`,
    };
  }
  return { ok: true, to: match.to, actor: match.actor };
}

/* --------------------------------------------------- controlled vocabulary */
export const DECLINE_REASONS = [
  'no_bed', 'no_specialist', 'equipment_down', 'no_supplies', 'outside_catchment',
  'wrong_tier', 'capacity_exceeded', 'patient_should_be_treated_locally', 'other',
];

export const OVERRIDE_REASONS = [
  'patient_preference', 'family_located_there', 'transport_availability',
  'known_specialist', 'previous_care_there', 'suggested_facility_unreachable',
  'cost_considerations', 'other',
];

export const TIER_SKIP_REASONS = [
  'emergency_life_threatening', 'intermediate_facility_lacks_capability',
  'intermediate_facility_closed', 'intermediate_facility_declined_previously',
  'patient_already_assessed_at_intermediate', 'other',
];

export const TRANSPORT_MODES = ['ambulance', 'public', 'private', 'walk', 'stretcher', 'animal', 'other'];

export const DISPOSITIONS = [
  'discharged_home', 'admitted', 'referred_onward', 'back_referred', 'absconded', 'died', 'dama',
];

export const ARRIVAL_METHODS = ['qr_scan', 'code_entry', 'attestation'];
