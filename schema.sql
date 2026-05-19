CREATE TABLE IF NOT EXISTS sudoku_scores (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  et_date TEXT NOT NULL,
  elapsed_ms INTEGER NOT NULL,
  clue_count INTEGER NOT NULL,
  puzzle_seed TEXT NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_sudoku_scores_daily
ON sudoku_scores (et_date, elapsed_ms);
