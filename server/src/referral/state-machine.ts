/**
 * Referral state machine — blueprint §10.1 / §10.2
 * Harmonised with IHE 360X / HL7 BSeR referral Task states.
 *
 * This file is intentionally pure (no DB, no framework) so every business
 * rule can be unit-tested in isolation. NFR-MNT-01: 100% coverage required here.
 */

export const STATES = [
  'DRAFT',
  'SUBMITTED',
  'ESCALATED',
  'ACKNOWLEDGED',
  'INFO_REQUESTED',
  'ACCEPTED',
  'ACCEPTED_LAPSED',
  'DECLINED',
  'REDIRECTED',
  'IN_TRANSIT',
  'ARRIVED',
  'NOT_ARRIVED',
  'IN_CARE',
  'OUTCOME_RETURNED',
  'REFERRED_ONWARD',
  'CLOSED_COMPLETED',
  'CLOSED_NOT_ARRIVED',
  'CLOSED_DECLINED_ALL',
  'CLOSED_CANCELLED',
  'CLOSED_DECEASED',
  'CLOSED_LOST_TO_FOLLOWUP',
] as const;

export type ReferralState = (typeof STATES)[number];

export const EVENTS = [
  'submit', 'sla_breach', 'acknowledge', 'accept', 'decline', 'redirect',
  'request_info', 'supply_info', 'reroute', 'cancel', 'depart',
  'reservation_lapse', 'arrive', 'grace_expiry', 'found', 'lost_timeout',
  'start_care', 'submit_outcome', 'acknowledge_outcome', 'refer_onward',
  'record_death', 'close_declined_all',
] as const;

export type ReferralEvent = (typeof EVENTS)[number];

interface Transition {
  from: ReferralState;
  event: ReferralEvent;
  to: ReferralState;
  /** Actor side permitted to fire this transition. */
  actor: 'origin' | 'target' | 'system' | 'any';
}

export const TRANSITIONS: Transition[] = [
  // --- creation & submission
  { from: 'DRAFT',          event: 'submit',        to: 'SUBMITTED',     actor: 'origin' },
  { from: 'DRAFT',          event: 'cancel',        to: 'CLOSED_CANCELLED', actor: 'origin' },

  // --- awaiting response
  { from: 'SUBMITTED',      event: 'acknowledge',   to: 'ACKNOWLEDGED',  actor: 'target' },
  { from: 'SUBMITTED',      event: 'sla_breach',    to: 'ESCALATED',     actor: 'system' },
  { from: 'SUBMITTED',      event: 'cancel',        to: 'CLOSED_CANCELLED', actor: 'origin' },
  // BR-24: emergency may be accepted/declined directly without explicit ack
  { from: 'SUBMITTED',      event: 'accept',        to: 'ACCEPTED',      actor: 'target' },
  { from: 'SUBMITTED',      event: 'decline',       to: 'DECLINED',      actor: 'target' },

  { from: 'ESCALATED',      event: 'acknowledge',   to: 'ACKNOWLEDGED',  actor: 'target' },
  { from: 'ESCALATED',      event: 'accept',        to: 'ACCEPTED',      actor: 'target' },
  { from: 'ESCALATED',      event: 'decline',       to: 'DECLINED',      actor: 'target' },
  { from: 'ESCALATED',      event: 'reroute',       to: 'SUBMITTED',     actor: 'origin' },
  { from: 'ESCALATED',      event: 'cancel',        to: 'CLOSED_CANCELLED', actor: 'origin' },

  // --- decision
  { from: 'ACKNOWLEDGED',   event: 'accept',        to: 'ACCEPTED',      actor: 'target' },
  { from: 'ACKNOWLEDGED',   event: 'decline',       to: 'DECLINED',      actor: 'target' },
  { from: 'ACKNOWLEDGED',   event: 'redirect',      to: 'REDIRECTED',    actor: 'target' },
  { from: 'ACKNOWLEDGED',   event: 'request_info',  to: 'INFO_REQUESTED', actor: 'target' },
  { from: 'ACKNOWLEDGED',   event: 'cancel',        to: 'CLOSED_CANCELLED', actor: 'origin' },

  { from: 'INFO_REQUESTED', event: 'supply_info',   to: 'ACKNOWLEDGED',  actor: 'origin' },
  { from: 'INFO_REQUESTED', event: 'cancel',        to: 'CLOSED_CANCELLED', actor: 'origin' },

  // --- declined path (BR-24: never leave an emergency sitting declined)
  { from: 'DECLINED',       event: 'reroute',            to: 'SUBMITTED',           actor: 'origin' },
  { from: 'DECLINED',       event: 'close_declined_all', to: 'CLOSED_DECLINED_ALL', actor: 'origin' },

  // --- redirect spawns a child node; this node terminates
  { from: 'REDIRECTED',     event: 'reroute',       to: 'SUBMITTED',     actor: 'system' },

  // --- accepted -> transit
  { from: 'ACCEPTED',       event: 'depart',            to: 'IN_TRANSIT',      actor: 'origin' },
  { from: 'ACCEPTED',       event: 'reservation_lapse', to: 'ACCEPTED_LAPSED', actor: 'system' },
  { from: 'ACCEPTED',       event: 'cancel',            to: 'CLOSED_CANCELLED', actor: 'origin' },
  // patient may self-present without a recorded departure
  { from: 'ACCEPTED',       event: 'arrive',        to: 'ARRIVED',       actor: 'target' },
  { from: 'ACCEPTED_LAPSED', event: 'reroute',      to: 'SUBMITTED',     actor: 'origin' },

  // --- transit -> arrival
  { from: 'IN_TRANSIT',     event: 'arrive',        to: 'ARRIVED',       actor: 'target' },
  { from: 'IN_TRANSIT',     event: 'grace_expiry',  to: 'NOT_ARRIVED',   actor: 'system' },
  { from: 'IN_TRANSIT',     event: 'record_death',  to: 'CLOSED_DECEASED', actor: 'any' },

  { from: 'NOT_ARRIVED',    event: 'found',         to: 'ARRIVED',       actor: 'any' },
  // A traced patient may simply be confirmed at the desk; accept either event.
  { from: 'NOT_ARRIVED',    event: 'arrive',        to: 'ARRIVED',       actor: 'any' },
  { from: 'NOT_ARRIVED',    event: 'lost_timeout',  to: 'CLOSED_LOST_TO_FOLLOWUP', actor: 'system' },

  // --- care
  { from: 'ARRIVED',        event: 'start_care',    to: 'IN_CARE',       actor: 'target' },
  { from: 'ARRIVED',        event: 'submit_outcome', to: 'OUTCOME_RETURNED', actor: 'target' },
  { from: 'ARRIVED',        event: 'record_death',  to: 'CLOSED_DECEASED', actor: 'target' },

  { from: 'IN_CARE',        event: 'submit_outcome', to: 'OUTCOME_RETURNED', actor: 'target' },
  { from: 'IN_CARE',        event: 'refer_onward',  to: 'REFERRED_ONWARD', actor: 'target' },
  { from: 'IN_CARE',        event: 'record_death',  to: 'CLOSED_DECEASED', actor: 'target' },

  // --- loop closure
  { from: 'OUTCOME_RETURNED', event: 'acknowledge_outcome', to: 'CLOSED_COMPLETED', actor: 'origin' },
  { from: 'REFERRED_ONWARD',  event: 'submit_outcome',      to: 'OUTCOME_RETURNED', actor: 'target' },

  // --- system closure of stale not-arrived
  { from: 'NOT_ARRIVED',    event: 'grace_expiry',  to: 'CLOSED_NOT_ARRIVED', actor: 'system' },
];

