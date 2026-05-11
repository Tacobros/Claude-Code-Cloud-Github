-- ============================================================
-- ProductSpot — PayPal Billing Setup
-- Ejecutar en: Supabase → SQL Editor → New query → Run
-- ============================================================

-- Columna para guardar el ID de suscripción de PayPal
ALTER TABLE stores
  ADD COLUMN IF NOT EXISTS paypal_subscription_id text,
  ADD COLUMN IF NOT EXISTS plan_expires_at         timestamptz;

-- Índice para búsquedas desde el webhook
CREATE INDEX IF NOT EXISTS idx_stores_paypal_sub ON stores (paypal_subscription_id);
