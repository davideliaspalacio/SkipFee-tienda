'use client';

import { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { OrderBuilder } from '@/components/OrderBuilder';
import type { ActivePromotion, CheckoutValid } from '@/lib/checkout';

/**
 * Página de revisión SIN backend (`/demo`).
 *
 * Siembra `['promotions','active']` con un mock para que las promos se
 * rendericen sin pegarle a la red, y monta <OrderBuilder/> con un
 * `CheckoutValid` realista (catálogo con varias categorías, items con y sin
 * foto, carrito ya con líneas y totales coherentes, entrega + cliente llenos
 * para que `hasDeliveryData` sea true y se vea el flujo completo, businessOpen).
 *
 * Nota: las mutaciones de carrito (sumar/restar/propina) y el pago SÍ pegarían
 * a la red real (apuntan a NEXT_PUBLIC_API_BASE_URL). Esta página es para
 * revisar VISUALMENTE el diseño, no el flujo server-authoritative.
 */

// Productos del catálogo (algunos con img=null para ver el placeholder ilustrado).
const SANDWICH_PASTRAMI = { id: 'p-pastrami', name: 'Pastrami Bros', price: 28000, cat: 'Sándwiches', img: null, description: 'Pastrami curado 12h, mostaza dijon y pepinillos en pan de centeno.' };
const SANDWICH_CUBANO = { id: 'p-cubano', name: 'Cubano', price: 26000, cat: 'Sándwiches', img: null, description: 'Cerdo desmechado, jamón, queso suizo y pickles prensado.' };
const SANDWICH_PORCHETTA = { id: 'p-porchetta', name: 'Porchetta', price: 30000, cat: 'Sándwiches', img: 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=640&q=70', description: 'Porchetta crocante con rúgula y alioli de limón.' };
const SANDWICH_REUBEN = { id: 'p-reuben', name: 'Reuben Brisket', price: 32000, cat: 'Sándwiches', img: null, description: null };

const COMBO_PASTRAMI = { id: 'c-pastrami', name: 'Combo Pastrami + Coca', price: 32000, cat: 'Combos', img: null, description: 'Pastrami Bros + Coca-Cola 400ml + papas.' };
const COMBO_DOBLE = { id: 'c-doble', name: 'Combo Doble', price: 58000, cat: 'Combos', img: 'https://images.unsplash.com/photo-1550547660-d9450f859349?w=640&q=70', description: 'Dos subs a elección + dos bebidas.' };

const BEBIDA_LIMONADA = { id: 'b-limonada', name: 'Limonada de coco', price: 9000, cat: 'Bebidas', img: null, description: 'Refrescante, sin lactosa.' };
const BEBIDA_COCA = { id: 'b-coca', name: 'Coca-Cola Zero', price: 6000, cat: 'Bebidas', img: null, description: null };
const BEBIDA_CERVEZA = { id: 'b-club', name: 'Cerveza Club Colombia', price: 8000, cat: 'Bebidas', img: 'https://images.unsplash.com/photo-1608270586620-248524c67de9?w=640&q=70', description: 'Bien fría.' };

const POSTRE_BROWNIE = { id: 'd-brownie', name: 'Brownie con helado', price: 14000, cat: 'Postres', img: null, description: 'Brownie tibio + helado de vainilla.' };
const POSTRE_CHEESECAKE = { id: 'd-cheese', name: 'Cheesecake de maracuyá', price: 13000, cat: 'Postres', img: null, description: null };

const MOCK_VALID: CheckoutValid = {
  ok: true,
  status: 'valida',
  order: {
    orderId: 'demo-0001-aaaa-bbbb-cccc',
    phone: '+573001234567',
    expiresAt: new Date(Date.now() + 30 * 60_000).toISOString(),
    cart: {
      items: [
        { productId: 'p-pastrami', name: 'Pastrami Bros', qty: 2, price: 28000, lineTotal: 56000 },
        { productId: 'b-limonada', name: 'Limonada de coco', qty: 1, price: 9000, lineTotal: 9000 },
        // Postre de regalo: línea $0 no editable (gift).
        { productId: 'gift-brownie', name: 'Brownie de regalo', qty: 1, price: 0, lineTotal: 0, gift: true },
      ],
      subtotal: 65000,
      discount: 5600,
      delivery: 4500,
      peakSurcharge: 0,
      tip: 6500,
      tipPercent: 10,
      total: 70400,
      appliedPromo: {
        id: 'promo-pastrami',
        name: 'Martes de Pastrami −20%',
        description: '20% en Pastrami Bros todos los martes.',
        kind: 'product',
        discountType: 'percent',
        amount: 5600,
      },
    },
    delivery: {
      address: 'Cra. 35 #8-71, apto 502, El Poblado',
      zoneId: 'poblado',
      lat: 6.2087,
      lng: -75.5658,
    },
    customer: {
      name: 'María Camila Ruiz',
      email: 'maria.ruiz@example.com',
    },
    wompiStatusMessage: null,
    gift: { name: 'Brownie de regalo' },
  },
  catalog: {
    categories: [
      { cat: 'Sándwiches', items: [SANDWICH_PASTRAMI, SANDWICH_CUBANO, SANDWICH_PORCHETTA, SANDWICH_REUBEN] },
      { cat: 'Combos', items: [COMBO_PASTRAMI, COMBO_DOBLE] },
      { cat: 'Bebidas', items: [BEBIDA_LIMONADA, BEBIDA_COCA, BEBIDA_CERVEZA] },
      { cat: 'Postres', items: [POSTRE_BROWNIE, POSTRE_CHEESECAKE] },
    ],
  },
  zones: [
    { id: 'poblado', name: 'El Poblado', tarifa: 4500, recargo: 1500 },
    { id: 'envigado', name: 'Envigado', tarifa: 5500, recargo: 2000 },
    { id: 'laureles', name: 'Laureles', tarifa: 5000, recargo: 1500 },
  ],
  businessOpen: true,
  opensLabel: null,
};

const MOCK_PROMOS: ActivePromotion[] = [
  {
    id: 'promo-pastrami',
    kind: 'product',
    name: 'Martes de Pastrami −20%',
    description: '20% en Pastrami Bros todos los martes.',
    discount_type: 'percent',
    discount_value: 20,
    min_subtotal: 0,
    config: { product_ids: ['p-pastrami'], weekdays: [2] },
    starts_at: null,
    ends_at: null,
    products: [
      { id: 'p-pastrami', name: 'Pastrami Bros', price: 28000, cat: 'Sándwiches', img: null, description: 'Pastrami curado 12h.' },
    ],
  },
  {
    id: 'promo-combo',
    kind: 'product',
    name: 'Combo Doble −$8k',
    description: 'Ahorrá en el Combo Doble.',
    discount_type: 'fixed',
    discount_value: 8000,
    min_subtotal: 40000,
    config: { product_ids: ['c-doble'] },
    starts_at: null,
    ends_at: null,
    products: [
      { id: 'c-doble', name: 'Combo Doble', price: 58000, cat: 'Combos', img: 'https://images.unsplash.com/photo-1550547660-d9450f859349?w=640&q=70', description: 'Dos subs + dos bebidas.' },
    ],
  },
  {
    id: 'promo-2x1',
    kind: 'product',
    name: '2×1 en Postres',
    description: 'Llevá dos, pagá uno.',
    discount_type: 'two_for_one',
    discount_value: 0,
    min_subtotal: 0,
    config: { product_ids: ['d-brownie', 'd-cheese'] },
    starts_at: null,
    ends_at: null,
    products: [
      { id: 'd-brownie', name: 'Brownie con helado', price: 14000, cat: 'Postres', img: null, description: null },
      { id: 'd-cheese', name: 'Cheesecake de maracuyá', price: 13000, cat: 'Postres', img: null, description: null },
    ],
  },
];

export default function DemoPage() {
  const [qc] = useState(() => {
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false, refetchOnWindowFocus: false } },
    });
    // Sembrar las promos activas para que se rendericen sin pegarle a la red.
    client.setQueryData(['promotions', 'active'], { ok: true, promotions: MOCK_PROMOS });
    return client;
  });

  return (
    <QueryClientProvider client={qc}>
      <OrderBuilder data={MOCK_VALID} onUnusable={() => {}} />
    </QueryClientProvider>
  );
}
