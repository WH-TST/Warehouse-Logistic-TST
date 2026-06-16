-- ══════════════════════════════════════════════════
-- WMS Supabase Schema
-- Project: lkuunmyrxugsoqwrvdby
-- ══════════════════════════════════════════════════

-- ── App-generated tables (written directly from frontend) ──

CREATE TABLE IF NOT EXISTS work_orders (
  id           TEXT PRIMARY KEY,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by   TEXT NOT NULL DEFAULT '',
  zone         TEXT NOT NULL DEFAULT '',
  sku          TEXT NOT NULL DEFAULT '',
  sku_name     TEXT NOT NULL DEFAULT '',
  bundles      INTEGER NOT NULL DEFAULT 0,
  to_zone      TEXT NOT NULL DEFAULT '',
  reason       TEXT NOT NULL DEFAULT '',
  due_date     TEXT NOT NULL DEFAULT '',
  status       TEXT NOT NULL DEFAULT 'รอดำเนินการ',
  assigned_to  TEXT NOT NULL DEFAULT '',
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  note         TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS move_log (
  id           TEXT PRIMARY KEY,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  move_date    DATE,
  from_zone    TEXT NOT NULL DEFAULT '',
  to_zone      TEXT NOT NULL DEFAULT '',
  sku          TEXT NOT NULL DEFAULT '',
  sku_name     TEXT NOT NULL DEFAULT '',
  bundles      INTEGER NOT NULL DEFAULT 0,
  ppb          INTEGER NOT NULL DEFAULT 1,
  pcs          INTEGER NOT NULL DEFAULT 0,
  recorded_by  TEXT NOT NULL DEFAULT '',
  note         TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS zone_stock (
  zone         TEXT NOT NULL,
  sku          TEXT NOT NULL,
  sku_name     TEXT NOT NULL DEFAULT '',
  pcs          INTEGER NOT NULL DEFAULT 0,
  ppb          INTEGER NOT NULL DEFAULT 1,
  bundle_width  NUMERIC NOT NULL DEFAULT 0,
  bundle_height NUMERIC NOT NULL DEFAULT 0,
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (zone, sku)
);

CREATE TABLE IF NOT EXISTS audit_log (
  id         BIGSERIAL PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  user_email TEXT NOT NULL DEFAULT '',
  module     TEXT NOT NULL DEFAULT '',
  action     TEXT NOT NULL DEFAULT '',
  detail     TEXT NOT NULL DEFAULT '',
  status     TEXT NOT NULL DEFAULT 'success'
);

-- ── Synced tables (written by GAS bridge every 15 min) ──

CREATE TABLE IF NOT EXISTS products (
  sku              TEXT PRIMARY KEY,
  name             TEXT NOT NULL DEFAULT '',
  lines_per_bundle INTEGER NOT NULL DEFAULT 1,
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS onhand (
  sku        TEXT NOT NULL,
  warehouse  TEXT NOT NULL,
  qty        INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (sku, warehouse)
);

CREATE TABLE IF NOT EXISTS production_block (
  id         BIGSERIAL PRIMARY KEY,
  block_date DATE NOT NULL,
  machine    TEXT NOT NULL DEFAULT '',
  sku        TEXT NOT NULL DEFAULT '',
  bundles    INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sheet_plan (
  id         BIGSERIAL PRIMARY KEY,
  plan_date  DATE NOT NULL,
  machine    TEXT NOT NULL DEFAULT '',
  sku        TEXT NOT NULL DEFAULT '',
  bundles    INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── RLS Policies ──

ALTER TABLE work_orders   ENABLE ROW LEVEL SECURITY;
ALTER TABLE move_log      ENABLE ROW LEVEL SECURITY;
ALTER TABLE zone_stock    ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log     ENABLE ROW LEVEL SECURITY;
ALTER TABLE products      ENABLE ROW LEVEL SECURITY;
ALTER TABLE onhand        ENABLE ROW LEVEL SECURITY;
ALTER TABLE production_block ENABLE ROW LEVEL SECURITY;
ALTER TABLE sheet_plan    ENABLE ROW LEVEL SECURITY;

-- Allow all operations with publishable key (frontend uses this)
-- In production, replace with auth-based policies

CREATE POLICY "allow_all_work_orders"      ON work_orders      FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_move_log"         ON move_log         FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_zone_stock"       ON zone_stock       FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_audit_log"        ON audit_log        FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_read_products"        ON products         FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_read_onhand"          ON onhand           FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_read_production_block" ON production_block FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_read_sheet_plan"      ON sheet_plan       FOR ALL USING (true) WITH CHECK (true);

-- ── Indexes ──

CREATE INDEX IF NOT EXISTS idx_work_orders_status   ON work_orders (status);
CREATE INDEX IF NOT EXISTS idx_work_orders_zone     ON work_orders (zone);
CREATE INDEX IF NOT EXISTS idx_move_log_date        ON move_log (move_date);
CREATE INDEX IF NOT EXISTS idx_move_log_sku         ON move_log (sku);
CREATE INDEX IF NOT EXISTS idx_zone_stock_zone      ON zone_stock (zone);
CREATE INDEX IF NOT EXISTS idx_production_block_date ON production_block (block_date);
CREATE INDEX IF NOT EXISTS idx_sheet_plan_date      ON sheet_plan (plan_date);
