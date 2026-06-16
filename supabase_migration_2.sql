-- ============================================================
-- Phase 2 Migration: zone_configs, delivery_items, holidays,
-- production_plan_cache
-- Also: add bundle_width, bundle_height columns to products
-- ============================================================

-- 1. products: add dimension columns if not present
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS bundle_width  NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS bundle_height NUMERIC DEFAULT 0;

-- 2. zone_configs
CREATE TABLE IF NOT EXISTS zone_configs (
  key        TEXT PRIMARY KEY,
  value      JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE zone_configs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "zone_configs_all" ON zone_configs;
CREATE POLICY "zone_configs_all" ON zone_configs
  FOR ALL USING (true) WITH CHECK (true);

-- 3. delivery_items
CREATE TABLE IF NOT EXISTS delivery_items (
  id            BIGSERIAL PRIMARY KEY,
  plan_id       TEXT,
  sku           TEXT,
  sku_name      TEXT,
  pcs           INTEGER,
  delivery_date DATE,
  status        TEXT,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE delivery_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "delivery_items_all" ON delivery_items;
CREATE POLICY "delivery_items_all" ON delivery_items
  FOR ALL USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_delivery_items_date ON delivery_items (delivery_date);
CREATE INDEX IF NOT EXISTS idx_delivery_items_sku  ON delivery_items (sku);

-- 4. holidays
CREATE TABLE IF NOT EXISTS holidays (
  holiday_date DATE PRIMARY KEY,
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE holidays ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "holidays_all" ON holidays;
CREATE POLICY "holidays_all" ON holidays
  FOR ALL USING (true) WITH CHECK (true);

-- 5. production_plan_cache
CREATE TABLE IF NOT EXISTS production_plan_cache (
  month_key  TEXT PRIMARY KEY,   -- 'yyyy-MM'
  data       JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE production_plan_cache ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "production_plan_cache_all" ON production_plan_cache;
CREATE POLICY "production_plan_cache_all" ON production_plan_cache
  FOR ALL USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_production_plan_cache_month ON production_plan_cache (month_key);
