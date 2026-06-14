-- ============================================================
-- 007 · FUNCTION HARDENING — ProductSpot
-- Cierra avisos del linter de seguridad de Supabase:
--   · Las funciones de trigger no deben ser invocables como RPC
--     por anon/authenticated.
--   · enforce_product_plan_limit no tenía search_path fijo.
-- ============================================================

-- Las funciones de trigger solo las ejecuta el motor de triggers
-- (como dueño de la tabla), nunca por API. Quitamos el EXECUTE público.
REVOKE EXECUTE ON FUNCTION protect_store_fields()       FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION enforce_product_plan_limit() FROM anon, authenticated, public;

-- Fijar search_path en la función de límite de plan (hardening)
ALTER FUNCTION enforce_product_plan_limit() SET search_path = public;
