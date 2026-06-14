-- ============================================================
-- 006 · SECURITY HARDENING — ProductSpot
-- Ejecutar en: Supabase → SQL Editor (después de los scripts previos)
--
-- Corrige:
--   C1 · El dueño podía auto-cambiar su plan/estado vía la API REST
--        (saltarse el pago / revertir una suspensión).
--   M1 · Las columnas de facturación eran legibles por cualquiera
--        porque "stores" tiene SELECT público.
--   M2 · Políticas RLS duplicadas/contradictorias entre
--        supabase-setup.sql y 001_rls_policies.sql.
-- ============================================================

-- ── M2 · Limpiar políticas legacy duplicadas ────────────────
-- Estas venían de supabase-setup.sql (FOR ALL) y se solapan con
-- las políticas granulares de 001_rls_policies.sql.
DROP POLICY IF EXISTS "Users manage own products" ON products;
DROP POLICY IF EXISTS "Users manage own store"    ON stores;
DROP POLICY IF EXISTS "Public read available products" ON products;

-- ── M1 · Mover datos de facturación a una tabla privada ─────
-- store_billing solo es accesible por el service_role (los webhooks
-- y edge functions). Al no tener políticas RLS, anon/authenticated
-- no pueden leerla ni escribirla.
CREATE TABLE IF NOT EXISTS store_billing (
  store_id               bigint PRIMARY KEY REFERENCES stores(id) ON DELETE CASCADE,
  stripe_customer_id     text,
  stripe_subscription_id text,
  paypal_subscription_id text,
  plan_expires_at        timestamptz,
  updated_at             timestamptz DEFAULT now()
);

-- Migrar los datos existentes (si las columnas aún existen en stores)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'stores' AND column_name = 'stripe_customer_id'
  ) THEN
    INSERT INTO store_billing (store_id, stripe_customer_id, stripe_subscription_id,
                               paypal_subscription_id, plan_expires_at)
    SELECT id, stripe_customer_id, stripe_subscription_id,
           paypal_subscription_id, plan_expires_at
    FROM stores
    WHERE stripe_customer_id     IS NOT NULL
       OR stripe_subscription_id IS NOT NULL
       OR paypal_subscription_id IS NOT NULL
       OR plan_expires_at        IS NOT NULL
    ON CONFLICT (store_id) DO NOTHING;
  END IF;
END $$;

-- Eliminar las columnas sensibles de la tabla pública
ALTER TABLE stores
  DROP COLUMN IF EXISTS stripe_customer_id,
  DROP COLUMN IF EXISTS stripe_subscription_id,
  DROP COLUMN IF EXISTS paypal_subscription_id,
  DROP COLUMN IF EXISTS plan_expires_at;

CREATE INDEX IF NOT EXISTS idx_billing_stripe_customer ON store_billing (stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_billing_stripe_sub      ON store_billing (stripe_subscription_id);
CREATE INDEX IF NOT EXISTS idx_billing_paypal_sub      ON store_billing (paypal_subscription_id);

-- RLS activada y SIN políticas → solo el service_role tiene acceso.
ALTER TABLE store_billing ENABLE ROW LEVEL SECURITY;

-- ── C1 · Congelar plan / status / user_id desde el cliente ──
-- Solo el service_role (webhooks de pago) o un superadmin pueden
-- modificar estas columnas. Para cualquier otro usuario se
-- restauran silenciosamente a su valor anterior.
CREATE OR REPLACE FUNCTION protect_store_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role text;
BEGIN
  v_role := COALESCE(auth.jwt() ->> 'role', current_user);

  -- service_role (edge functions / webhooks) o superadmin: acceso total
  IF v_role = 'service_role' OR current_user = 'service_role' OR is_superadmin() THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    -- Una tienda nueva siempre nace gratuita y activa
    NEW.plan   := 'free';
    NEW.status := 'active';
    RETURN NEW;
  END IF;

  -- UPDATE de usuario normal: no puede tocar estas columnas
  NEW.plan    := OLD.plan;
  NEW.status  := OLD.status;
  NEW.user_id := OLD.user_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_store_fields ON stores;
CREATE TRIGGER trg_protect_store_fields
  BEFORE INSERT OR UPDATE ON stores
  FOR EACH ROW
  EXECUTE FUNCTION protect_store_fields();
