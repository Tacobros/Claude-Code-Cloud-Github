-- ============================================================
-- CAS (Central America Shirts) — Database Setup
-- Run this in your Supabase SQL Editor
-- ============================================================

-- 1. Add UX builder columns to stores table
ALTER TABLE stores
  ADD COLUMN IF NOT EXISTS logo_url       text,
  ADD COLUMN IF NOT EXISTS hero_title     text,
  ADD COLUMN IF NOT EXISTS hero_subtitle  text,
  ADD COLUMN IF NOT EXISTS hero_image_url text,
  ADD COLUMN IF NOT EXISTS stat1_value    text,
  ADD COLUMN IF NOT EXISTS stat1_label    text,
  ADD COLUMN IF NOT EXISTS stat2_value    text,
  ADD COLUMN IF NOT EXISTS stat2_label    text,
  ADD COLUMN IF NOT EXISTS stat3_value    text,
  ADD COLUMN IF NOT EXISTS stat3_label    text,
  ADD COLUMN IF NOT EXISTS stat4_value    text,
  ADD COLUMN IF NOT EXISTS stat4_label    text,
  ADD COLUMN IF NOT EXISTS about_title    text,
  ADD COLUMN IF NOT EXISTS about1_title   text,
  ADD COLUMN IF NOT EXISTS about1_desc    text,
  ADD COLUMN IF NOT EXISTS about2_title   text,
  ADD COLUMN IF NOT EXISTS about2_desc    text,
  ADD COLUMN IF NOT EXISTS about3_title   text,
  ADD COLUMN IF NOT EXISTS about3_desc    text,
  ADD COLUMN IF NOT EXISTS about4_title   text,
  ADD COLUMN IF NOT EXISTS about4_desc    text;

-- 2. Sample products
-- Replace <YOUR_USER_ID> with your actual Supabase Auth user UUID
-- (find it in Authentication → Users in the Supabase dashboard)

INSERT INTO products (user_id, name, category, price, description, badge, available, sizes, image_urls, image_url)
VALUES
(
  '<YOUR_USER_ID>',
  'Camisola Blanca — Edición Premium',
  'laliga',
  220,
  'Camisola blanca/azul marino de corte slim. Tela climachill transpirable, costuras reforzadas.',
  'popular',
  true,
  ARRAY['S','M','L','XL','XXL'],
  ARRAY['https://d8j0ntlcm91z4.cloudfront.net/user_3D2JpqLiBR3qL3AsmAc90iHP2nK/hf_20260511_000538_2ffbc822-b27d-440b-91c0-d12812e9669e.png'],
  'https://d8j0ntlcm91z4.cloudfront.net/user_3D2JpqLiBR3qL3AsmAc90iHP2nK/hf_20260511_000538_2ffbc822-b27d-440b-91c0-d12812e9669e.png'
),
(
  '<YOUR_USER_ID>',
  'Camisola Roja/Negra — Elite Series',
  'premier',
  230,
  'Diseño rojo y negro de alta gama. Corte atlético, cuello redondo, escudo bordado.',
  'new',
  true,
  ARRAY['XS','S','M','L','XL'],
  ARRAY['https://d8j0ntlcm91z4.cloudfront.net/user_3D2JpqLiBR3qL3AsmAc90iHP2nK/hf_20260511_000627_166b0e71-d3b0-4488-99a5-510e4ea15417.png'],
  'https://d8j0ntlcm91z4.cloudfront.net/user_3D2JpqLiBR3qL3AsmAc90iHP2nK/hf_20260511_000627_166b0e71-d3b0-4488-99a5-510e4ea15417.png'
),
(
  '<YOUR_USER_ID>',
  'Camisola Azul/Dorada — Selección',
  'selecciones',
  250,
  'Azul real con detalles dorados. Edición especial selección centroamericana.',
  'popular',
  true,
  ARRAY['S','M','L','XL','XXL'],
  ARRAY['https://d8j0ntlcm91z4.cloudfront.net/user_3D2JpqLiBR3qL3AsmAc90iHP2nK/hf_20260511_000724_2e8de553-3fec-49d5-a427-7cd8acb42d5a.png'],
  'https://d8j0ntlcm91z4.cloudfront.net/user_3D2JpqLiBR3qL3AsmAc90iHP2nK/hf_20260511_000724_2e8de553-3fec-49d5-a427-7cd8acb42d5a.png'
),
(
  '<YOUR_USER_ID>',
  'Camisola Negra/Verde — Liga Nacional',
  'local',
  180,
  'Negro con detalles verde neon. Ideal para los aficionados de la liga local guatemalteca.',
  null,
  true,
  ARRAY['M','L','XL','XXL'],
  ARRAY['https://d8j0ntlcm91z4.cloudfront.net/user_3D2JpqLiBR3qL3AsmAc90iHP2nK/hf_20260511_000953_83799eea-8163-408e-925d-e4d4320a6375.png'],
  'https://d8j0ntlcm91z4.cloudfront.net/user_3D2JpqLiBR3qL3AsmAc90iHP2nK/hf_20260511_000953_83799eea-8163-408e-925d-e4d4320a6375.png'
);

-- 3. Optional: seed your store settings (replace user_id and values as needed)
-- INSERT INTO stores (user_id, name, whatsapp, description, accent_color,
--                     hero_title, hero_subtitle, hero_image_url)
-- VALUES (
--   '<YOUR_USER_ID>',
--   'CAS — Central America Shirts',
--   '50200000000',
--   'Camisolas deportivas premium en Guatemala.',
--   '#e94560',
--   'Camisolas oficiales y réplicas premium',
--   'Las mejores camisolas de los equipos que amas. Calidad premium, tallas para todos, entrega en toda Guatemala.',
--   'https://d8j0ntlcm91z4.cloudfront.net/user_3D2JpqLiBR3qL3AsmAc90iHP2nK/hf_20260511_000327_09a4e95c-ceff-4d9d-95fd-f66dafc19304.png'
-- );
