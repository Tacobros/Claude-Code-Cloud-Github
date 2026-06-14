-- ============================================================
-- 008 · Evitar el listado del bucket product-images
-- ============================================================
-- El bucket "product-images" es público: las imágenes se sirven por la
-- URL pública (getPublicUrl) sin necesitar una política SELECT en
-- storage.objects. La política previa permitía enumerar TODOS los
-- archivos del bucket vía API. La app solo usa upload() y getPublicUrl(),
-- nunca list(), así que eliminarla no afecta la funcionalidad.
DROP POLICY IF EXISTS "Imágenes públicas de lectura" ON storage.objects;
