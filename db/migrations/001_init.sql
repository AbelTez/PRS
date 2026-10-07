-- Ethio Referral Linkage — core schema (blueprint §14)
-- PostgreSQL 14+ ; PostGIS optional (falls back to haversine if absent)

CREATE EXTENSION IF NOT EXISTS pgcrypto;
DO $$ BEGIN
  CREATE EXTENSION IF NOT EXISTS postgis;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'PostGIS not available - using haversine fallback';
END $$;

-- ============================================================ ADMIN GEOGRAPHY
CREATE TABLE admin_unit (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id   UUID REFERENCES admin_unit(id),
  level       TEXT NOT NULL CHECK (level IN ('region','zone','woreda','kebele')),
  name_lat    TEXT NOT NULL,
  name_am     TEXT,
  code        TEXT UNIQUE
);
CREATE INDEX idx_admin_parent ON admin_unit(parent_id);

-- ============================================================ FACILITIES
CREATE TABLE facility (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mfr_id            TEXT UNIQUE NOT NULL,
  name_lat          TEXT NOT NULL,
  name_am           TEXT,
  facility_type     TEXT NOT NULL CHECK (facility_type IN
                      ('health_post','health_centre','primary_hospital',
                       'general_hospital','specialised_hospital')),
  tier              SMALLINT NOT NULL CHECK (tier BETWEEN 1 AND 5),
  ownership         TEXT NOT NULL DEFAULT 'public',
  region_id         UUID REFERENCES admin_unit(id),
  zone_id           UUID REFERENCES admin_unit(id),
  woreda_id         UUID REFERENCES admin_unit(id),
  latitude          NUMERIC(9,6),
  longitude         NUMERIC(9,6),
  phone             TEXT,
  is_24h            BOOLEAN NOT NULL DEFAULT FALSE,
  has_ambulance     BOOLEAN NOT NULL DEFAULT FALSE,
  parent_phcu_id    UUID REFERENCES facility(id),
  mfr_synced_at     TIMESTAMPTZ,
  status            TEXT NOT NULL DEFAULT 'active',
  offline_declared  BOOLEAN NOT NULL DEFAULT FALSE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_facility_woreda_tier ON facility(woreda_id, tier);
CREATE INDEX idx_facility_latlng ON facility(latitude, longitude);

CREATE TABLE capability (
  code      TEXT PRIMARY KEY,
  name_lat  TEXT NOT NULL,
  name_am   TEXT,
  category  TEXT NOT NULL,
  tier_min  SMALLINT NOT NULL DEFAULT 1
);

CREATE TABLE facility_capability (
  facility_id     UUID NOT NULL REFERENCES facility(id) ON DELETE CASCADE,
  capability_code TEXT NOT NULL REFERENCES capability(code),
  status          TEXT NOT NULL CHECK (status IN ('available','degraded','unavailable','unknown')),
  blocking_note   TEXT,
  verified_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  verified_by     UUID,
  PRIMARY KEY (facility_id, capability_code)
);
CREATE INDEX idx_fc_available ON facility_capability(capability_code, facility_id)
  WHERE status = 'available';

CREATE TABLE facility_capacity (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id UUID NOT NULL REFERENCES facility(id) ON DELETE CASCADE,
  ward_type   TEXT NOT NULL CHECK (ward_type IN ('general','maternity','paediatric','icu','isolation')),
  beds_total  SMALLINT,
  beds_free   SMALLINT,
  reported_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reported_by UUID
);
CREATE INDEX idx_capacity_recent ON facility_capacity(facility_id, ward_type, reported_at DESC);

-- ============================================================ USERS
CREATE TABLE app_user (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username      TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  full_name     TEXT NOT NULL,
  role          TEXT NOT NULL CHECK (role IN
                  ('hew','clinician','liaison','triage','specialist',
                   'facility_admin','woreda','region','moh','cbhi','sysadmin')),
  facility_id   UUID REFERENCES facility(id),
  phone         TEXT,
  status        TEXT NOT NULL DEFAULT 'active',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================ PATIENTS
CREATE TABLE patient (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fayda_id_enc          BYTEA,
  fayda_id_hash         TEXT UNIQUE,
  echis_member_id       TEXT,
  given_name_lat        TEXT,
  given_name_am         TEXT,
  fathers_name_lat      TEXT,
  fathers_name_am       TEXT,
  grandfathers_name_lat TEXT,
  grandfathers_name_am  TEXT,
  name_search           TEXT,
  sex                   TEXT NOT NULL CHECK (sex IN ('male','female')),
  date_of_birth_gc      DATE,
  date_of_birth_ec      TEXT,
  age_value             SMALLINT,
  age_unit              TEXT CHECK (age_unit IN ('years','months','days')),
  phone_primary_enc     BYTEA,
  phone_primary_hash    TEXT,
  phone_alternate_enc   BYTEA,
  phone_owner_relation  TEXT,
  region_id  UUID REFERENCES admin_unit(id),
  zone_id    UUID REFERENCES admin_unit(id),
  woreda_id  UUID REFERENCES admin_unit(id),
  kebele_id  UUID REFERENCES admin_unit(id),
  address_detail        TEXT,
  cbhi_member           BOOLEAN NOT NULL DEFAULT FALSE,
  cbhi_member_id_enc    BYTEA,
  is_pregnant           BOOLEAN,
  merged_into_id        UUID REFERENCES patient(id),
  is_test_data          BOOLEAN NOT NULL DEFAULT FALSE,
  created_by            UUID REFERENCES app_user(id),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_patient_name ON patient USING GIN (to_tsvector('simple', coalesce(name_search,'')));
CREATE INDEX idx_patient_phone ON patient(phone_primary_hash);
CREATE INDEX idx_patient_woreda ON patient(woreda_id);

-- ============================================================ REFERRAL CORE
CREATE TABLE referral (
  id                        UUID PRIMARY KEY,
  referral_code             TEXT UNIQUE NOT NULL,
  parent_referral_id        UUID REFERENCES referral(id),
  chain_root_id             UUID NOT NULL,
  episode_id                UUID,

  patient_id                UUID NOT NULL REFERENCES patient(id),

  status                    TEXT NOT NULL,
  urgency                   TEXT NOT NULL CHECK (urgency IN ('emergency','urgent','routine')),
  referral_type             TEXT NOT NULL CHECK (referral_type IN ('up','down','lateral','diagnostic','specimen')),

  origin_facility_id        UUID NOT NULL REFERENCES facility(id),
  origin_facility_tier      SMALLINT NOT NULL,
  origin_facility_name      TEXT NOT NULL,
  referring_user_id         UUID NOT NULL REFERENCES app_user(id),
  referring_user_name       TEXT NOT NULL,
  referring_user_phone      TEXT,

  target_facility_id        UUID NOT NULL REFERENCES facility(id),
  target_facility_tier      SMALLINT NOT NULL,
  target_facility_name      TEXT NOT NULL,
  suggested_facility_ids    UUID[],
  suggestion_rank_of_chosen SMALLINT,
  override_reason           TEXT,
  tier_skip_reason          TEXT,
  distance_km               NUMERIC(7,2),
  estimated_travel_minutes  INTEGER,

  reason_code               TEXT NOT NULL,
  reason_free_text          TEXT,
  provisional_diagnosis     TEXT NOT NULL,
  icd_code                  TEXT,
  required_capabilities     TEXT[] NOT NULL DEFAULT '{}',
  sensitivity_flag          TEXT NOT NULL DEFAULT 'none',

  clinical                  JSONB NOT NULL DEFAULT '{}'::jsonb,
  pre_referral              JSONB NOT NULL DEFAULT '{}'::jsonb,
  emergency_override        BOOLEAN NOT NULL DEFAULT FALSE,
  emergency_override_reason TEXT,

  sla_deadline_at           TIMESTAMPTZ,
  sla_breached              BOOLEAN NOT NULL DEFAULT FALSE,
  escalation_level          SMALLINT NOT NULL DEFAULT 0,

  acknowledged_at           TIMESTAMPTZ,
  acknowledged_by           UUID REFERENCES app_user(id),
  decision                  TEXT CHECK (decision IN ('accepted','declined','redirected')),
  decision_at               TIMESTAMPTZ,
  decision_by               UUID REFERENCES app_user(id),
  decline_reason            TEXT,
  decline_note              TEXT,
  redirect_target_facility_id UUID REFERENCES facility(id),
  bed_reserved              BOOLEAN NOT NULL DEFAULT FALSE,
  bed_reservation_expires_at TIMESTAMPTZ,
  receiving_clinician_name  TEXT,
  receiving_clinician_phone TEXT,

  departed_at               TIMESTAMPTZ,
  transport_mode            TEXT,
  escort_type               TEXT,
  expected_arrival_at       TIMESTAMPTZ,
  arrived_at                TIMESTAMPTZ,
  arrival_confirmed_by      UUID REFERENCES app_user(id),
  arrival_method            TEXT,
  transit_minutes           INTEGER,

  outcome                   JSONB,
  outcome_submitted_at      TIMESTAMPTZ,
  outcome_submitted_by      UUID REFERENCES app_user(id),
  outcome_acknowledged_at   TIMESTAMPTZ,
  outcome_acknowledged_by   UUID REFERENCES app_user(id),

  lawful_basis              TEXT NOT NULL DEFAULT 'consent'
                              CHECK (lawful_basis IN ('consent','vital_interest','legal_obligation')),
  consent_captured_at       TIMESTAMPTZ,
  consent_method            TEXT,

  self_referred             BOOLEAN NOT NULL DEFAULT FALSE,
  created_offline           BOOLEAN NOT NULL DEFAULT FALSE,
  client_created_at         TIMESTAMPTZ,
  synced_at                 TIMESTAMPTZ,
  sync_lag_minutes          INTEGER,
  validity_token            TEXT,
  is_test_data              BOOLEAN NOT NULL DEFAULT FALSE,
  version                   INTEGER NOT NULL DEFAULT 1,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_referral_inbound  ON referral(target_facility_id, status, urgency, created_at DESC)
  WHERE is_test_data = FALSE;
CREATE INDEX idx_referral_outbound ON referral(origin_facility_id, status, created_at DESC)
  WHERE is_test_data = FALSE;
CREATE INDEX idx_referral_chain    ON referral(chain_root_id);
CREATE INDEX idx_referral_patient  ON referral(patient_id, created_at DESC);
CREATE INDEX idx_referral_sla      ON referral(sla_deadline_at)
  WHERE status IN ('SUBMITTED','ESCALATED','ACKNOWLEDGED');

-- ============================================================ STATE HISTORY
CREATE TABLE referral_transition (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referral_id       UUID NOT NULL REFERENCES referral(id) ON DELETE CASCADE,
  from_status       TEXT,
  to_status         TEXT NOT NULL,
  event             TEXT NOT NULL,
  actor_user_id     UUID,
  actor_user_name   TEXT,
  actor_facility_id UUID,
  reason_code       TEXT,
  note              TEXT,
  occurred_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  recorded_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  metadata          JSONB
);
CREATE INDEX idx_transition_referral ON referral_transition(referral_id, occurred_at);

-- ============================================================ ATTACHMENTS
CREATE TABLE referral_attachment (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referral_id UUID NOT NULL REFERENCES referral(id) ON DELETE CASCADE,
  kind        TEXT,
  object_key  TEXT NOT NULL,
  sha256      TEXT NOT NULL,
  size_bytes  INTEGER,
  mime_type   TEXT,
  uploaded_by UUID,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================ AUDIT (hash-chained)
CREATE TABLE audit_log (
  id                BIGSERIAL PRIMARY KEY,
  occurred_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  actor_user_id     UUID,
  actor_facility_id UUID,
  action            TEXT NOT NULL,
  resource_type     TEXT NOT NULL,
  resource_id       UUID,
  purpose           TEXT,
  ip_address        TEXT,
  user_agent        TEXT,
  detail            JSONB,
  prev_hash         TEXT,
  row_hash          TEXT NOT NULL
);
CREATE INDEX idx_audit_resource ON audit_log(resource_type, resource_id, occurred_at DESC);
CREATE INDEX idx_audit_actor    ON audit_log(actor_user_id, occurred_at DESC);

-- ============================================================ SYNC
CREATE TABLE change_log (
  cursor        BIGSERIAL PRIMARY KEY,
  entity_type   TEXT NOT NULL,
  entity_id     UUID NOT NULL,
  facility_scope UUID[] NOT NULL DEFAULT '{}',
  op            TEXT NOT NULL,
  payload       JSONB NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_changelog_scope ON change_log USING GIN (facility_scope);

CREATE TABLE sync_cursor (
  device_id    UUID PRIMARY KEY,
  user_id      UUID NOT NULL REFERENCES app_user(id),
  facility_id  UUID NOT NULL REFERENCES facility(id),
  last_cursor  BIGINT NOT NULL DEFAULT 0,
  last_seen_at TIMESTAMPTZ,
  app_version  TEXT
);

-- ============================================================ NOTIFICATIONS
CREATE TABLE notification (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel     TEXT NOT NULL CHECK (channel IN ('sms','push','in_app')),
  recipient   TEXT NOT NULL,
  template    TEXT NOT NULL,
  body        TEXT NOT NULL,
  referral_id UUID REFERENCES referral(id) ON DELETE CASCADE,
  status      TEXT NOT NULL DEFAULT 'queued',
  attempts    SMALLINT NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  sent_at     TIMESTAMPTZ
);
CREATE INDEX idx_notification_status ON notification(status, created_at);

-- ============================================================ CONFIG
CREATE TABLE config (
  key         TEXT PRIMARY KEY,
  value       JSONB NOT NULL,
  scope       TEXT NOT NULL DEFAULT 'global',
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================ REASON TAXONOMY
CREATE TABLE reason_code (
  code                   TEXT PRIMARY KEY,
  name_lat               TEXT NOT NULL,
  name_am                TEXT,
  category               TEXT NOT NULL,
  default_urgency        TEXT NOT NULL DEFAULT 'routine',
  min_target_tier        SMALLINT NOT NULL DEFAULT 2,
  required_capabilities  TEXT[] NOT NULL DEFAULT '{}',
  stabilisation_items    TEXT[] NOT NULL DEFAULT '{}'
);

-- ============================================================ ACCEPTANCE STATS (BR-12 w3)
CREATE OR REPLACE VIEW facility_acceptance_stats AS
SELECT target_facility_id AS facility_id,
       COUNT(*) FILTER (WHERE decision = 'accepted')::numeric
         / NULLIF(COUNT(*) FILTER (WHERE decision IS NOT NULL), 0) AS acceptance_rate,
       COUNT(*) AS total_received
FROM referral
WHERE is_test_data = FALSE
GROUP BY target_facility_id;

-- ============================================================ ANALYTICS VIEW
CREATE OR REPLACE VIEW fact_referral AS
SELECT r.id, r.referral_code, r.status, r.urgency, r.referral_type, r.reason_code,
       r.origin_facility_id, r.target_facility_id,
       r.origin_facility_tier, r.target_facility_tier,
       r.self_referred, r.created_offline, r.is_test_data,
       r.created_at, r.synced_at, r.acknowledged_at, r.decision, r.decision_at,
       r.decline_reason, r.arrived_at, r.outcome_submitted_at, r.outcome_acknowledged_at,
       EXTRACT(EPOCH FROM (r.acknowledged_at - COALESCE(r.synced_at, r.created_at)))/60
         AS minutes_to_acknowledge,
       EXTRACT(EPOCH FROM (r.decision_at - COALESCE(r.synced_at, r.created_at)))/60
         AS minutes_to_decision,
       r.transit_minutes,
       EXTRACT(EPOCH FROM (r.outcome_acknowledged_at - r.created_at))/3600
         AS hours_to_loop_close,
       (r.status = 'CLOSED_COMPLETED') AS loop_closed,
       (r.status LIKE 'CLOSED_%' AND r.status <> 'CLOSED_CANCELLED') AS is_terminal_countable
FROM referral r;
