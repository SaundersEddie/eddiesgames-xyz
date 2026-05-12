CREATE TABLE IF NOT EXISTS shift_scores (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  et_date TEXT NOT NULL,
  score INTEGER NOT NULL,
  best_tile INTEGER NOT NULL,
  moves INTEGER NOT NULL,
  completed_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_shift_scores_daily
ON shift_scores (et_date, score DESC, best_tile DESC, moves ASC, completed_at ASC);
