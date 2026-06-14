-- ============================================================
-- 009 · Restringir EXECUTE de funciones SECURITY DEFINER expuestas como RPC
-- ============================================================
-- Cierra los avisos del linter sobre funciones SECURITY DEFINER invocables
-- por anon/authenticated vía /rest/v1/rpc/*.

-- Funciones de superadmin: solo usuarios autenticados (ya validan
-- is_superadmin() internamente). Les quitamos el EXECUTE de PUBLIC/anon.
REVOKE EXECUTE ON FUNCTION is_superadmin()                     FROM public, anon;
REVOKE EXECUTE ON FUNCTION superadmin_get_stores()             FROM public, anon;
REVOKE EXECUTE ON FUNCTION superadmin_get_platform_analytics() FROM public, anon;
REVOKE EXECUTE ON FUNCTION superadmin_update_store(bigint, text, text) FROM public, anon;

GRANT EXECUTE ON FUNCTION is_superadmin()                     TO authenticated;
GRANT EXECUTE ON FUNCTION superadmin_get_stores()             TO authenticated;
GRANT EXECUTE ON FUNCTION superadmin_get_platform_analytics() TO authenticated;
GRANT EXECUTE ON FUNCTION superadmin_update_store(bigint, text, text) TO authenticated;

-- Función interna: la app nunca la llama como RPC.
REVOKE EXECUTE ON FUNCTION rls_auto_enable() FROM public, anon, authenticated;
