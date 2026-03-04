CREATE TABLE IF NOT EXISTS redacted_scores (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  day TEXT NOT NULL,
  score INTEGER NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_redacted_day_score
ON redacted_scores (day, score);
