CREATE TABLE IF NOT EXISTS opening_visitors (
  id TEXT PRIMARY KEY NOT NULL,
  event_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (event_id) REFERENCES opening_events(id)
);
