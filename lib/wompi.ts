/**
 * Wrapper del Widget oficial de Wompi (`checkout.wompi.co/widget.js`).
 *
 * Doc: https://docs.wompi.co/docs/colombia/widget-checkout-web/
 *
 * Carga el script de forma diferida (solo cuando el cliente pulsa "Pagar") y
 * expone una API tipada para abrir el modal con el `widgetConfig` que devuelve
 * nuestro backend (POST /api/checkout/:orderId/pay con WOMPI_MODE=real).
 *
 * El backend YA firmó el `signature:integrity` server-side, así que acá solo
 * lo reempaquetamos en la forma que espera el SDK (`signature: { integrity }`).
 */

import type { WompiWidgetConfig } from './checkout';

export const WOMPI_WIDGET_SRC = 'https://checkout.wompi.co/widget.js';

/** Base del Web Checkout — misma URL para sandbox y producción. La key define el ambiente. */
export const WOMPI_WEB_CHECKOUT_BASE = 'https://checkout.wompi.co/p/';

// --- Tipos del SDK (declaración mínima del global que el script inyecta) ---

export interface WompiTransactionResult {
  transaction?: {
    id: string;
    status?: string;
    amount_in_cents?: number;
    reference?: string;
  };
}

interface WompiWidgetCheckoutInstance {
  open(callback: (result: WompiTransactionResult) => void): void;
}

interface WompiWidgetCheckoutCtor {
  new (config: Record<string, unknown>): WompiWidgetCheckoutInstance;
}

declare global {
  interface Window {
    WidgetCheckout?: WompiWidgetCheckoutCtor;
  }
}

// --- Loader idempotente del script ---

let loaderPromise: Promise<WompiWidgetCheckoutCtor> | null = null;

/** SOLO para tests: limpia el cache del loader. */
export function __resetWompiLoaderForTests(): void {
  loaderPromise = null;
}

/**
 * Carga el script del Widget si no está cargado. Idempotente: llamadas
 * concurrentes comparten la misma Promise.
 *
 * Resuelve con el constructor `WidgetCheckout` global.
 */
export function loadWompiWidget(): Promise<WompiWidgetCheckoutCtor> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('Wompi Widget requiere un navegador'));
  }
  if (window.WidgetCheckout) {
    return Promise.resolve(window.WidgetCheckout);
  }
  if (loaderPromise) return loaderPromise;

  loaderPromise = new Promise<WompiWidgetCheckoutCtor>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      `script[src="${WOMPI_WIDGET_SRC}"]`,
    );
    const script = existing ?? document.createElement('script');
    if (!existing) {
      script.src = WOMPI_WIDGET_SRC;
      script.async = true;
      document.head.appendChild(script);
    }
    // Usamos onload/onerror directos (no addEventListener) para que sean
    // disparables desde tests con `script.onload?.(new Event('load'))`.
    script.onload = () => {
      if (window.WidgetCheckout) resolve(window.WidgetCheckout);
      else reject(new Error('Widget de Wompi cargado pero WidgetCheckout no está disponible'));
    };
    script.onerror = () => {
      // Reset para permitir reintento en una llamada posterior.
      loaderPromise = null;
      reject(new Error('No se pudo cargar el script del Widget de Wompi'));
    };
  });
  return loaderPromise;
}

// --- API pública: abrir el checkout ---

/**
 * Carga el script (si hace falta), instancia el Widget con el `widgetConfig`
 * que devolvió el backend, y lo abre. El `onResult` se llama cuando el cliente
 * cierra el modal: `result.transaction.id` está disponible pero el estado real
 * del pago viene por el webhook server-side (NO confiar sólo en este callback).
 *
 * Mapea el `signature` (string del backend) al shape que espera el SDK:
 *   { signature: { integrity: '<sha256-hex>' } }
 */
export async function openWompiCheckout(
  config: WompiWidgetConfig,
  onResult: (result: WompiTransactionResult) => void,
): Promise<void> {
  const Ctor = await loadWompiWidget();
  const instance = new Ctor({
    publicKey: config.publicKey,
    currency: config.currency,
    amountInCents: config.amountInCents,
    reference: config.reference,
    signature: { integrity: config.signature },
    redirectUrl: config.redirectUrl,
    ...(config.customerData ? { customerData: config.customerData } : {}),
  });
  instance.open(onResult);
}

// --- Web Checkout (alternativa por redirect, sin script) ---

/**
 * Arma la URL del **Web Checkout** de Wompi (modo redirect, sin script JS).
 *
 *   https://checkout.wompi.co/p/?public-key=...&currency=COP&amount-in-cents=...
 *     &reference=...&signature:integrity=...&redirect-url=...&customer-data:email=...
 *
 * El cliente sale del sitio y vuelve a `redirect-url?id=<txn_id>`. El estado
 * real del pago lo confirma el webhook server-side (igual que en el Widget) —
 * el `id` del redirect es solo informativo.
 *
 * Usa el mismo `widgetConfig` firmado por el backend (el algoritmo de
 * `signature:integrity` es idéntico al del Widget).
 */
export function buildWompiCheckoutUrl(config: WompiWidgetConfig): string {
  const params = new URLSearchParams();
  params.set('public-key', config.publicKey);
  params.set('currency', config.currency);
  params.set('amount-in-cents', String(config.amountInCents));
  params.set('reference', config.reference);
  // Wompi acepta `signature:integrity` con `:` literal o url-encoded. Usamos
  // URLSearchParams para garantizar el escape correcto de cada valor.
  params.set('signature:integrity', config.signature);
  if (config.redirectUrl) params.set('redirect-url', config.redirectUrl);
  if (config.customerData?.email) params.set('customer-data:email', config.customerData.email);
  if (config.customerData?.fullName) params.set('customer-data:full-name', config.customerData.fullName);
  if (config.customerData?.phoneNumber) params.set('customer-data:phone-number', config.customerData.phoneNumber);
  if (config.customerData?.phoneNumberPrefix) {
    params.set('customer-data:phone-number-prefix', config.customerData.phoneNumberPrefix);
  }
  return `${WOMPI_WEB_CHECKOUT_BASE}?${params.toString()}`;
}
