-- D1 applies migrations transactionally. Rebuild rather than editing sqlite_schema:
-- the v1 CHECK cannot be changed with ADD COLUMN. Copy IDs/timestamps unchanged.
CREATE TABLE telemetry_matches_v2 (
  id INTEGER PRIMARY KEY,
  received_at INTEGER NOT NULL DEFAULT (unixepoch()),
  schema_version INTEGER NOT NULL CHECK (schema_version IN (1, 2)),
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
  reduced_motion INTEGER NOT NULL CHECK (reduced_motion IN (0, 1)),
  max_frame_ms REAL,
  start_room INTEGER,
  CHECK (schema_version = 1 OR (start_room IS NOT NULL AND start_room BETWEEN 0 AND 12)),
  CHECK (schema_version = 1 OR (samples = 0 AND max_frame_ms IS NULL)
    OR (samples > 0 AND max_frame_ms IS NOT NULL AND max_frame_ms > 0))
);

-- Omitted v2 columns remain NULL: legacy packets did not measure these values.
INSERT INTO telemetry_matches_v2 (
  id, received_at, schema_version, session_id, build_version, mode, samples,
  fps, frame_p50_ms, frame_p95_ms, cpu_p95_ms, frames_over_20_ms,
  max_squads, scale, viewport_width, viewport_height, dpr, hardware_concurrency,
  browser, os, match_ticks, wall_seconds, end_reason, player_rank, bots,
  human_commands, human_captured, reduced_motion
)
SELECT
  id, received_at, schema_version, session_id, build_version, mode, samples,
  fps, frame_p50_ms, frame_p95_ms, cpu_p95_ms, frames_over_20_ms,
  max_squads, scale, viewport_width, viewport_height, dpr, hardware_concurrency,
  browser, os, match_ticks, wall_seconds, end_reason, player_rank, bots,
  human_commands, human_captured, reduced_motion
FROM telemetry_matches;

DROP TABLE telemetry_matches;
ALTER TABLE telemetry_matches_v2 RENAME TO telemetry_matches;

CREATE INDEX telemetry_matches_session_received_at
  ON telemetry_matches (session_id, received_at);
