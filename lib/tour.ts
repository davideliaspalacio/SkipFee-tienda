// Guion del mini-recorrido del storefront (driver.js), una sola página (/demo).
// Resalta la experiencia del cliente final: menú, promos, carrito y pago.
// Selectores estables (data-* y elementos), porque el storefront usa CSS modules.

export interface TourStep {
  /** Selector estable a resaltar en desktop. Vacío = popover central. */
  element?: string;
  /** Selector alternativo en móvil. */
  elementMobile?: string;
  section: string;
  title: string;
  /** Acepta HTML simple (<b>). */
  description: string;
}

export const TOUR_STEPS: TourStep[] = [
  {
    section: 'Bienvenida',
    title: '🛒 Así pide tu cliente',
    description:
      'Tu cliente recibe un link por WhatsApp y llega a <b>su tienda, con tu marca</b>. Sin descargar apps, sin crear cuentas. Te muestro el recorrido.',
  },
  {
    element: '[data-cat]',
    section: 'Menú',
    title: '📋 Tu menú, listo para pedir',
    description:
      'Productos con <b>foto, precio y descripción</b>, ordenados por categoría. El cliente arma su pedido en segundos, igual que en una app de delivery.',
  },
  {
    element: '[data-testid="cart-promos-available"]',
    elementMobile: '[data-testid="cart-promos-available"]',
    section: 'Promos',
    title: '✨ Tus promos se aplican solas',
    description:
      'Las promociones vigentes (2×1, descuentos, combos) <b>se aplican automáticamente</b> al carrito. El cliente ve el ahorro al instante, sin códigos.',
  },
  {
    element: '[data-testid="cart-summary"]',
    section: 'Carrito',
    title: '🧾 Todo claro, en vivo',
    description:
      'Subtotal, <b>tu descuento</b>, domicilio, propina y total — todo se actualiza al instante. Cero sorpresas al final, y hasta puede dejar <b>propina</b>.',
  },
  {
    element: '[data-testid="pay-button"]',
    section: 'Pago',
    title: '💳 Paga y la venta es tuya',
    description:
      'Paga con <b>tarjeta, PSE o Nequi</b> (Wompi), seguro y en dos toques. La plata te llega directo: <b>0% de comisión</b>, tus clientes 100% tuyos.',
  },
];
