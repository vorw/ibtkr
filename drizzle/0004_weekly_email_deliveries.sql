CREATE TABLE IF NOT EXISTS weekly_email_deliveries (
  challenge_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  likes INTEGER NOT NULL,
  entries INTEGER NOT NULL,
  rank INTEGER NOT NULL CHECK (rank BETWEEN 1 AND 3),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','sending','sent','skipped','needs_review')),
  payload_json TEXT,
  attempts INTEGER NOT NULL DEFAULT 0,
  first_attempt_at TEXT,
  next_attempt_at TEXT NOT NULL,
  lease_token TEXT,
  lease_until TEXT,
  provider_id TEXT,
  last_error_code TEXT,
  created_at TEXT NOT NULL,
  sent_at TEXT,
  PRIMARY KEY (challenge_id,user_id)
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_weekly_email_pending ON weekly_email_deliveries (status,next_attempt_at,lease_until);
