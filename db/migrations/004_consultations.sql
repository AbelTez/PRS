-- Doctor-to-doctor conversations. Clinical context is optional.
CREATE TABLE consultation (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id UUID NOT NULL REFERENCES app_user(id),
  consultant_id UUID NOT NULL REFERENCES app_user(id),
  title TEXT NOT NULL CHECK (length(title) BETWEEN 1 AND 160),
  topic TEXT NOT NULL DEFAULT 'general' CHECK (topic IN ('general','patient_case','second_opinion','learning')),
  summary TEXT NOT NULL DEFAULT '' CHECK (length(summary) <= 10000),
  patient_id UUID REFERENCES patient(id),
  referral_id UUID REFERENCES referral(id),
  sharing_confirmed BOOLEAN NOT NULL DEFAULT FALSE,
  status TEXT NOT NULL DEFAULT 'requested' CHECK (status IN ('requested','active','answered','closed','declined','cancelled')),
  priority TEXT NOT NULL DEFAULT 'routine' CHECK (priority IN ('routine','urgent')),
  client_id UUID NOT NULL,
  requester_read_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  consultant_read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  is_test_data BOOLEAN NOT NULL DEFAULT FALSE,
  CHECK (requester_id <> consultant_id),
  CHECK ((patient_id IS NULL AND referral_id IS NULL) OR sharing_confirmed),
  UNIQUE (requester_id, client_id)
);
CREATE INDEX consultation_requester ON consultation(requester_id, updated_at DESC);
CREATE INDEX consultation_consultant ON consultation(consultant_id, updated_at DESC);
CREATE INDEX consultation_patient ON consultation(patient_id) WHERE patient_id IS NOT NULL;
CREATE INDEX consultation_source_referral ON consultation(referral_id) WHERE referral_id IS NOT NULL;

CREATE TABLE consultation_message (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  consultation_id UUID NOT NULL REFERENCES consultation(id),
  author_id UUID NOT NULL REFERENCES app_user(id),
  kind TEXT NOT NULL DEFAULT 'message' CHECK (kind IN ('message','opinion')),
  body TEXT NOT NULL CHECK (length(body) BETWEEN 1 AND 10000),
  client_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (consultation_id, author_id, client_id)
);
CREATE INDEX consultation_message_cursor ON consultation_message(consultation_id, id);
CREATE INDEX consultation_message_author ON consultation_message(author_id);

CREATE TABLE consultation_attachment (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  consultation_id UUID NOT NULL REFERENCES consultation(id),
  uploaded_by UUID NOT NULL REFERENCES app_user(id),
  client_id UUID NOT NULL,
  file_name TEXT NOT NULL CHECK (length(file_name) BETWEEN 1 AND 200),
  mime_type TEXT NOT NULL CHECK (mime_type IN ('image/jpeg','image/png','application/pdf')),
  content BYTEA NOT NULL CHECK (octet_length(content) BETWEEN 1 AND 1500000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (consultation_id, uploaded_by, client_id)
);
CREATE INDEX consultation_attachment_case ON consultation_attachment(consultation_id, created_at);
CREATE INDEX consultation_attachment_author ON consultation_attachment(uploaded_by);

CREATE TABLE consultation_event (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  consultation_id UUID NOT NULL REFERENCES consultation(id),
  actor_id UUID NOT NULL REFERENCES app_user(id),
  event TEXT NOT NULL,
  note TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX consultation_event_case ON consultation_event(consultation_id, id);
CREATE INDEX consultation_event_actor ON consultation_event(actor_id);

CREATE TABLE consultation_call (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  consultation_id UUID NOT NULL REFERENCES consultation(id),
  started_by UUID NOT NULL REFERENCES app_user(id),
  mode TEXT NOT NULL CHECK (mode IN ('video','audio')),
  status TEXT NOT NULL DEFAULT 'ringing' CHECK (status IN ('ringing','active','ended','declined','missed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  answered_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  caller_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  callee_seen_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT now() + interval '90 seconds'
);
CREATE UNIQUE INDEX consultation_one_live_call ON consultation_call(consultation_id) WHERE status IN ('ringing','active');
CREATE INDEX consultation_call_history ON consultation_call(consultation_id, created_at DESC);
CREATE INDEX consultation_call_starter ON consultation_call(started_by);

-- Short-lived connection metadata, never audio or video recordings.
CREATE TABLE consultation_signal (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  call_id UUID NOT NULL REFERENCES consultation_call(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES app_user(id),
  kind TEXT NOT NULL CHECK (kind IN ('offer','answer','candidate')),
  payload JSONB NOT NULL,
  client_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (call_id, sender_id, client_id)
);
CREATE INDEX consultation_signal_cursor ON consultation_signal(call_id, id);
CREATE INDEX consultation_signal_sender ON consultation_signal(sender_id);

CREATE TABLE consultation_referral (
  consultation_id UUID NOT NULL REFERENCES consultation(id),
  referral_id UUID NOT NULL REFERENCES referral(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (consultation_id, referral_id)
);
CREATE INDEX consultation_referral_link ON consultation_referral(referral_id);
