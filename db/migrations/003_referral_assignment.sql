-- 003 — Referral reception and clinician assignment.
--
-- Every inbound referral lands at the receiving hospital's reception (the
-- referral liaison), never directly in a doctor's queue. Reception reviews the
-- case and assigns it to the clinician who can actually treat it — most
-- referrals need a particular specialty, so an arbitrary doctor picking up a
-- case is both unsafe and unaccountable.
--
-- Consequences enforced in the application layer:
--   * a clinician at the receiving facility sees a referral only once it is
--     assigned to them (reception and administration still see the queue);
--   * the assignment is recorded with who assigned it and when, so the
--     hospital can answer "who was responsible for this patient?".

ALTER TABLE referral
  ADD COLUMN IF NOT EXISTS assigned_doctor_id   UUID REFERENCES app_user(id),
  ADD COLUMN IF NOT EXISTS assigned_doctor_name TEXT,
  ADD COLUMN IF NOT EXISTS assigned_at          TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS assigned_by          UUID REFERENCES app_user(id),
  ADD COLUMN IF NOT EXISTS assigned_by_name     TEXT,
  ADD COLUMN IF NOT EXISTS assignment_note      TEXT;

-- A clinician's own queue: "what has reception given me?"
CREATE INDEX IF NOT EXISTS idx_referral_assigned
  ON referral(assigned_doctor_id, status, created_at DESC)
  WHERE assigned_doctor_id IS NOT NULL;

-- Reception's standby queue: inbound referrals still waiting to be assigned.
CREATE INDEX IF NOT EXISTS idx_referral_unassigned
  ON referral(target_facility_id, created_at DESC)
  WHERE assigned_doctor_id IS NULL AND is_test_data = FALSE;
