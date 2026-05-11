-- ============================================================
-- ProductSpot — Stripe Integration Setup
-- Ejecutar en: Supabase → SQL Editor → New query → Run
-- ============================================================

-- Add Stripe billing columns to stores
ALTER TABLE stores
  ADD COLUMN IF NOT EXISTS stripe_customer_id     text,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id text,
  ADD COLUMN IF NOT EXISTS plan_expires_at         timestamptz;

-- Index for webhook lookups by customer
CREATE INDEX IF NOT EXISTS idx_stores_stripe_customer ON stores (stripe_customer_id);
