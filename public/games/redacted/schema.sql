CREATE TABLE IF NOT EXISTS redacted_scores (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  et_date TEXT NOT NULL,
  guesses INTEGER NOT NULL,
  completed_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_redacted_scores_daily
ON redacted_scores (et_date, guesses, completed_at);
