CREATE TABLE IF NOT EXISTS letterlock_scores (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  et_date TEXT NOT NULL,
  attempts INTEGER NOT NULL,
  bad_guesses INTEGER NOT NULL,
  score INTEGER NOT NULL,
  puzzle_seed TEXT NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (strftime('%s','now') * 1000)
);

CREATE INDEX IF NOT EXISTS idx_letterlock_scores_date_attempts
ON letterlock_scores (et_date, attempts);
