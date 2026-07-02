# ProductSpot — Revisión de lanzamiento

Revisión técnica y mercadológica del estado actual del proyecto, con prioridades
para pulirlo y lanzarlo lo antes posible. Fecha: julio 2026.

---

## 1. Qué tienes hoy (resumen del producto)

- **Tienda pública** (`index.html` + `app.js`): catálogo por slug/subdominio, hero,
  stats, sección "Nosotros", galería, modal de producto con varias imágenes,
  búsqueda, filtros por categoría, botón "Pedir por WhatsApp" con mensaje
  prellenado, enlace compartible por producto y meta tags OG (con middleware de
  Cloudflare para previews en redes).
- **Panel admin** (`admin.html/js`): CRUD de productos con imágenes múltiples,
  acciones masivas, export CSV, personalización de tienda, categorías propias,
  analytics (vistas, clicks de WhatsApp, productos más vistos), página de plan.
- **Editor visual** (`editor.html/js`): edición estilo Shopify con preview en vivo.
- **Landing** (`landing.html`): hero, cómo funciona, testimonios, precios
  (Free $0 / Starter $5 / Pro $10), FAQ, newsletter.
- **Backend Supabase**: RLS, trigger de límite de productos por plan, analytics,
  webhooks de Stripe y PayPal, superadmin.
- **Modelo de negocio**: suscripción sin comisiones; sello "Hecho con ProductSpot"
  en plan Free (motor de crecimiento viral) que se quita en planes de pago.

La base es sólida: el flujo registro → agregar productos → compartir enlace →
pedido por WhatsApp está completo y el enforcement de planes existe tanto en
cliente como en servidor. Lo que sigue es lo que hay que corregir/pulir.

---

## 2. Bloqueadores — corregir ANTES de lanzar

### 2.1 🔴 Fuga de datos: la tabla `stores` es 100% pública

`001_rls_policies.sql` define `stores: public select USING (true)` y `app.js`
hace `select("*")`. Resultado: **cualquier persona con la anon key (que está en
el HTML) puede leer TODAS las columnas de TODAS las tiendas**, incluyendo
`stripe_customer_id`, `stripe_subscription_id`, `paypal_subscription_id`,
`plan_expires_at` y el plan de cada cliente. También permite scrapear en una
sola consulta todos los números de WhatsApp de tus usuarios.

**Fix recomendado:** crear una vista pública con solo las columnas que la tienda
pública necesita, o revocar el SELECT por columna al rol `anon`:

```sql
REVOKE SELECT ON stores FROM anon;
GRANT SELECT (id, user_id, slug, name, whatsapp, wa_message, plan, logo_url,
  accent_color, hero_badge, hero_title, hero_subtitle, hero_image_url,
  catalog_title, catalog_subtitle, cta_title, cta_desc, custom_categories,
  show_gallery /* … resto de columnas de diseño …*/) ON stores TO anon;
```

y cambiar `app.js` para pedir columnas explícitas en vez de `*`.

### 2.2 🔴 XSS almacenado en el catálogo público

`renderProducts()` y `openModal()` en `app.js` inyectan `p.name`, `p.desc`,
`p.category`, tallas y URLs de imagen directamente con `innerHTML`/atributos sin
escapar. Un dueño de tienda puede guardar `<img src=x onerror=...>` como nombre
de producto y ejecutar JavaScript en el navegador de **sus visitantes**, bajo tu
dominio. En una plataforma multi-tenant esto es reputacionalmente tuyo, no del
cliente. Lo mismo aplica en `admin.js` (tabla de productos) y en el mensaje del
título/meta.

**Fix:** función `escapeHtml()` para todo texto proveniente de la BD, y construir
los `href`/`src` con `encodeURI`/validación de URL.

### 2.3 🟠 Registro puede dejar cuentas sin tienda

En `register.js`:
- Si el chequeo de slug falla o hace timeout, se permite continuar
  (`slugAvailable = true` en el catch) y el `insert` de la tienda **no maneja el
  error** de slug duplicado → el usuario queda con cuenta creada y sin tienda.
- Con confirmación de email, los datos de la tienda quedan en `localStorage`
  (`pendingStore`). Si el usuario confirma el correo **en otro dispositivo o
  navegador** (muy común: se registra en la computadora y abre el correo en el
  teléfono), el localStorage no existe → cuenta sin tienda y panel roto.

