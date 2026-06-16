-- ============================================================
-- Phase 3: products (add weight/lifts cols) + logistic_plans
-- Run in Supabase SQL Editor
-- ============================================================

-- 1. Add columns to products
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS likely_w       NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS min_w          NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS max_w          NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS lifts_per_round INTEGER DEFAULT 0;

-- 2. Create logistic_plans table
CREATE TABLE IF NOT EXISTS logistic_plans (
  plan_id          TEXT PRIMARY KEY,
  plan_date        DATE NOT NULL,
  job_type         TEXT NOT NULL DEFAULT '',
  status           TEXT NOT NULL DEFAULT 'planned',
  truck_type       TEXT NOT NULL DEFAULT 'company',
  truck_plate      TEXT NOT NULL DEFAULT '',
  child_plate      TEXT NOT NULL DEFAULT '',
  driver_transport TEXT NOT NULL DEFAULT '',
  driver_id        TEXT NOT NULL DEFAULT '',
  trip_no          TEXT NOT NULL DEFAULT '',
  trailer_mode     TEXT NOT NULL DEFAULT '',
  wage             NUMERIC NOT NULL DEFAULT 0,
  warehouse        TEXT NOT NULL DEFAULT '',
  fail_reason      TEXT NOT NULL DEFAULT '',
  shops            JSONB NOT NULL DEFAULT '[]',
  total_weight     NUMERIC NOT NULL DEFAULT 0,
  return_distance  NUMERIC NOT NULL DEFAULT 0,
  is_mother        BOOLEAN NOT NULL DEFAULT false,
  is_child         BOOLEAN NOT NULL DEFAULT false,
  pair_id          TEXT NOT NULL DEFAULT '',
  created_by       TEXT NOT NULL DEFAULT '',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE logistic_plans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "logistic_plans_all" ON logistic_plans;
CREATE POLICY "logistic_plans_all" ON logistic_plans
  FOR ALL USING (true) WITH CHECK (true);

GRANT ALL ON logistic_plans TO anon, service_role;

CREATE INDEX IF NOT EXISTS idx_logistic_plans_date   ON logistic_plans (plan_date);
CREATE INDEX IF NOT EXISTS idx_logistic_plans_status ON logistic_plans (status);
CREATE INDEX IF NOT EXISTS idx_logistic_plans_pair   ON logistic_plans (pair_id);
