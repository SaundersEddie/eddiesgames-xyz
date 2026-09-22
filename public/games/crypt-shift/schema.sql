CREATE TABLE IF NOT EXISTS crypt_shift_scores (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  et_date TEXT NOT NULL,
  turns INTEGER NOT NULL,
  health INTEGER NOT NULL,
  completed_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_crypt_shift_scores_ranking
ON crypt_shift_scores (
  et_date,
  turns ASC,
  health DESC,
  completed_at ASC
);
