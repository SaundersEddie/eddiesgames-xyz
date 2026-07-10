CREATE TABLE IF NOT EXISTS pegs_scores (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  et_date TEXT NOT NULL,
  board_id TEXT NOT NULL,
  pegs_remaining INTEGER NOT NULL,
  moves INTEGER NOT NULL,
  elapsed_ms INTEGER NOT NULL,
  starting_empty_hole INTEGER NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE INDEX IF NOT EXISTS idx_pegs_scores_daily
ON pegs_scores (
  et_date,
  board_id,
  pegs_remaining,
  moves,
  elapsed_ms,
  created_at
);
