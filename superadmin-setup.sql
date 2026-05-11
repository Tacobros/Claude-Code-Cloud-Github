-- ============================================================
-- ProductSpot — SuperAdmin Setup
-- Ejecutar en: Supabase → SQL Editor → New query → Run
-- ============================================================

-- 1. Columnas plan y status en stores
ALTER TABLE stores ADD COLUMN IF NOT EXISTS plan   text DEFAULT 'free';
ALTER TABLE stores ADD COLUMN IF NOT EXISTS status text DEFAULT 'active';

-- 2. Tabla de emails autorizados como superadmin
CREATE TABLE IF NOT EXISTS superadmin_config (
  id    integer PRIMARY KEY DEFAULT 1,
  email text NOT NULL
);

-- ⚠️  Cambia el email por el tuyo y ejecuta:
INSERT INTO superadmin_config (id, email)
VALUES (1, 'admin@productspot.com')
ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email;

-- Nadie puede leer esta tabla directamente
ALTER TABLE superadmin_config ENABLE ROW LEVEL SECURITY;

-- 3. Función helper: ¿es el usuario actual superadmin?
CREATE OR REPLACE FUNCTION is_superadmin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM superadmin_config
    WHERE email = (auth.jwt() ->> 'email')
  );
$$;

GRANT EXECUTE ON FUNCTION is_superadmin() TO authenticated;

-- 4. RPC: obtener todas las tiendas con conteo de productos y email del dueño
CREATE OR REPLACE FUNCTION superadmin_get_stores()
RETURNS TABLE (
  id            bigint,
  user_id       uuid,
  owner_email   text,
  name          text,
  slug          text,
  whatsapp      text,
  plan          text,
  status        text,
  created_at    timestamptz,
  product_count bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT is_superadmin() THEN
    RAISE EXCEPTION 'Unauthorized: superadmin access required';
  END IF;

  RETURN QUERY
  SELECT
    s.id,
    s.user_id,
    u.email::text,
    s.name,
    s.slug,
    COALESCE(s.whatsapp, ''),
    COALESCE(s.plan, 'free'),
    COALESCE(s.status, 'active'),
    s.created_at,
    COUNT(p.id)::bigint
  FROM stores s
  LEFT JOIN auth.users  u ON u.id       = s.user_id
  LEFT JOIN products    p ON p.user_id  = s.user_id
  GROUP BY s.id, u.email
  ORDER BY s.created_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION superadmin_get_stores() TO authenticated;

-- 5. RPC: actualizar plan o estado de una tienda
CREATE OR REPLACE FUNCTION superadmin_update_store(
  p_store_id bigint,
  p_plan     text DEFAULT NULL,
  p_status   text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT is_superadmin() THEN
    RAISE EXCEPTION 'Unauthorized: superadmin access required';
  END IF;

  UPDATE stores SET
    plan   = COALESCE(p_plan,   plan),
    status = COALESCE(p_status, status)
  WHERE id = p_store_id;
END;
$$;

GRANT EXECUTE ON FUNCTION superadmin_update_store(bigint, text, text) TO authenticated;
