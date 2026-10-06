CREATE TABLE IF NOT EXISTS opening_events (
  id TEXT PRIMARY KEY NOT NULL,
  target INTEGER NOT NULL CHECK (target > 0),
  opened_at TEXT
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS opening_cuts (
  event_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  cut_at TEXT NOT NULL,
  PRIMARY KEY (event_id,user_id),
  FOREIGN KEY (event_id) REFERENCES opening_events(id)
);
