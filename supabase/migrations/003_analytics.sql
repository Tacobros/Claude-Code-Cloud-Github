-- ============================================================
-- ANALYTICS — ProductSpot
-- Run this in Supabase → SQL Editor
-- ============================================================

CREATE TABLE IF NOT EXISTS store_events (
  id          BIGSERIAL PRIMARY KEY,
  store_id    BIGINT REFERENCES stores(id) ON DELETE CASCADE,
  event_type  TEXT NOT NULL,  -- 'catalog_view' | 'whatsapp_click' | 'product_view'
  product_id  BIGINT REFERENCES products(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_store_events_store_id   ON store_events(store_id);
CREATE INDEX IF NOT EXISTS idx_store_events_created_at ON store_events(created_at);
CREATE INDEX IF NOT EXISTS idx_store_events_type       ON store_events(event_type);

ALTER TABLE store_events ENABLE ROW LEVEL SECURITY;

-- Store owners can read their own events
DROP POLICY IF EXISTS "events: owner select" ON store_events;
CREATE POLICY "events: owner select"
  ON store_events FOR SELECT
  USING (store_id IN (SELECT id FROM stores WHERE user_id = auth.uid()));

-- Anyone (including anonymous visitors) can insert events
DROP POLICY IF EXISTS "events: public insert" ON store_events;
CREATE POLICY "events: public insert"
  ON store_events FOR INSERT
  WITH CHECK (true);
