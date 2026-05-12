CREATE TABLE IF NOT EXISTS sequence_scores (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  et_date TEXT NOT NULL,
  score INTEGER NOT NULL,
  completed_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_sequence_scores_daily
ON sequence_scores (et_date, score DESC, completed_at ASC);
