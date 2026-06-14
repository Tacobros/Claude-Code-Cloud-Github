# CLAUDE.md

Guía para trabajar en este repositorio.

## Qué es

ProductSpot: SaaS de catálogos digitales con pedidos por WhatsApp (Guatemala).
Stack: HTML/CSS/JS vanilla + Supabase + Cloudflare Pages. **No hay build ni framework** — los archivos se sirven tal cual.

## Convenciones

- JS vanilla, sin dependencias de build. Mantén el estilo existente (mismas comillas, nombres y densidad de comentarios que el archivo que edites).
- El idioma de la UI y los comentarios es **español**.
- Precios al público en **Quetzales (Q)**. Los precios de producto se guardan como número y se muestran como `Q{price} GTQ`.
- Al inyectar contenido controlado por el usuario con `innerHTML`, **escápalo** (ver `esc()` en `app.js`).

## Mapa rápido

- Catálogo público anónimo: `index.html` + `app.js` (lee `stores`/`products` con la anon key).
- Panel del comerciante (autenticado): `admin.html` + `admin.js`.
- Editor visual: `editor.html` + `editor.js` (previsualiza `index.html?preview=1` por postMessage).
- Superadmin: `superadmin.html` + `superadmin.js` (usa RPCs `superadmin_*`, todas validan `is_superadmin()`).
- Pages Functions: `functions/_middleware.js` (meta OG dinámico para `/?s=slug`) y `functions/api/*`.
- Backend SQL/Edge: `supabase/`.

## Base de datos / seguridad

- RLS está activado. **No** reintroduzcas un `SELECT` público sobre columnas sensibles.
- `plan`, `status`, `user_id` de `stores` están protegidos por el trigger `protect_store_fields` (migración 006): solo `service_role` o superadmin los cambian.
- Datos de facturación → tabla `store_billing` (solo `service_role`).
- Orden de scripts SQL: ver README. Las migraciones nuevas van en `supabase/migrations/` numeradas y deben ser **idempotentes** (`IF NOT EXISTS`, `DROP ... IF EXISTS`).
- **Aplicación de cambios:** el usuario prefiere que apliques los cambios de Supabase tú mismo vía el conector MCP (proyecto `vowsvdzjyvpalyvkfxte`): `apply_migration` para SQL/DDL y `deploy_edge_function` para las funciones, además de guardar el archivo en el repo. No te limites a entregar instrucciones. Tras cambios DDL, corre `get_advisors`.

## Git

- Rama de trabajo asignada: `claude/youthful-bohr-7w7gjm`. No empujes a otra rama sin permiso.
- No abras Pull Requests salvo que se pida explícitamente.

## Pendientes conocidos

- Integración de pasarela de pago para suscripciones (pendiente de elegir; debe operar en Guatemala / GTQ).
- `plan_expires_at` (en `store_billing`) aún no se aplica automáticamente para degradar planes vencidos (requiere job programado).
