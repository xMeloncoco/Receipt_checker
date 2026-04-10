-- Receipt Tracker — Initial Schema
-- Run this in the Supabase SQL editor

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─────────────────────────────────────────────
-- 1. stores
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS stores (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        TEXT NOT NULL,
  chain       TEXT,
  location    TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────
-- 2. grocery_items  (canonical product catalogue)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS grocery_items (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  canonical_name  TEXT NOT NULL,
  category        TEXT,
  unit_type       TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────
-- 3. receipts
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS receipts (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id       UUID NOT NULL REFERENCES stores(id) ON DELETE RESTRICT,
  purchase_date  DATE NOT NULL,
  purchase_time  TIME,
  total_amount   NUMERIC(10, 2) NOT NULL,
  image_url      TEXT,
  raw_text       TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Duplicate detection:
-- COALESCE purchase_time to '00:00' so NULL == NULL compares correctly.
CREATE UNIQUE INDEX IF NOT EXISTS receipts_dedup_idx
  ON receipts (store_id, purchase_date, COALESCE(purchase_time, '00:00'::TIME), total_amount);

-- ─────────────────────────────────────────────
-- 4. store_items  (per-store product listing)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS store_items (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id         UUID NOT NULL REFERENCES stores(id) ON DELETE RESTRICT,
  grocery_item_id  UUID REFERENCES grocery_items(id) ON DELETE SET NULL,
  name_on_receipt  TEXT NOT NULL,   -- raw SKU, never normalised
  amount_per_unit  NUMERIC(10, 3),
  unit             TEXT,
  price            NUMERIC(10, 2) NOT NULL,
  is_discount      BOOLEAN NOT NULL DEFAULT FALSE,
  discount_label   TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (store_id, name_on_receipt)
);

-- ─────────────────────────────────────────────
-- 5. receipt_lines  (individual line items)
-- ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS receipt_lines (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  receipt_id        UUID NOT NULL REFERENCES receipts(id) ON DELETE CASCADE,
  store_item_id     UUID NOT NULL REFERENCES store_items(id) ON DELETE RESTRICT,
  quantity          NUMERIC(10, 3) NOT NULL DEFAULT 1,
  unit_price        NUMERIC(10, 2) NOT NULL,
  line_total        NUMERIC(10, 2) NOT NULL,
  is_new_store_item BOOLEAN NOT NULL DEFAULT FALSE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─────────────────────────────────────────────
-- Performance indexes
-- ─────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_receipts_store_id       ON receipts(store_id);
CREATE INDEX IF NOT EXISTS idx_store_items_store_id    ON store_items(store_id);
CREATE INDEX IF NOT EXISTS idx_store_items_grocery_id  ON store_items(grocery_item_id);
CREATE INDEX IF NOT EXISTS idx_receipt_lines_receipt   ON receipt_lines(receipt_id);
CREATE INDEX IF NOT EXISTS idx_receipt_lines_item      ON receipt_lines(store_item_id);

-- ─────────────────────────────────────────────
-- Row Level Security
-- ─────────────────────────────────────────────
ALTER TABLE stores         ENABLE ROW LEVEL SECURITY;
ALTER TABLE grocery_items  ENABLE ROW LEVEL SECURITY;
ALTER TABLE receipts       ENABLE ROW LEVEL SECURITY;
ALTER TABLE store_items    ENABLE ROW LEVEL SECURITY;
ALTER TABLE receipt_lines  ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users full access to all tables.
-- The Express server uses the service_role key and bypasses RLS entirely.
CREATE POLICY "authenticated users can read stores"
  ON stores FOR SELECT TO authenticated USING (true);

CREATE POLICY "authenticated users can insert stores"
  ON stores FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "authenticated users can read grocery_items"
  ON grocery_items FOR SELECT TO authenticated USING (true);

CREATE POLICY "authenticated users can insert grocery_items"
  ON grocery_items FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "authenticated users can read receipts"
  ON receipts FOR SELECT TO authenticated USING (true);

CREATE POLICY "authenticated users can insert receipts"
  ON receipts FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "authenticated users can read store_items"
  ON store_items FOR SELECT TO authenticated USING (true);

CREATE POLICY "authenticated users can insert store_items"
  ON store_items FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "authenticated users can read receipt_lines"
  ON receipt_lines FOR SELECT TO authenticated USING (true);

CREATE POLICY "authenticated users can insert receipt_lines"
  ON receipt_lines FOR INSERT TO authenticated WITH CHECK (true);

-- ─────────────────────────────────────────────
-- Storage bucket
-- Note: Run this separately via the Supabase Storage UI or CLI:
--   supabase storage create receipts --public false
-- OR via the dashboard: Storage → New bucket → name "receipts" → private
-- ─────────────────────────────────────────────
