-- ============================================================
-- Phase 5: GPS Activity Log
-- ============================================================

CREATE TABLE IF NOT EXISTS gps_activity_log (
  id              BIGSERIAL PRIMARY KEY,
  device_id       TEXT    NOT NULL DEFAULT '',
  truck           TEXT    NOT NULL DEFAULT '',
  vehicle_name    TEXT    NOT NULL DEFAULT '',
  driver          TEXT    NOT NULL DEFAULT '',
  activity_date   DATE    NOT NULL,
  time_start      TEXT    NOT NULL DEFAULT '',
  time_end        TEXT    NOT NULL DEFAULT '',
  engine_run_time TEXT    NOT NULL DEFAULT '',
  idle_str        TEXT    NOT NULL DEFAULT '',
  travel_time     TEXT    NOT NULL DEFAULT '',
  distance        NUMERIC NOT NULL DEFAULT 0,
  avg_speed       NUMERIC NOT NULL DEFAULT 0,
  max_speed       NUMERIC NOT NULL DEFAULT 0,
  fuel_used       NUMERIC NOT NULL DEFAULT 0,
  idle_min        NUMERIC NOT NULL DEFAULT 0,
  engine_min      NUMERIC NOT NULL DEFAULT 0,
  fuel_eff        NUMERIC NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE gps_activity_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "gps_activity_log_all" ON gps_activity_log;
CREATE POLICY "gps_activity_log_all" ON gps_activity_log FOR ALL USING (true) WITH CHECK (true);
GRANT ALL ON gps_activity_log TO anon, service_role;
GRANT USAGE, SELECT ON SEQUENCE gps_activity_log_id_seq TO anon, service_role;

CREATE INDEX IF NOT EXISTS idx_gps_log_date   ON gps_activity_log (activity_date);
CREATE INDEX IF NOT EXISTS idx_gps_log_truck  ON gps_activity_log (truck);
CREATE INDEX IF NOT EXISTS idx_gps_log_driver ON gps_activity_log (driver);