/** States that are terminal (no further transitions). */
export const TERMINAL_STATES: ReferralState[] = [
  'CLOSED_COMPLETED', 'CLOSED_NOT_ARRIVED', 'CLOSED_DECLINED_ALL',
  'CLOSED_CANCELLED', 'CLOSED_DECEASED', 'CLOSED_LOST_TO_FOLLOWUP',
];

/** Terminal states counted in the loop-closure denominator (Appendix C). */
export const COUNTABLE_TERMINAL_STATES: ReferralState[] = TERMINAL_STATES.filter(
  (s) => s !== 'CLOSED_CANCELLED',
);

/** States where the SLA clock is running. */
export const SLA_ACTIVE_STATES: ReferralState[] = ['SUBMITTED', 'ESCALATED', 'ACKNOWLEDGED'];

export function isTerminal(state: ReferralState): boolean {
  return TERMINAL_STATES.includes(state);
}

export function allowedEvents(state: ReferralState): ReferralEvent[] {
  return TRANSITIONS.filter((t) => t.from === state).map((t) => t.event);
}

export interface TransitionCheck {
  ok: boolean;
  to?: ReferralState;
  actor?: Transition['actor'];
  error?: string;
}

/**
 * Resolve a transition. Server-authoritative (blueprint §12.4): a client may
 * *request* a transition, only this function decides whether it happens.
 */
export function resolve(
  from: ReferralState,
  event: ReferralEvent,
  actorSide: 'origin' | 'target' | 'system',
): TransitionCheck {
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
      error: `Actor side '${actorSide}' may not fire '${event}' from '${from}' (requires ${candidates
        .map((c) => c.actor)
        .join(' or ')})`,
    };
  }
  return { ok: true, to: match.to, actor: match.actor };
}

/* --------------------------------------------------- CONTROLLED VOCABULARY */

/** BR-23 decline reasons. Free-text declines are rejected by the API. */
export const DECLINE_REASONS = [
  'no_bed',
  'no_specialist',
  'equipment_down',
  'no_supplies',
  'outside_catchment',
  'wrong_tier',
  'capacity_exceeded',
  'patient_should_be_treated_locally',
  'other',
] as const;

export const OVERRIDE_REASONS = [
  'patient_preference',
  'family_located_there',
  'transport_availability',
  'known_specialist',
  'previous_care_there',
  'suggested_facility_unreachable',
  'cost_considerations',
  'other',
] as const;

export const TIER_SKIP_REASONS = [
  'emergency_life_threatening',
  'intermediate_facility_lacks_capability',
  'intermediate_facility_closed',
  'intermediate_facility_declined_previously',
  'patient_already_assessed_at_intermediate',
  'other',
] as const;

export const TRANSPORT_MODES = [
  'ambulance', 'public', 'private', 'walk', 'stretcher', 'animal', 'other',
] as const;

export const DISPOSITIONS = [
  'discharged_home', 'admitted', 'referred_onward', 'back_referred',
  'absconded', 'died', 'dama',
] as const;

export const ARRIVAL_METHODS = ['qr_scan', 'code_entry', 'attestation'] as const;
