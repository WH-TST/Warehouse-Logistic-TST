-- ============================================================
-- Phase 4: Logistic Master Data Tables
-- trucks, drivers, shops, transports, wh_staff
-- Run in Supabase SQL Editor
-- ============================================================

-- 1. logi_trucks
CREATE TABLE IF NOT EXISTS logi_trucks (
  plate       TEXT PRIMARY KEY,
  type        TEXT NOT NULL DEFAULT '',
  net_weight  NUMERIC NOT NULL DEFAULT 0,
  cap_mother  NUMERIC NOT NULL DEFAULT 0,
  cap_child   NUMERIC NOT NULL DEFAULT 0,
  child_plate TEXT NOT NULL DEFAULT '',
  is_trailer  BOOLEAN NOT NULL DEFAULT false,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE logi_trucks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "logi_trucks_all" ON logi_trucks;
CREATE POLICY "logi_trucks_all" ON logi_trucks FOR ALL USING (true) WITH CHECK (true);
GRANT ALL ON logi_trucks TO anon, service_role;

-- 2. logi_drivers
CREATE TABLE IF NOT EXISTS logi_drivers (
  id                TEXT PRIMARY KEY,
  name              TEXT NOT NULL DEFAULT '',
  can_trailer       BOOLEAN NOT NULL DEFAULT false,
  trailer_priority  INTEGER NOT NULL DEFAULT 1,
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE logi_drivers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "logi_drivers_all" ON logi_drivers;
CREATE POLICY "logi_drivers_all" ON logi_drivers FOR ALL USING (true) WITH CHECK (true);
GRANT ALL ON logi_drivers TO anon, service_role;

-- 3. logi_shops (ร้านค้า/ลูกค้า)
CREATE TABLE IF NOT EXISTS logi_shops (
  id           TEXT PRIMARY KEY,
  name         TEXT NOT NULL DEFAULT '',
  address      TEXT NOT NULL DEFAULT '',
  phone        TEXT NOT NULL DEFAULT '',
  sale         TEXT NOT NULL DEFAULT '',
  distance     NUMERIC NOT NULL DEFAULT 0,
  no_trailer   BOOLEAN NOT NULL DEFAULT false,
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE logi_shops ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "logi_shops_all" ON logi_shops;
CREATE POLICY "logi_shops_all" ON logi_shops FOR ALL USING (true) WITH CHECK (true);
GRANT ALL ON logi_shops TO anon, service_role;

-- 4. logi_transports (บริษัทขนส่ง)
CREATE TABLE IF NOT EXISTS logi_transports (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL DEFAULT '',
  capacity    NUMERIC NOT NULL DEFAULT 0,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE logi_transports ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "logi_transports_all" ON logi_transports;
CREATE POLICY "logi_transports_all" ON logi_transports FOR ALL USING (true) WITH CHECK (true);
GRANT ALL ON logi_transports TO anon, service_role;

-- 5. logi_wh_staff (พนักงาน WH)
CREATE TABLE IF NOT EXISTS logi_wh_staff (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL DEFAULT '',
  team        TEXT NOT NULL DEFAULT '',
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE logi_wh_staff ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "logi_wh_staff_all" ON logi_wh_staff;
CREATE POLICY "logi_wh_staff_all" ON logi_wh_staff FOR ALL USING (true) WITH CHECK (true);
GRANT ALL ON logi_wh_staff TO anon, service_role;