**Fix:** manejar el error del insert mostrando "ese enlace ya está ocupado", y en
`admin.js` detectar "usuario autenticado sin tienda" y mostrar un mini-formulario
de crear tienda (nombre + slug + WhatsApp) como red de seguridad.

### 2.4 🟠 Moneda quemada en el código: "Q … GTQ"

`app.js` (líneas ~236, 292, 352, 372), `admin.js` (~387) y
`functions/_middleware.js` muestran los precios como `Q{price} GTQ` fijo. Vendes
ProductSpot como plataforma genérica para emprendedores, pero cualquier usuario
de México, Colombia, El Salvador, etc. verá su catálogo en quetzales.

**Fix:** columna `currency` (y símbolo) en `stores` con default `GTQ`, un select
en ajustes del admin, y usarla en todos los renders. Es un campo + un replace;
te abre todo Latam.

### 2.5 🟠 Textos residuales del proyecto original (tienda de camisolas)

La tienda pública todavía asume que vende camisetas de fútbol:
- Buscador: **"Buscar equipo o jugador..."** (`index.html:95`)
- Placeholder de imagen: **👕** (`app.js:282, 338`)
- Modal: **"Tallas disponibles"** siempre visible, aunque el producto no tenga
  tallas (queda una sección vacía para, p. ej., quien vende pasteles)
- Mensaje de WhatsApp: "quiero pedir: X **talla** M"
- `setup.sql` sigue siendo el seed de "CAS — Central America Shirts"

**Fix:** "Buscar producto...", 📦 como placeholder, ocultar la sección de tallas
si `sizes` está vacío (y omitir "talla" del mensaje de WA), e idealmente
renombrar "Tallas" → "Opciones/Variantes" en el admin.

### 2.6 🟠 Datos placeholder visibles en producción

- `landing.html:774` y el CTA de dudas usan **`wa.me/50212345678`** (número
  falso). Todo lead que pregunte por planes se pierde.
- El sello del plan Free enlaza a **`https://productspot.com`**
  (`index.html:187`). Verifica que ese dominio sea tuyo y apunte a tu landing;
  si tu dominio real es otro, el motor viral apunta al vacío.
- `app.js:109`: pie de página "© 2025" quemado → usar
  `new Date().getFullYear()`.
- FAQ dice "cancelas desde tu cuenta de **PayPal**" pero también tienes
  integración Stripe — unifica el texto según qué pasarela realmente actives al
  lanzar.

### 2.7 🟡 Analytics falsificables

`store_events` acepta INSERT de cualquiera sin restricción (`WITH CHECK (true)`),
sin validar `event_type` ni límite de frecuencia. Cualquiera puede inflar las
métricas de una tienda o llenar la tabla. Para lanzar basta con:
`CHECK (event_type IN ('catalog_view','whatsapp_click','product_view'))` y estar
consciente del riesgo; después, un edge function con rate limit.

---

## 3. Mejoras de producto de alto impacto (post-bloqueadores)

Ordenadas por impacto/esfuerzo para la conversión del comprador final (que es lo
que hace que TU cliente pague):

1. **Pedido multi-producto ("canasta ligera")**: hoy cada "Pedir" abre WhatsApp
   con UN producto. Un botón "agregar al pedido" que acumule productos y genere
   un solo mensaje de WhatsApp con la lista completa es la mejora #1 de valor
   para el vendedor (pedidos más grandes, menos fricción). No requiere pagos ni
   backend: es estado en el cliente.
2. **Código QR del catálogo** en el admin (descargable/imprimible): tus usuarios
   venden en persona, en ferias y por estados de WhatsApp. Un QR listo para
   imprimir es una feature barata (librería JS) que además se comparte y te hace
   marketing.
3. **Onboarding con producto de ejemplo**: al crear la tienda, sembrar 1-2
   productos demo editables para que el usuario vea su catálogo "vivo" en el
   minuto 1 y entienda qué llenar. El momento "wow" debe llegar antes de los 5
   minutos.
4. **Sección de tallas → variantes genéricas** (talla, color, sabor…): amplía el
   mercado de "ropa" a "cualquier emprendedor", que es tu promesa.
5. **Compartir por estado de WhatsApp / Instagram**: botón "compartir catálogo"
   en el admin con el enlace + texto sugerido listo para pegar.

---

## 4. Apoyo mercadológico

### 4.1 Posicionamiento — tu competidor #1 es gratis

El catálogo nativo de **WhatsApp Business ya es gratis**. Tu mensaje no puede ser
solo "catálogo + WhatsApp"; debe ser lo que WhatsApp Business NO da:

