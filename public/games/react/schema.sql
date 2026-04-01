CREATE TABLE IF NOT EXISTS match_scores (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  et_date TEXT NOT NULL,
  points INTEGER NOT NULL,
  completed_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_match_scores_date_mode
ON match_scores (et_date, points);
