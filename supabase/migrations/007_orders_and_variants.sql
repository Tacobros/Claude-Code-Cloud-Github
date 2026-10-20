-- ============================================================
-- PEDIDOS + VARIANTES — ProductSpot
-- Run this in Supabase → SQL Editor (after 006)
-- ============================================================

-- Etiqueta de variante por producto (Talla, Color, Sabor…)
ALTER TABLE products ADD COLUMN IF NOT EXISTS variant_label text;

-- Registro de pedidos enviados desde el catálogo
CREATE TABLE IF NOT EXISTS orders (
  id          BIGSERIAL PRIMARY KEY,
  store_id    BIGINT REFERENCES stores(id) ON DELETE CASCADE,
  items       JSONB NOT NULL,
  total       NUMERIC,
  currency    TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT orders_items_shape CHECK (jsonb_typeof(items) = 'array'),
  CONSTRAINT orders_items_size  CHECK (pg_column_size(items) <= 10000)
);

CREATE INDEX IF NOT EXISTS idx_orders_store ON orders(store_id, created_at DESC);

ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- Cualquier visitante del catálogo puede registrar un pedido
DROP POLICY IF EXISTS "orders: public insert" ON orders;
CREATE POLICY "orders: public insert"
  ON orders FOR INSERT
  WITH CHECK (true);

-- Solo el dueño de la tienda lee sus pedidos
DROP POLICY IF EXISTS "orders: owner select" ON orders;
CREATE POLICY "orders: owner select"
  ON orders FOR SELECT
  USING (store_id IN (SELECT id FROM stores WHERE user_id = auth.uid()));