- Un **enlace propio con tu marca** (subdominio, logo, colores) que se ve
  profesional en Instagram bio, TikTok y estados.
- **Búsqueda, categorías y fotos grandes** — el catálogo de WhatsApp es una
  lista plana horrible con +20 productos.
- **Analytics**: saber qué producto miran y cuántos clics a WhatsApp genera.
- **Cero comisiones** frente a marketplaces.

Sugerencia de tagline: *"Tu catálogo profesional con tu marca. Los pedidos te
llegan por WhatsApp, sin comisiones."* Y en la landing, una sección comparativa
"ProductSpot vs. mandar fotos sueltas vs. catálogo de WhatsApp Business".

### 4.2 Precios y cobro

- $5/$10 está bien calibrado para Latam. Considera **plan anual con descuento**
  (p. ej. $48/año Starter) — para un producto de $5/mes, el churn mensual es el
  enemigo; el plan anual lo mata.
- **PayPal es fricción real en Centroamérica** (mucha gente no tiene cuenta).
  Ya tienes Stripe a medias: prioriza cobro directo con tarjeta, o evalúa una
  pasarela local (p. ej. Recurrente en Guatemala). Cada paso extra de pago te
  cuesta ~30% de conversión.
- El límite de **5 productos en Free es agresivo pero correcto** como palanca de
  upgrade; el verdadero gancho de upgrade es "quitar el sello + tu logo/colores".
  Mantén el sello visible pero elegante (ya lo es).

### 4.3 Go-to-market (con presupuesto ~$0)

1. **Elige un nicho inicial**, no "todos los emprendedores": p. ej. quienes ya
   venden por WhatsApp/Instagram en Guatemala (ropa, repostería, cosméticos).
   Un nicho te da testimonios reales y lenguaje específico para anuncios.
2. **Los testimonios actuales de la landing parecen ficticios** — si lo son,
   reemplázalos cuanto antes: consigue 5-10 usuarios beta gratis (grupos de
   Facebook de emprendedores GT, conocidos), móntales el catálogo tú mismo, y
   usa sus tiendas reales como casos de éxito con enlace clickeable. Una tienda
   real llena es tu mejor página de ventas.
3. **TikTok/Reels de 30-60 s**: "Cómo hice el catálogo de mi negocio en 10
   minutos gratis" grabando la pantalla del onboarding real. Este formato es el
   canal orgánico natural de tu público.
4. **El sello del plan Free es tu loop viral** — cada catálogo gratuito es una
   valla publicitaria. Asegúrate de que enlace a una landing con UTM
   (`?utm_source=badge`) para medir cuántos registros trae.
5. **Programa de referidos simple** después del lanzamiento: "1 mes de Starter
   gratis por cada amigo que se suscriba".
6. **SEO local**: página/blog con "catálogo digital para WhatsApp en Guatemala",
   y considera que los catálogos en subdominio (ya soportado en el código) se
   indexen con el nombre del negocio — SEO gratis para tus clientes es un
   argumento de venta más.

### 4.4 Métricas que debes mirar desde el día 1

- Activación: % de registros que publican ≥1 producto y comparten su enlace.
- Tiempo hasta el primer producto publicado (objetivo: <10 min, como promete tu FAQ).
- % de tiendas Free que llegan al límite de 5 productos (tu pipeline de upgrade).
- Clics en el sello "Hecho con ProductSpot" → registros (loop viral).

---

## 5. Checklist de lanzamiento sugerido (orden de ejecución)

1. [ ] Restringir columnas públicas de `stores` (2.1)
2. [ ] Escapar HTML en catálogo y admin (2.2)
3. [ ] Campo `currency` por tienda y quitar "Q/GTQ" quemado (2.4)
4. [ ] Limpiar textos de camisolas: buscador, 👕, tallas condicionales (2.5)
5. [ ] Número de WhatsApp real en landing + verificar dominio del sello (2.6)
6. [ ] Red de seguridad "cuenta sin tienda" + manejo de slug duplicado (2.3)
7. [ ] Decidir pasarela única (Stripe O PayPal) y alinear FAQ/textos (2.6)
8. [ ] Reclutar 5-10 betas del nicho elegido y reemplazar testimonios (4.3)
9. [ ] Lanzar 🚀 y medir activación (4.4)
10. [ ] Post-lanzamiento: pedido multi-producto, QR, variantes (sección 3)
