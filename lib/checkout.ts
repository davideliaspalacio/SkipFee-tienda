/**
 * Cliente HTTP de la tienda web (checkout público).
 *
 * Refleja EXACTO el contrato de `CONTRACT_CHECKOUT.md`:
 *   - GET  /api/checkout/:orderId?userId=<phone>   (siempre 200, status discriminado)
 *   - PUT  /api/checkout/:orderId/cart             (reemplaza carrito, recalcula totales)
 *   - POST /api/checkout/:orderId/pay              (devuelve paymentLink Wompi)
 *
 * Base URL: `VITE_API_BASE_URL` (sin barra final). En dev: http://localhost:3000.
 * No depende de React ni de React Query: pura capa de transporte tipada.
 */

const API_BASE = (process.env.NEXT_PUBLIC_API_BASE_URL as string | undefined)?.replace(/\/$/, '') ?? '';

// ---------------------------------------------------------------------------
// Tipos del contrato
// ---------------------------------------------------------------------------

/** Estado no utilizable de un checkout (link vencido / inexistente / ya usado). */
export type CheckoutUnusableStatus = 'expirada' | 'no_encontrada' | 'ya_usada';

export interface CartItem {
  productId: string;
  name: string;
  qty: number;
  price: number;
  lineTotal: number;
  /** true si es el postre de regalo: línea a $0 que el cliente no edita. */
  gift?: boolean;
}

export interface Cart {
  items: CartItem[];
  subtotal: number;
  /** Descuento por la promoción automática aplicada (siempre ≥ 0). 0 si no hay. */
  discount: number;
  delivery: number;
  peakSurcharge: number;
  /** Propina elegida (COP). Ya incluida en `total`. 0 si no puso. */
  tip: number;
  /** % de propina elegido (10) o null si custom/none — para marcar el botón. */
  tipPercent: number | null;
  total: number;
  /** Promo aplicada al carrito (la mejor automática). `null` si ninguna aplica. */
  appliedPromo: AppliedPromo | null;
}

export interface AppliedPromo {
  id: string;
  name: string;
  description: string | null;
  kind: 'product' | 'weekday';
  discountType: 'percent' | 'fixed' | 'free_item' | 'two_for_one';
  /** Monto descontado en COP (positivo). */
  amount: number;
}

export interface DeliveryInfo {
  address: string | null;
  zoneId: string | null;
  lat: number | null;
  lng: number | null;
}

export interface CustomerInfo {
  name: string | null;
  email: string | null;
}

/** Producto del catálogo embebido en el GET (forma reducida del contrato). */
export interface CatalogItem {
  id: string;
  name: string;
  price: number;
  cat: string;
  /** URL pública de la foto (Storage o externa). `null` si no hay imagen,
   *  en ese caso el storefront pinta el ícono SVG de la categoría. */
  img: string | null;
  /** Texto opcional para el card del menú del cliente. `null` si vacío. */
  description: string | null;
}

export interface CatalogCategory {
  cat: string;
  items: CatalogItem[];
}

export interface Catalog {
  categories: CatalogCategory[];
}

export interface CheckoutZone {
  id: string;
  name: string;
  tarifa: number;
  recargo: number;
}

export interface CheckoutOrder {
  orderId: string;
  phone: string;
  expiresAt: string;
  cart: Cart;
  /**
   * Datos de entrega ya guardados. `null` en una orden borrador recién creada
   * sin dirección aún (es lo normal al abrir el link por primera vez).
   */
  delivery: DeliveryInfo | null;
  /**
   * Datos del cliente conocidos (prefill si es recurrente). `null` si no hay
   * cliente vinculado todavía.
   */
  customer: CustomerInfo | null;
  /**
   * Motivo del último intento de pago rechazado por Wompi. Cuando el webhook
   * recibe DECLINED/ERROR/VOIDED vuelve la orden a `borrador` y guarda este
   * mensaje. El frontend lo usa para mostrar contexto al cliente y ofrecerle
   * reintentar con otra tarjeta/método. `null` si nunca hubo intento o si el
   * último fue exitoso (en cuyo caso la orden ya no estaría en borrador).
   */
  wompiStatusMessage?: string | null;
  /**
   * Postre de regalo disponible para este cliente (cupón otorgado y vigente por
   * dejar una reseña). `null` si no tiene. La tienda muestra un aviso cuando
   * está presente.
   */
  gift?: { name: string } | null;
}

