CREATE TABLE IF NOT EXISTS dungeon_dash_scores (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  et_date TEXT NOT NULL,
  time_ms INTEGER NOT NULL,
  caught INTEGER NOT NULL,
  meanies INTEGER NOT NULL,
  completed_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_dungeon_dash_scores_date
ON dungeon_dash_scores (et_date);
