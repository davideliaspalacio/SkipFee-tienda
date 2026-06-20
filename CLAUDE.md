# tienda-skipfee — Storefront / checkout del cliente

> Contexto del ecosistema: ver [`../CLAUDE.md`](../CLAUDE.md). Este doc es el detalle de la tienda.

## Propósito

Superficie **pública y sin login** que el cliente abre desde el **link de WhatsApp** generado por el bot (`/pedir?orderId=<uuid>&userId=<phone>`). Permite ver el catálogo, armar/editar el carrito, aplicar promos, dar propina, llenar datos de entrega (prefilled por el bot) y **pagar con Wompi**. Tras pagar, la orden entra al kanban de admin. `version` 0.1.0, en uso.

## Stack

- **Next.js 16.2.6** (App Router) + React 19 + TypeScript strict.
- **`@tanstack/react-query` 5** (`retry:false`, `refetchOnWindowFocus:false`).
- **Wompi Widget** (`widget.js`, cargado diferido al pagar) — wrapper en `lib/wompi.ts`.
- CSS: `app/brand.css` (design system global) + `components/storefront.module.css` (scoped).
- Dev en `localhost:3002`. Deploy: `output: "export"` → `out/` → Cloudflare (`wrangler.jsonc`, worker `skipfee-tienda`, SPA fallback).

## Estructura

```
app/
  pedir/page.tsx                    # ruta principal /pedir?orderId=...&userId=...
  pedir/pago/resultado/page.tsx     # post-pago: polling de estado + tracking
  demo/page.tsx                     # preview con mock, sin backend
  providers.tsx  layout.tsx  brand.css
components/
  OrderBuilder.tsx                  # ~1100 líneas: catálogo + carrito + checkout (el grueso)
  CartExpired.tsx                   # pantalla para link vencido/usado/no encontrado
  storefront.module.css
lib/
  checkout.ts                       # cliente HTTP tipado + tipos del CONTRATO (sin React)
  wompi.ts                          # abrir widget / redirect
  icons.tsx foodIcons.tsx data.ts
```

- Rutas son Client Components (usan `useSearchParams()` envuelto en `<Suspense>` por el export estático).

## Contrato de datos (tienda ↔ backend)

Base URL `NEXT_PUBLIC_API_BASE_URL` (prod `https://backend.skipfee.co`). Cliente en `lib/checkout.ts` con error tipado `CheckoutError`:
- `GET /api/checkout/:orderId?userId=` → estado: `valida | ya_usada | expirada | no_encontrada`.
- `PUT /api/checkout/:orderId/cart` → edita ítems/propina/entrega, el **backend recalcula** totales y descuentos.
- `POST /api/checkout/:orderId/pay` → devuelve `widgetConfig` (firmado) o `paymentLink`.
- `GET /api/promotions/active` → promos vigentes (refetch ~60s).

## Flujo de pago

1. `POST /pay` (tras bloquear total y hacer flush de la propina) → `widgetConfig` o `paymentLink`.
2. Abre **Widget Wompi** (`NEXT_PUBLIC_WOMPI_CHECKOUT_MODE=widget`) o **redirect** (`=redirect`).
3. El cliente paga (tarjeta/PSE/BNPL) → vuelve a `/pedir/pago/resultado?orderId=...`.
4. La página hace **polling** de `GET /api/checkout/:orderId` cada ~5s hasta que el webhook de Wompi confirma.
5. Pago rechazado → la orden vuelve a borrador con `wompiStatusMessage` (motivo).

## E-commerce: qué hay y qué no

- ✅ Catálogo por categorías, carrito (qty 1-99), subtotal, **descuentos por promos (automáticos del backend)**, costo de entrega por zona, recargo hora pico, **propina** (optimista + persistencia debounced 350ms), postre de regalo (`gift`, price 0), total.
- ✅ Validación: requiere nombre + zona válida; si `businessOpen=false` bloquea pago.
- ✅ Datos prefilled por el bot (nombre/email/dirección/zona).
- ❌ Sin búsqueda, sin login, sin cupones manuales, sin historial (acceso efímero por `orderId`), sin tracking GPS (solo timeline de estados).

## Acceso y seguridad

Sin auth de usuario. El control es el **`orderId` (UUID no adivinable)**; `userId` (teléfono) es solo contexto. El backend responde `ok:false` si la orden no existe/venció. No hay datos sensibles en el cliente.

## Estado y gotchas

- v0.1.0, production-ready, en uso. Sin TODOs ni tests (la página `/demo` sirve de QA visual).
- **Sincronización optimista** carrito/propina; el total se **bloquea antes de pagar** para no desincronizar con el monto firmado por Wompi — cuidado al tocar esa lógica.
- Manejo de estados de error: `409` → `<CartExpired/>` (vencido/cerrado/usado).
- `noindex` (cada link es privado). Imágenes sin optimizar (vienen de Storage).
- No rompas `output: export`. Origen `:3002` debe estar en `STOREFRONT_ORIGIN`/`EXTRA_CORS_ORIGINS` del backend.