/** GET 200 — carrito válido y editable. */
export interface CheckoutValid {
  ok: true;
  status: 'valida';
  order: CheckoutOrder;
  catalog: Catalog;
  zones: CheckoutZone[];
  /** Estado de operación: si es `false`, la tienda muestra "cerrado" y bloquea el pago. */
  businessOpen?: boolean;
  /** Próxima apertura (ej. "mañana a las 11:00 a. m."). Útil cuando businessOpen es false. */
  opensLabel?: string | null;
}

/** Estados de la orden post-borrador (los del kanban admin). */
export type OrderPipelineStatus =
  | 'nuevo'
  | 'pagado'
  | 'cocina'
  | 'empacado'
  | 'ruta'
  | 'entregado';

/**
 * Info mínima que devuelve el GET cuando el carrito ya no es editable porque
 * la orden está en el pipeline (pagado/cocina/ruta/entregado). La pantalla
 * post-pago la usa para mostrar el progress real del pedido y un número
 * legible.
 */
export interface CheckoutOrderInPipeline {
  orderId: string;
  /** `pagado` | `cocina` | `ruta` | `entregado` | ... */
  orderStatus: OrderPipelineStatus | string;
  /** Numero correlativo (#1234) o null si no fue asignado todavía. */
  orderNumber: number | null;
}

/** GET 200 — link no utilizable; la web muestra la pantalla correspondiente. */
export interface CheckoutUnusable {
  ok: true;
  status: CheckoutUnusableStatus;
  /** Presente solo cuando `status === 'ya_usada'` (el pedido entró al kanban). */
  order?: CheckoutOrderInPipeline;
}

export type CheckoutGetResponse = CheckoutValid | CheckoutUnusable;

// ---- PUT /cart ----

export interface UpdateCartItem {
  productId: string;
  qty: number;
}

export interface UpdateCartDelivery {
  address?: string;
  zoneId?: string;
  lat?: number;
  lng?: number;
}

export interface UpdateCartBody {
  items: UpdateCartItem[];
  delivery?: UpdateCartDelivery;
  /** Propina: tipPercent (10) lo calcula el server sobre el subtotal; o tip = monto custom. */
  tipPercent?: number;
  tip?: number;
}

export interface UpdateCartResponse {
  ok: true;
  cart: Cart;
  delivery: DeliveryInfo;
}

// ---- POST /pay ----

export interface PayBody {
  customer: { name: string; email?: string };
  paymentMethod?: string;
  note?: string;
}

/**
 * Datos para iniciar el Widget oficial de Wompi (`checkout.wompi.co/widget.js`).
 * Los devuelve el backend cuando `WOMPI_MODE=real`. El backend YA generó la
 * `signature:integrity` server-side, así que el frontend sólo se la pasa al
 * Widget tal cual.
 */
export interface WompiWidgetConfig {
  publicKey: string;
  currency: 'COP';
  amountInCents: number;
  reference: string;
  signature: string;
  /** URL a la que Wompi vuelve después del pago (PSE/Bancolombia redirect). */
  redirectUrl: string;
  customerData?: {
    email?: string;
    fullName?: string;
    phoneNumber?: string;
    phoneNumberPrefix?: string;
  };
}

/**
 * Respuesta del POST /pay. La forma depende de `WOMPI_MODE` del backend:
 *  - `mock` legacy: `paymentLink: string` con la URL del mock; `widgetConfig: null`.
 *  - `real`:        `paymentLink: null`; `widgetConfig` con todo para el Widget.
 *
 * El frontend chequea `widgetConfig` primero y cae a `paymentLink` si es null.
 */
export interface PayResponse {
  ok: true;
  total: number;
  paymentLink: string | null;
  widgetConfig: WompiWidgetConfig | null;
}

// ---------------------------------------------------------------------------
// Errores
// ---------------------------------------------------------------------------

/**
 * Error de cualquier llamada de checkout. Si el server respondió `ok:false`
 * con un `status` (`expirada` | `ya_usada`), lo exponemos en `.status` para
 * que la UI cambie a la pantalla de carrito vencido. `missing`/`unavailable`
 * vienen de las validaciones 400/409 del contrato.
 */
