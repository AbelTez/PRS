-- 002 — Pilot feature build: professional roles, IT-managed verification,
--       patient portal accounts, patient feedback, facility addresses,
--       real ward reservations, attachment content.
--
-- Design notes
--  * `doctor` joins `clinician`/`specialist` as a clinical sender role (with a
--    mandatory MoH license captured at registration). Existing `clinician`
--    accounts keep working — the vocabulary is additive.
--  * `it_admin` manages accounts for exactly ONE facility. Verification state
--    lives on app_user (pending → active → disabled) so "only staff verified
--    by their own hospital's IT can act in its name" is enforceable at login.
--  * `patient` accounts link to a patient row and see only their own referrals.
--  * Feedback is one row per (referral, side): the patient rates the referring
--    facility and the receiving facility separately. Read access is restricted
--    in the application layer to the IT administrator of the rated facility.

-- ------------------------------------------------------------ app_user roles
ALTER TABLE app_user DROP CONSTRAINT IF EXISTS app_user_role_check;
ALTER TABLE app_user ADD CONSTRAINT app_user_role_check CHECK (role IN
  ('hew','clinician','doctor','liaison','triage','specialist',
   'facility_admin','it_admin','woreda','region','moh','cbhi','sysadmin','patient'));

ALTER TABLE app_user
  ADD COLUMN IF NOT EXISTS license_number TEXT,
  ADD COLUMN IF NOT EXISTS title          TEXT,
  ADD COLUMN IF NOT EXISTS department     TEXT,
  ADD COLUMN IF NOT EXISTS verified_at    TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS verified_by    UUID REFERENCES app_user(id),
  ADD COLUMN IF NOT EXISTS patient_id     UUID REFERENCES patient(id);

ALTER TABLE app_user DROP CONSTRAINT IF EXISTS app_user_status_check;
ALTER TABLE app_user ADD CONSTRAINT app_user_status_check
  CHECK (status IN ('active','pending','disabled'));

CREATE INDEX IF NOT EXISTS idx_app_user_facility ON app_user(facility_id, status);

-- ------------------------------------------------------------ facility address
ALTER TABLE facility
  ADD COLUMN IF NOT EXISTS address_line TEXT,
  ADD COLUMN IF NOT EXISTS po_box       TEXT;

-- ------------------------------------------------------------ real reservations
ALTER TABLE referral
  ADD COLUMN IF NOT EXISTS reserved_ward_type TEXT
    CHECK (reserved_ward_type IS NULL OR
           reserved_ward_type IN ('general','maternity','paediatric','icu','isolation'));

-- ------------------------------------------------------------ attachments
-- Pilot storage: content lives in the DB (transactional, in-country, simple).
-- Production TODO (documented in docs/PROJECT_STATE.md): move content to
-- object storage and keep only object_key + sha256 here.
ALTER TABLE referral_attachment
  ADD COLUMN IF NOT EXISTS file_name TEXT,
  ADD COLUMN IF NOT EXISTS content   BYTEA;
CREATE INDEX IF NOT EXISTS idx_attachment_referral ON referral_attachment(referral_id);

-- ------------------------------------------------------------ patient feedback
CREATE TABLE IF NOT EXISTS referral_feedback (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referral_id   UUID NOT NULL REFERENCES referral(id) ON DELETE CASCADE,
  patient_id    UUID NOT NULL REFERENCES patient(id),
  facility_id   UUID NOT NULL REFERENCES facility(id),
  facility_role TEXT NOT NULL CHECK (facility_role IN ('origin','target')),
  rating        SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment       TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (referral_id, facility_role)
);
CREATE INDEX IF NOT EXISTS idx_feedback_facility ON referral_feedback(facility_id, created_at DESC);
