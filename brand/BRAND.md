# Marca ProductSpot — guía rápida de implementación

El manual de marca completo (logotipo, color, tipografía, motion, voz y componentes
con previews en vivo) vive en el sistema de diseño:
**https://claude.ai/artifact/PgSNRQgccgoLvNHiisjoZ5**

Esta carpeta contiene las piezas maestras del logotipo en SVG:

| Archivo | Uso |
| --- | --- |
| `logo-icon.svg` | Isotipo sobre fondo claro (favicon, avatar) |
| `logo-icon-dark.svg` | Isotipo sobre fondo oscuro |
| `logo-full.svg` | Lockup horizontal sobre claro (requiere Space Grotesk) |
| `logo-full-dark.svg` | Lockup horizontal sobre oscuro |

## Tokens esenciales (CSS)

```css
:root {
  /* Color (tema claro) */
  --coral: #e94560;         /* marca y acción primaria (reemplaza a --accent) */
  --coral-strong: #c22844;  /* texto pequeño coral y hover del primario */
  --spot: #ffb454;          /* badges destacados, siempre con texto ink */
  --surface: #f7f8fc;
  --surface-raised: #ffffff;
  --ink: #0f172a;
  --ink-muted: #5b6478;
  --line: #e3e7f0;
  --whatsapp: #1fa855;      /* exclusivo de acciones de WhatsApp */
  --success: #15803d;
  --danger: #dc2626;
  /* Radios */
  --radius-sm: 8px; --radius-md: 12px; --radius-lg: 18px; --radius-pill: 999px;
  /* Motion */
  --motion-fast: 150ms; --motion-base: 250ms; --motion-slow: 450ms;
  --ease-spot: cubic-bezier(0.22, 1, 0.36, 1);
  --ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1);
}
```

Valores del tema oscuro y reglas de uso: ver el manual.

## Tipografía

```html
<link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;700&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
```

- **Space Grotesk 700**: titulares y wordmark (`ProductSpot`, con "Spot" en coral).
- **Inter**: interfaz y texto (ya es la fuente del producto).
- Precios siempre con `font-variant-numeric: tabular-nums`.