export class CheckoutError extends Error {
  httpStatus: number;
  status?: CheckoutUnusableStatus;
  missing?: string[];
  unavailable?: string[];
  body: unknown;

  constructor(
    httpStatus: number,
    message: string,
    opts: {
      status?: CheckoutUnusableStatus;
      missing?: string[];
      unavailable?: string[];
      body?: unknown;
    } = {},
  ) {
    super(message);
    this.name = 'CheckoutError';
    this.httpStatus = httpStatus;
    this.status = opts.status;
    this.missing = opts.missing;
    this.unavailable = opts.unavailable;
    this.body = opts.body;
  }
}

/** True si el error indica que el carrito dejó de ser editable. */
export function isUnusableError(err: unknown): err is CheckoutError {
  return err instanceof CheckoutError && err.status != null;
}

/**
 * Si el error es un 409 "cerrado" (fuera de horario / pausa manual), devuelve
 * la info para avisar al cliente; si no, null. A diferencia de `isUnusableError`
 * (que vence el carrito), acá el carrito sigue vivo: solo no se puede pagar ahora.
 */
export function closedError(err: unknown): { opensLabel: string | null; paused: boolean } | null {
  if (err instanceof CheckoutError) {
    const b = (err.body ?? {}) as Record<string, unknown>;
    if (b.status === 'cerrado') {
      return { opensLabel: (b.opensLabel as string | null) ?? null, paused: b.paused === true };
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Transporte
// ---------------------------------------------------------------------------

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...init?.headers,
    },
  });

  const body: unknown = await res.json().catch(() => null);
  const b = (body ?? {}) as Record<string, unknown>;

  if (!res.ok || b.ok === false) {
    throw new CheckoutError(res.status, (b.error as string) ?? `HTTP ${res.status}`, {
      status: b.status as CheckoutUnusableStatus | undefined,
      missing: b.missing as string[] | undefined,
      unavailable: b.unavailable as string[] | undefined,
      body,
    });
  }

  return body as T;
}

// ---------------------------------------------------------------------------
// Endpoints
// ---------------------------------------------------------------------------

/** GET /api/checkout/:orderId?userId=<phone>. Siempre 200 con status discriminado. */
export function getCheckout(orderId: string, userId: string): Promise<CheckoutGetResponse> {
  const qs = new URLSearchParams({ userId }).toString();
  return requestJson<CheckoutGetResponse>(`/api/checkout/${encodeURIComponent(orderId)}?${qs}`);
}

// ---------------------------------------------------------------------------
// Promotions (público)
// ---------------------------------------------------------------------------

/**
 * Promoción activa devuelta por `/api/promotions/active`. Los productos
 * elegibles vienen hidratados para que el storefront los renderice en el
 * `<PromoActiveCard>` sin un round-trip extra.
 */
export interface ActivePromotion {
  id: string;
  kind: 'product' | 'weekday';
  name: string;
  description: string | null;
  discount_type: 'percent' | 'fixed' | 'free_item' | 'two_for_one';
  discount_value: number;
  min_subtotal: number;
  config: {
    product_ids?: string[];
    weekdays?: number[];
    starts_hhmm?: string;
    ends_hhmm?: string;
  };
  starts_at: string | null;
  ends_at: string | null;
  /** Productos elegibles ya hidratados (solo los `available`). */
  products: Array<{
    id: string;
    name: string;
    price: number;
    cat: string;
    img: string | null;
    description: string | null;
  }>;
}

export function fetchActivePromotions(): Promise<{ ok: true; promotions: ActivePromotion[] }> {
  return requestJson<{ ok: true; promotions: ActivePromotion[] }>('/api/promotions/active');
}

/** PUT /api/checkout/:orderId/cart. Reemplaza el carrito completo y recalcula totales. */
export function updateCart(orderId: string, body: UpdateCartBody): Promise<UpdateCartResponse> {
  return requestJson<UpdateCartResponse>(`/api/checkout/${encodeURIComponent(orderId)}/cart`, {
    method: 'PUT',
    body: JSON.stringify(body),
  });
}

/** POST /api/checkout/:orderId/pay. Devuelve el link de pago para el total actual. */
export function pay(orderId: string, body: PayBody): Promise<PayResponse> {
  return requestJson<PayResponse>(`/api/checkout/${encodeURIComponent(orderId)}/pay`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}
