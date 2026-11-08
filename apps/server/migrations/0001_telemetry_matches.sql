CREATE TABLE telemetry_matches (
  id INTEGER PRIMARY KEY,
  received_at INTEGER NOT NULL DEFAULT (unixepoch()),
  schema_version INTEGER NOT NULL CHECK (schema_version = 1),
  session_id TEXT NOT NULL,
  build_version TEXT NOT NULL,
  mode TEXT NOT NULL CHECK (mode IN ('offline', 'controlled')),
  samples INTEGER NOT NULL,
  fps REAL,
  frame_p50_ms REAL,
  frame_p95_ms REAL,
  cpu_p95_ms REAL,
  frames_over_20_ms INTEGER NOT NULL,
  max_squads INTEGER NOT NULL,
  scale INTEGER NOT NULL,
  viewport_width INTEGER NOT NULL,
  viewport_height INTEGER NOT NULL,
  dpr REAL NOT NULL,
  hardware_concurrency INTEGER,
  browser TEXT NOT NULL,
  os TEXT NOT NULL,
  match_ticks INTEGER NOT NULL,
  wall_seconds REAL NOT NULL,
  end_reason TEXT NOT NULL,
  player_rank INTEGER,
  bots TEXT NOT NULL CHECK (json_valid(bots) AND json_array_length(bots) = 3),
  human_commands INTEGER NOT NULL,
  human_captured INTEGER NOT NULL,
  reduced_motion INTEGER NOT NULL CHECK (reduced_motion IN (0, 1))
);

CREATE INDEX telemetry_matches_session_received_at
  ON telemetry_matches (session_id, received_at);
