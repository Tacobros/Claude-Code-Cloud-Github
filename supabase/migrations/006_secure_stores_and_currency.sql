-- ============================================================
-- SEGURIDAD DE COLUMNAS + MONEDA — ProductSpot
-- Run this in Supabase → SQL Editor (after 005_newsletter.sql)
--
-- 1. Restringe qué columnas de `stores` puede leer el público:
--    los IDs de facturación (Stripe/PayPal) dejan de ser visibles
--    con la anon key. La RLS "public select" sigue activa; esto
--    limita las COLUMNAS, la RLS limita las FILAS.
-- 2. Agrega la columna `currency` para mostrar precios en la
--    moneda de cada tienda (antes "Q … GTQ" estaba fijo en código).
--
-- IMPORTANTE: ejecutar ANTES de desplegar el frontend que pide
-- columnas explícitas (app.js / admin.js / editor.js).
-- ============================================================

-- ── 1. Asegurar que todas las columnas públicas existen ─────
-- (idempotente; evita que el GRANT falle si alguna migración
--  de diseño no se corrió en este proyecto)
ALTER TABLE stores
  ADD COLUMN IF NOT EXISTS description    text,
  ADD COLUMN IF NOT EXISTS wa_message     text,
  ADD COLUMN IF NOT EXISTS plan           text,
  ADD COLUMN IF NOT EXISTS currency       text DEFAULT 'GTQ',
  ADD COLUMN IF NOT EXISTS accent_color   text,
  ADD COLUMN IF NOT EXISTS logo_url       text,
  ADD COLUMN IF NOT EXISTS hero_badge     text,
  ADD COLUMN IF NOT EXISTS hero_title     text,
  ADD COLUMN IF NOT EXISTS hero_subtitle  text,
  ADD COLUMN IF NOT EXISTS hero_image_url text,
  ADD COLUMN IF NOT EXISTS catalog_title    text,
  ADD COLUMN IF NOT EXISTS catalog_subtitle text,
  ADD COLUMN IF NOT EXISTS cta_title      text,
  ADD COLUMN IF NOT EXISTS cta_desc       text,
  ADD COLUMN IF NOT EXISTS custom_categories text[],
  ADD COLUMN IF NOT EXISTS show_gallery   boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS gallery1_img   text,
  ADD COLUMN IF NOT EXISTS gallery1_title text,
  ADD COLUMN IF NOT EXISTS gallery2_img   text,
  ADD COLUMN IF NOT EXISTS gallery2_title text,
  ADD COLUMN IF NOT EXISTS gallery3_img   text,
  ADD COLUMN IF NOT EXISTS gallery3_title text,
  ADD COLUMN IF NOT EXISTS gallery4_img   text,
  ADD COLUMN IF NOT EXISTS gallery4_title text,
  ADD COLUMN IF NOT EXISTS about_title    text,
  ADD COLUMN IF NOT EXISTS about1_icon    text,
  ADD COLUMN IF NOT EXISTS about1_title   text,
  ADD COLUMN IF NOT EXISTS about1_desc    text,
  ADD COLUMN IF NOT EXISTS about2_icon    text,
  ADD COLUMN IF NOT EXISTS about2_title   text,
  ADD COLUMN IF NOT EXISTS about2_desc    text,
  ADD COLUMN IF NOT EXISTS about3_icon    text,
  ADD COLUMN IF NOT EXISTS about3_title   text,
  ADD COLUMN IF NOT EXISTS about3_desc    text,
  ADD COLUMN IF NOT EXISTS about4_icon    text,
  ADD COLUMN IF NOT EXISTS about4_title   text,
  ADD COLUMN IF NOT EXISTS about4_desc    text,
  ADD COLUMN IF NOT EXISTS stat1_value    text,
  ADD COLUMN IF NOT EXISTS stat1_label    text,
  ADD COLUMN IF NOT EXISTS stat2_value    text,
  ADD COLUMN IF NOT EXISTS stat2_label    text,
  ADD COLUMN IF NOT EXISTS stat3_value    text,
  ADD COLUMN IF NOT EXISTS stat3_label    text,
  ADD COLUMN IF NOT EXISTS stat4_value    text,
  ADD COLUMN IF NOT EXISTS stat4_label    text;

-- Tiendas existentes sin moneda quedan en GTQ
UPDATE stores SET currency = 'GTQ' WHERE currency IS NULL;

-- ── 2. Restringir SELECT por columna ────────────────────────
-- Quita el SELECT total y otorga solo las columnas que la tienda
-- pública y el panel necesitan. stripe_customer_id,
-- stripe_subscription_id, paypal_subscription_id y
-- plan_expires_at quedan accesibles SOLO vía service_role
-- (webhooks / edge functions), nunca desde el navegador.
REVOKE SELECT ON stores FROM anon, authenticated;

GRANT SELECT (
  id, user_id, name, slug, whatsapp, wa_message, description,
  plan, currency, accent_color, logo_url,
  hero_badge, hero_title, hero_subtitle, hero_image_url,
  catalog_title, catalog_subtitle, cta_title, cta_desc,
  custom_categories, show_gallery,
  gallery1_img, gallery1_title, gallery2_img, gallery2_title,
  gallery3_img, gallery3_title, gallery4_img, gallery4_title,
  about_title,
  about1_icon, about1_title, about1_desc,
  about2_icon, about2_title, about2_desc,
  about3_icon, about3_title, about3_desc,
  about4_icon, about4_title, about4_desc,
  stat1_value, stat1_label, stat2_value, stat2_label,
  stat3_value, stat3_label, stat4_value, stat4_label
) ON stores TO anon, authenticated;
