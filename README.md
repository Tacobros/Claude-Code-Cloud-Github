# ProductSpot

SaaS de **catálogos digitales con pedidos por WhatsApp** para pequeños negocios en Guatemala. Cada comercio crea su tienda, personaliza el catálogo con un editor visual estilo Shopify y comparte un enlace público donde sus clientes piden por WhatsApp.

## Stack

- **Frontend:** HTML / CSS / JavaScript vanilla (sin framework ni build).
- **Backend:** [Supabase](https://supabase.com) (Postgres + Auth + Storage + Edge Functions).
- **Hosting:** [Cloudflare Pages](https://pages.cloudflare.com) + Pages Functions (`/functions`).

## Estructura

| Área | Archivos |
|------|----------|
| Landing pública | `landing.html`, `styles.css` |
| Catálogo público de cada tienda | `index.html`, `app.js`, `supabase.js` |
| Registro | `register.html`, `register.js` |
| Panel del comerciante | `admin.html`, `admin.css`, `admin.js` |
| Editor visual | `editor.html`, `editor.css`, `editor.js` |
| Superadmin (gestión de tiendas) | `superadmin.html`, `superadmin.js` |
| Legales | `terms.html`, `privacy.html` |
| Cloudflare Pages Functions | `functions/` (middleware OG + `/api/*`) |
| Supabase (SQL + Edge Functions) | `supabase/` |

## Base de datos

Las tablas y políticas se definen con scripts SQL. **Orden canónico** (ejecutar en el SQL Editor de Supabase):

1. `supabase-setup.sql` — tablas base `products` y `stores`.
2. `setup.sql` — columnas de personalización del catálogo + datos de ejemplo.
3. `superadmin-setup.sql` — columnas `plan`/`status`, tabla y RPCs de superadmin.
4. `supabase/migrations/001_rls_policies.sql` — políticas RLS.
5. `supabase/migrations/002_plan_enforcement.sql` — límite de productos por plan.
6. `supabase/migrations/003_analytics.sql`, `004_*`, `005_newsletter.sql`.
7. `supabase/migrations/006_security_hardening.sql` — **importante** (ver abajo).

> Los archivos `stripe-setup.sql` y `paypal-setup.sql` quedaron **obsoletos**: las columnas de facturación se movieron a la tabla privada `store_billing` en la migración 006.

### Seguridad (migración 006)

- `plan`, `status` y `user_id` de `stores` solo se pueden modificar desde el `service_role` (webhooks de pago) o un superadmin. Un usuario normal no puede auto-subirse de plan ni revertir una suspensión.
- Los identificadores de facturación viven en `store_billing`, sin políticas RLS (solo accesible por el `service_role`).

## Planes

| Plan | Precio | Límite de productos |
|------|--------|---------------------|
| Free | Q0 /mes | 5 |
| Starter | Q39.99 /mes | 50 |
| Pro | Q80 /mes | ilimitado |

> El precio mostrado es solo informativo. El cobro real lo define el plan configurado en la pasarela de pago.

## Pagos

Integración de cobro de suscripciones **pendiente de decidir** la pasarela (candidata: una que opere en Guatemala con retiro a banco local en GTQ). Existe código histórico de Stripe y PayPal en `supabase/functions/` que se reemplazará.

## Variables de entorno

**Supabase Edge Functions:** `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, y las de cada pasarela.

**Cloudflare Pages:** `TURNSTILE_SECRET_KEY` (validación de registro), `RESEND_API_KEY` (correos), opcionalmente `SUPABASE_URL` y `SUPABASE_ANON_KEY`.
