-- ============================================================
-- RLS POLICIES — ProductSpot
-- Run this in Supabase → SQL Editor
-- ============================================================

-- ── STORES ──────────────────────────────────────────────────
ALTER TABLE stores ENABLE ROW LEVEL SECURITY;

-- Each user can only see and modify their own store
DROP POLICY IF EXISTS "stores: owner select"  ON stores;
DROP POLICY IF EXISTS "stores: owner insert"  ON stores;
DROP POLICY IF EXISTS "stores: owner update"  ON stores;
DROP POLICY IF EXISTS "stores: owner delete"  ON stores;
DROP POLICY IF EXISTS "stores: public select" ON stores;

-- Public can read any store (needed for the public catalog page)
CREATE POLICY "stores: public select"
  ON stores FOR SELECT
  USING (true);

-- Only the owner can insert their store
CREATE POLICY "stores: owner insert"
  ON stores FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Only the owner can update their store
CREATE POLICY "stores: owner update"
  ON stores FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Only the owner can delete their store
CREATE POLICY "stores: owner delete"
  ON stores FOR DELETE
  USING (auth.uid() = user_id);


-- ── PRODUCTS ────────────────────────────────────────────────
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "products: public select available" ON products;
DROP POLICY IF EXISTS "products: owner select all"        ON products;
DROP POLICY IF EXISTS "products: owner insert"            ON products;
DROP POLICY IF EXISTS "products: owner update"            ON products;
DROP POLICY IF EXISTS "products: owner delete"            ON products;

-- Public can only read available products
CREATE POLICY "products: public select available"
  ON products FOR SELECT
  USING (available = true OR auth.uid() = user_id);

-- Only the owner can insert products (plan limit enforced by trigger)
CREATE POLICY "products: owner insert"
  ON products FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Only the owner can update their products
CREATE POLICY "products: owner update"
  ON products FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Only the owner can delete their products
CREATE POLICY "products: owner delete"
  ON products FOR DELETE
  USING (auth.uid() = user_id);
