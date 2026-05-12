CREATE TABLE IF NOT EXISTS react_scores (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  et_date TEXT NOT NULL,
  points INTEGER NOT NULL,
  completed_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_react_scores_daily
ON react_scores (et_date, points DESC, completed_at ASC);