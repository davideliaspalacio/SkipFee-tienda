# tienda-skipfee — Tienda del cliente

Tienda pública de **Skipfee** (checkout). El cliente abre el link que le manda el bot por
WhatsApp, arma/edita el carrito, y paga en línea (Wompi). Proyecto **separado** (superficie
pública, sin auth), Next.js 16, reusa el design system de la marca con tratamiento cálido/redondeado.

## Desarrollo
```bash
npm install
npm run dev      # http://localhost:3002
```
- Flujo real: `/pedir?orderId=<uuid>&userId=<telefono>` (orderId lo crea el bot).
- **Demo sin backend:** `/demo` renderiza el flujo con datos de ejemplo para revisar el diseño.

Backend en Railway (endpoints públicos `/api/checkout/*`, `/api/promotions/active`). Config en
`.env.local` (`NEXT_PUBLIC_API_BASE_URL`, `NEXT_PUBLIC_WOMPI_CHECKOUT_MODE`).

## Rutas
- `/pedir` — tienda/checkout (lee `orderId`)
- `/pedir/pago/resultado` — resultado del pago (vuelta de Wompi)
- `/demo` — preview con datos mock (dev)

## Stack
- Next.js 16 + React 19 (App Router, export estático a Cloudflare)
- @tanstack/react-query (capa de checkout portada de `../frontend`)
- Design system de marca en `app/brand.css` (lado cliente: cálido/redondeado)
- Pago: Widget/Web Checkout de Wompi (`lib/wompi.ts`)
