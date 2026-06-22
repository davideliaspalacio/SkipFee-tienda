'use client';

import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Icon } from '@/lib/icons';
import { FoodIcon, pickFoodIcon, pickCategoryTheme } from '@/lib/foodIcons';
import { COP } from '@/lib/data';
import {
  updateCart,
  pay,
  isUnusableError,
  closedError,
  fetchActivePromotions,
  type CheckoutValid,
  type Cart,
  type CatalogItem,
  type CheckoutUnusableStatus,
  type CheckoutZone,
  type DeliveryInfo,
  type CustomerInfo,
  type UpdateCartBody,
  type ActivePromotion,
} from '@/lib/checkout';
import { openWompiCheckout, buildWompiCheckoutUrl } from '@/lib/wompi';
import styles from './storefront.module.css';

/**
 * Modo de checkout de Wompi:
 *   - `widget` (default): modal JS encima de la tienda
 *   - `redirect`: redirige al Web Checkout de Wompi (https://checkout.wompi.co/p/)
 * Configurable por env var `NEXT_PUBLIC_WOMPI_CHECKOUT_MODE` (build-time).
 */
const WOMPI_CHECKOUT_MODE: 'widget' | 'redirect' =
  (process.env.NEXT_PUBLIC_WOMPI_CHECKOUT_MODE as 'widget' | 'redirect' | undefined) === 'redirect'
    ? 'redirect'
    : 'widget';

interface OrderBuilderProps {
  data: CheckoutValid;
  /** Se llama si una mutación devuelve 409 (carrito vencido / ya usado). */
  onUnusable: (status: CheckoutUnusableStatus) => void;
}

const EMPTY_CART: Cart = {
  items: [],
  subtotal: 0,
  discount: 0,
  delivery: 0,
  peakSurcharge: 0,
  tip: 0,
  tipPercent: null,
  total: 0,
  appliedPromo: null,
};

/**
 * Flujo de pedido público. El catálogo es server-authoritative: cada cambio
 * llama `PUT /cart` y los totales mostrados son los que devuelve el backend.
 *
 * Lado cliente Skipfee: header sticky con logo, chips de categoría con
 * scroll-spy, promos arriba, tarjetas redondeadas con thumbnail ilustrado,
 * panel del pedido fijo en desktop y bottom-sheet en móvil. El paso de
 * entrega/datos del cliente se hace en otra pantalla — acá sólo se arma el
 * carrito y se inicia el pago (Wompi).
 */
export function OrderBuilder({ data, onUnusable }: OrderBuilderProps) {
  const orderId = data.order.orderId;
  const categories = data.catalog.categories;

  // Cantidades por producto (estado optimista de la edición).
  const [lines, setLines] = useState<Record<string, number>>(() => {
    const init: Record<string, number> = {};
    // El postre de regalo (gift) se inyecta aparte como línea $0 no editable:
    // NO debe entrar en las cantidades editables ni reenviarse al guardar (si no,
    // el server lo marca "no disponible" y rechaza el carrito).
    for (const it of data.order.cart.items) {
      if (it.gift) continue;
      init[it.productId] = it.qty;
    }
    return init;
  });

  // Carrito + totales tal como los devolvió el server (fuente de verdad de precios).
  const [cart, setCart] = useState<Cart>(() => data.order.cart ?? EMPTY_CART);

  // Ref al carrito actual para que `sync` lo lea SIN entrar en sus dependencias.
  // Antes `cart.tip`/`cart.tipPercent` estaban en las deps de `sync`: cada respuesta
  // del server recreaba `sync` → `setQty`/`onTip` → props nuevas en ProductCard/
  // OrderPanel → re-render en cascada de toda la tienda. Con el ref, `sync` es estable.
  const cartRef = useRef(cart);
  useEffect(() => {
    cartRef.current = cart;
  }, [cart]);

  // Mismo patrón para `lines`: que setQty/onTip/handlePay lean la cantidad actual
  // SIN tener `lines` en sus deps (si no, se recrean en cada edición y propagan
  // callbacks nuevos a cada ProductCard, anulando el React.memo de los hijos).
  const linesRef = useRef(lines);
  useEffect(() => {
    linesRef.current = lines;
  }, [lines]);

  // Datos read-only que vinieron del bot (la dirección/zona/nombre/email se
  // capturan por WhatsApp antes de mandar el link). Si falta algo, NO debería
  // haber llegado acá — el OrderPanel muestra fallback amable en ese caso.
  const delivery = data.order.delivery;
  const customer = data.order.customer;
  const zone = useMemo(
    () => data.zones.find(z => z.id === delivery?.zoneId) ?? null,
    [data.zones, delivery?.zoneId],
  );
  const hasDeliveryData = !!(delivery?.address && delivery?.zoneId && customer?.name);

  const prefilledCustomerName = customer?.name ?? null;
  const prefilledCustomerEmail = customer?.email ?? null;

  const [syncing, setSyncing] = useState(false);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeCat, setActiveCat] = useState<string>(categories[0]?.cat ?? '');
  const [sheetOpen, setSheetOpen] = useState(false);

  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});
  // Espeja activeCat para que el scroll-spy evite setActiveCat redundantes
  // (cada setState repinta el árbol mientras el cat no haya cambiado de verdad).
  const activeCatRef = useRef(activeCat);
  const isClicking = useRef(false);

  // Lock del total mientras se paga. La propina se aplica de forma optimista y
  // se persiste en `order.total` en segundo plano (silent + debounce de 350ms).
  // El Widget de Wompi se firma con `order.total`, así que una vez iniciado el
  // pago NO debe cambiar más: si un debounce tardío mutara order.total después
  // de firmar, el webhook vería `amount_in_cents != order.total*100` y
  // rechazaría el pago ("monto no coincide"). Ver handlePay y onTip.
  const totalLockedRef = useRef(false);

  // Promociones activas (compartido entre PromosActiveSection arriba, las
  // mini-cards de OrderPanel y los badges en cada ProductCard del catálogo).
  // React Query dedupa por la misma key → una sola request HTTP.
  const { data: promosData } = useQuery({
    queryKey: ['promotions', 'active'],
    queryFn: () => fetchActivePromotions(),
    refetchInterval: 60_000,
  });
  // Map productId → mejor promo aplicable (la que más descuento previsible da
  // para ese producto). Usado para pintar el badge "−20%" en el ProductCard.
  // El backend ya filtra por día/hora en /api/promotions/active — acá solo
  // construimos el índice por producto.
  const promoByProductId = useMemo(() => {
    const map = new Map<string, ActivePromotion>();
    for (const promo of promosData?.promotions ?? []) {
      for (const pid of promo.config.product_ids ?? []) {
        const current = map.get(pid);
        if (!current || rankPromo(promo) > rankPromo(current)) {
          map.set(pid, promo);
        }
      }
    }
    return map;
  }, [promosData]);

  const sync = useCallback(
    async (
      nextLines: Record<string, number>,
      tipBody?: { tipPercent?: number; tip?: number },
      opts?: { silent?: boolean },
    ) => {
      // `silent`: no togglear el loading global ("actualizando…" / botones disabled).
      // Lo usa la propina, que ya actualiza el total de forma optimista y solo
      // necesita persistir en segundo plano sin bloquear la UI.
      const silent = opts?.silent ?? false;
      const items = Object.entries(nextLines)
        .filter(([, qty]) => qty > 0)
        .map(([productId, qty]) => ({ productId, qty }));

      // Propina: si el caller la cambia, la mandamos explícita; si no (p. ej. al
      // editar productos), re-enviamos la actual para PRESERVARLA — y si era 10%,
      // el server la recalcula sobre el nuevo subtotal.
      const tipPart: { tipPercent?: number; tip?: number } =
        tipBody ??
        (cartRef.current.tipPercent && cartRef.current.tipPercent > 0
          ? { tipPercent: cartRef.current.tipPercent }
          : cartRef.current.tip > 0
            ? { tip: cartRef.current.tip }
            : { tip: 0 });
      const body: UpdateCartBody = { items, ...tipPart };

      if (!silent) setSyncing(true);
      setError(null);
      try {
        const res = await updateCart(orderId, body);
        setCart(res.cart);
        // Devolvemos el carrito ya persistido para que el caller (handlePay)
        // pueda firmar el pago contra el total real de la BD, no el optimista.
        return res.cart;
      } catch (err) {
        if (isUnusableError(err)) {
          onUnusable(err.status as CheckoutUnusableStatus);
          return null;
        }
        setError(err instanceof Error ? err.message : 'No se pudo actualizar el carrito');
        return null;
      } finally {
        if (!silent) setSyncing(false);
      }
    },
    [orderId, onUnusable],
  );

  const setQty = useCallback(
    (productId: string, qty: number) => {
      const next = { ...linesRef.current };
      if (qty <= 0) delete next[productId];
      else next[productId] = Math.min(qty, 99);
      setLines(next);
      void sync(next);
    },
    [sync],
  );

  // Handlers estables por-id: identidad fija entre renders (deps [setQty], que ya
  // es estable). Así cada ProductCard/PromoActiveCard memoizado se re-renderiza
  // SOLO cuando cambia su propia cantidad, no en cada edición de cualquier producto.
  const addProduct = useCallback((productId: string) => setQty(productId, 1), [setQty]);
  const incProduct = useCallback(
    (productId: string) => setQty(productId, (linesRef.current[productId] ?? 0) + 1),
    [setQty],
  );
  const decProduct = useCallback(
    (productId: string) => setQty(productId, (linesRef.current[productId] ?? 0) - 1),
    [setQty],
  );

  // Propina: el OrderPanel decide el modo (10% / custom / none) y nos pasa el body.
  // Aplicamos el total de forma OPTIMISTA (instantánea) y dejamos el PUT solo para
  // PERSISTIR en segundo plano: el cálculo de propina es trivial y determinista
  // (mismo redondeo que el backend), así que el total local coincide con el que
  // devuelve el server y no hay que esperar el round-trip para verlo actualizado.
  const onTip = useCallback(
    (tipBody: { tipPercent?: number; tip?: number }) => {
      // Pago en curso: el total está congelado (el Widget ya se firmó o está por
      // firmarse). Ignoramos cambios de propina diferidos (p. ej. un debounce del
      // input custom que se dispara tarde) para no descuadrar el monto firmado
      // contra order.total. Ver `totalLockedRef`.
      if (totalLockedRef.current) return;
      setCart((prev) => {
        const base = prev.total - prev.tip; // total sin propina (subtotal − desc + envío + recargo)
        const newTip =
          tipBody.tipPercent && tipBody.tipPercent > 0
            ? Math.round((prev.subtotal * tipBody.tipPercent) / 100)
            : (tipBody.tip ?? 0);
        const newTipPercent =
          tipBody.tipPercent && tipBody.tipPercent > 0 ? tipBody.tipPercent : null;
        return { ...prev, tip: newTip, tipPercent: newTipPercent, total: base + newTip };
      });
      void sync(linesRef.current, tipBody, { silent: true }); // persiste en segundo plano; reconcilia al responder
    },
    [sync],
  );

  // Scroll-spy: pinta el chip activo a medida que las secciones cruzan el top.
  // jsdom no implementa IntersectionObserver, así que en tests se queda
  // simplemente con la primera categoría seleccionada.
  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (isClicking.current) return;
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        const top = visible[0];
        if (top) {
          const cat = (top.target as HTMLElement).dataset.cat;
          if (cat && cat !== activeCatRef.current) {
            activeCatRef.current = cat;
            setActiveCat(cat);
          }
        }
      },
      { rootMargin: '-140px 0px -55% 0px', threshold: 0 },
    );
    Object.values(sectionRefs.current).forEach((el) => el && obs.observe(el));
    return () => obs.disconnect();
  }, [categories]);

  const scrollToCat = useCallback((cat: string) => {
    const el = sectionRefs.current[cat];
    if (!el) return;
    isClicking.current = true;
    activeCatRef.current = cat;
    setActiveCat(cat);
    const y = el.getBoundingClientRect().top + window.scrollY - 124;
    window.scrollTo({ top: y, behavior: 'smooth' });
    setTimeout(() => {
      isClicking.current = false;
    }, 700);
  }, []);

  const itemCount = cart.items.reduce((acc, it) => acc + it.qty, 0);
  const businessOpen = data.businessOpen !== false;
  const opensLabel = data.opensLabel ?? null;
  const canPay = cart.items.length > 0 && hasDeliveryData && !paying && businessOpen;

  const handlePay = useCallback(async () => {
    if (cartRef.current.items.length === 0 || !businessOpen) return;
    setPaying(true);
    setError(null);
    // Congelar el total: a partir de acá ignoramos cambios de propina diferidos
    // (el debounce del input custom puede dispararse hasta 350ms después) para
    // que NO muten order.total luego de que el Widget ya quedó firmado con él.
    totalLockedRef.current = true;
    try {
      // Flush de la propina ANTES de firmar el pago. La propina se aplica
      // optimista y se persiste en segundo plano (silent + debounce); el Widget
      // se firma con order.total de la BD. Sin esperar este PUT, pay() firmaría
      // el total viejo (sin propina) y el webhook lo rechazaría con "monto no
      // coincide". Re-enviamos el carrito con la propina actual y esperamos.
      const flushed = await sync(linesRef.current, undefined, { silent: true });
      if (!flushed) {
        // sync ya mostró el error (o disparó onUnusable y navegó fuera).
        totalLockedRef.current = false;
        setPaying(false);
        return;
      }

      // El nombre real se confirma en el paso siguiente; mandamos prefill si
      // existe o un placeholder para no romper el contrato del backend
      // (`customer.name` es required).
      const customerName = prefilledCustomerName?.trim() || 'Cliente';
      const res = await pay(orderId, {
        customer: {
          name: customerName,
          ...(prefilledCustomerEmail ? { email: prefilledCustomerEmail } : {}),
        },
      });

      // Validación dura: el monto que el backend firmó para Wompi DEBE coincidir
      // con el total que el cliente está viendo/aceptando (ya persistido arriba).
      // Si no coincide, abortamos antes de abrir el Widget — pagar un monto
      // distinto solo haría que el webhook rechace el pago y trabe la orden.
      const signedCents = res.widgetConfig?.amountInCents ?? res.total * 100;
      if (signedCents !== flushed.total * 100) {
        console.warn('[checkout] monto firmado != total esperado, abortando pago', {
          orderId,
          signedCents,
          expectedCents: flushed.total * 100,
        });
        totalLockedRef.current = false;
        setError('No pudimos confirmar el total del pago. Recargá la página e intentá de nuevo.');
        setPaying(false);
        return;
      }

      if (res.widgetConfig) {
        if (WOMPI_CHECKOUT_MODE === 'redirect') {
          // Web Checkout: redirige a checkout.wompi.co/p/?... — el cliente sale
          // del sitio y vuelve por `redirectUrl?id=<txn_id>`. El estado real
          // del pago lo confirma el webhook server-side.
          window.location.assign(buildWompiCheckoutUrl(res.widgetConfig));
          return;
        }

        // Widget JS (default): modal sobre la página actual.
        await openWompiCheckout(res.widgetConfig, (result) => {
          // Wompi llama este callback solo cuando hubo una transacción (success
          // o decline). Si el cliente cierra el modal sin pagar, NO se llama —
          // por eso reseteamos `paying` apenas el modal abre (abajo).
          if (result?.transaction?.id) {
            window.location.assign(`/pedir/pago/resultado?orderId=${encodeURIComponent(orderId)}`);
          }
        });
        // Modal abierto: rehabilitamos el botón. Si el cliente cierra el modal
        // sin completar el pago, puede tocar "Continuar" otra vez para reabrirlo.
        setPaying(false);
        return;
      }

      if (res.paymentLink) {
        window.location.assign(res.paymentLink);
        return;
      }

      throw new Error('Respuesta de pago inválida (sin widgetConfig ni paymentLink)');
    } catch (err) {
      const closed = closedError(err);
      if (closed) {
        totalLockedRef.current = false;
        setError(
          closed.paused
            ? 'Pausamos los pedidos un momento, probá en un rato 🙏'
            : `Estamos cerrados${closed.opensLabel ? `. Abrimos ${closed.opensLabel}` : ''}.`,
        );
        setPaying(false);
        return;
      }
      if (isUnusableError(err)) {
        onUnusable(err.status as CheckoutUnusableStatus);
        return;
      }
      totalLockedRef.current = false;
      setError(err instanceof Error ? err.message : 'No se pudo iniciar el pago');
      setPaying(false);
    }
  }, [orderId, prefilledCustomerName, prefilledCustomerEmail, onUnusable, businessOpen, sync]);

  const rejectionMessage = data.order.wompiStatusMessage ?? null;

  return (
    <div className={styles.store}>
      <header className={styles.header}>
        <div className={styles.brand}>
          <div className={styles.brandMark}>S</div>
          <span className={styles.brandName}>
            Skip<span>fee</span>
          </span>
        </div>
        <button
          type="button"
          className={styles.cartPill}
          onClick={() => setSheetOpen(true)}
          aria-label="Ver pedido"
        >
          <Icon.ShoppingBag size={17} />
          <span>
            {itemCount} {itemCount === 1 ? 'producto' : 'productos'}
          </span>
          {itemCount > 0 && <span className={styles.cartPillTotal}>{COP(cart.total)}</span>}
        </button>
      </header>

      <nav className={styles.catnav} aria-label="Categorías">
        {categories.map((c) => {
          const theme = pickCategoryTheme(c.cat);
          const Ico = FoodIcon[pickFoodIcon(c.cat)];
          const isActive = activeCat === c.cat;
          return (
            <button
              key={c.cat}
              type="button"
              className={`${styles.catnavChip}${isActive ? ` ${styles.active}` : ''}`}
              style={isActive ? ({ ['--chip' as 'color']: theme.color } as React.CSSProperties) : undefined}
              onClick={() => scrollToCat(c.cat)}
            >
              <Ico size={15} />
              {c.cat}
            </button>
          );
        })}
      </nav>

      {rejectionMessage && (
        <div className={`${styles.banner} ${styles.bannerWarn}`} role="alert">
          <Icon.AlertCircle size={16} />
          <span>
            <strong>Tu último pago fue rechazado.</strong> Wompi nos respondió:{' '}
            <em>{rejectionMessage}</em>. Tu carrito está intacto — probá con otra tarjeta o método.
          </span>
        </div>
      )}

      <div className={styles.body}>
        <main className={styles.main}>
          <PromosActiveSection
            lines={lines}
            onAdd={addProduct}
            onInc={incProduct}
            onDec={decProduct}
          />
          {categories.map((c) => {
            const theme = pickCategoryTheme(c.cat);
            return (
              <section
                key={c.cat}
                data-cat={c.cat}
                ref={(el) => {
                  sectionRefs.current[c.cat] = el;
                }}
                className={styles.catSection}
              >
                <div
                  className={styles.catSectionHead}
                  style={{ ['--accent' as 'color']: theme.color } as React.CSSProperties}
                >
                  <h2>{c.cat}</h2>
                  <span>
                    {c.items.length} {c.items.length === 1 ? 'opción' : 'opciones'}
                  </span>
                </div>
                <div className={styles.productGrid}>
                  {c.items.map((p) => (
                    <ProductCard
                      key={p.id}
                      product={p}
                      qty={lines[p.id] ?? 0}
                      promo={promoByProductId.get(p.id)}
                      onAdd={addProduct}
                      onInc={incProduct}
                      onDec={decProduct}
                    />
                  ))}
                </div>
              </section>
            );
          })}
          <footer className={styles.storeFooter}>
            Hecho con 💛 en Skipfee · Pedidos por WhatsApp y en línea
          </footer>
        </main>

        <aside className={styles.aside}>
          <OrderPanel
            cart={cart}
            delivery={delivery}
            customer={customer}
            zone={zone}
            hasDeliveryData={hasDeliveryData}
            error={error}
            paying={paying}
            canPay={canPay}
            syncing={syncing}
            closed={!businessOpen}
            opensLabel={opensLabel}
            onPay={handlePay}
            onTip={onTip}
          />
        </aside>
      </div>

      {itemCount > 0 && (
        <button
          type="button"
          className={styles.mobileBar}
          onClick={() => setSheetOpen(true)}
        >
          <span className={styles.mobileBarCount}>{itemCount}</span>
          <span>Ver pedido</span>
          <span className={styles.mobileBarTotal}>{COP(cart.total)}</span>
        </button>
      )}

      {sheetOpen && (
        <div className={styles.sheetBackdrop} onClick={() => setSheetOpen(false)}>
          <div className={styles.sheet} onClick={(e) => e.stopPropagation()}>
            <div className={styles.sheetHandle} />
            <button
              type="button"
              className={styles.sheetClose}
              onClick={() => setSheetOpen(false)}
              aria-label="Cerrar"
            >
              <Icon.X size={18} />
            </button>
            <OrderPanel
              cart={cart}
              delivery={delivery}
              customer={customer}
              zone={zone}
              hasDeliveryData={hasDeliveryData}
              error={error}
              paying={paying}
              canPay={canPay}
              syncing={syncing}
              closed={!businessOpen}
              opensLabel={opensLabel}
              onPay={handlePay}
              onTip={onTip}
            />
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------- Thumbnail ---------- */

const Thumb = memo(function Thumb({ product }: { product: CatalogItem }) {
  const theme = pickCategoryTheme(product.cat);
  // Si el producto tiene foto, la mostramos a sangre. El placeholder con
  // ícono+grid solo aparece cuando img viene null (catálogo recién creado
  // o producto sin foto cargada todavía).
  if (product.img) {
    return (
      <div className={`${styles.thumb} ${styles.thumbImg}`} style={{ background: theme.tint }}>
        <img src={product.img} alt={product.name} loading="lazy" />
      </div>
    );
  }
  const Ico = FoodIcon[pickFoodIcon(product.cat)];
  return (
    <div className={styles.thumb} style={{ background: theme.tint, color: theme.color }}>
      <div className={styles.thumbGrid} />
      <Ico size={58} />
    </div>
  );
});

/* ---------- Product card ---------- */

interface ProductCardProps {
  product: CatalogItem;
  qty: number;
  promo?: ActivePromotion;
  onAdd: (productId: string) => void;
  onInc: (productId: string) => void;
  onDec: (productId: string) => void;
}

const ProductCard = memo(function ProductCard({ product, qty, promo, onAdd, onInc, onDec }: ProductCardProps) {
  // Precio descontado por unidad (solo cuando es calculable: percent/fixed).
  // Para free_item / 2x1 el badge avisa pero el precio unitario no cambia.
  const discounted = promo ? previewDiscountedPrice(promo, product.price) : null;
  return (
    <div className={`${styles.productCard}${qty > 0 ? ` ${styles.inCart}` : ''}`}>
      <div className={styles.pcMedia}>
        <Thumb product={product} />
        {promo && (
          <span
            className={styles.pcPromoBadge}
            title={promo.name}
            aria-label={`Promoción: ${promo.name}`}
          >
            {badgeForPromo(promo)}
          </span>
        )}
      </div>
      <div className={styles.pcBody}>
        <h3 className={styles.pcName}>{product.name}</h3>
        {product.description && (
          <p className={styles.pcDesc}>{product.description}</p>
        )}
        <div className={styles.pcFoot}>
          {discounted != null && discounted < product.price ? (
            <span className={styles.pcPrices}>
              <span className={styles.pcPriceStrike}>{COP(product.price)}</span>
              <span className={`${styles.pcPrice} ${styles.pcPricePromo}`}>{COP(discounted)}</span>
            </span>
          ) : (
            <span className={styles.pcPrice}>{COP(product.price)}</span>
          )}
          {qty === 0 ? (
            <button
              type="button"
              className={styles.addBtn}
              onClick={() => onAdd(product.id)}
              aria-label={`Agregar ${product.name}`}
            >
              <Icon.Plus size={14} />
              Agregar
            </button>
          ) : (
            <div className={styles.stepper}>
              <button
                type="button"
                onClick={() => onDec(product.id)}
                aria-label={qty === 1 ? `Quitar ${product.name}` : `Restar uno a ${product.name}`}
              >
                {qty === 1 ? <Icon.X size={14} /> : <MinusGlyph />}
              </button>
              <span className={styles.stepperQty}>{qty}</span>
              <button
                type="button"
                onClick={() => onInc(product.id)}
                aria-label={`Sumar ${product.name}`}
              >
                <Icon.Plus size={14} />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

function MinusGlyph() {
  return (
    <svg
      width={14}
      height={14}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      aria-hidden="true"
    >
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

/* ---------- Promo active section ----------
 *
 * Cards interactivos arriba del catálogo. Para promos `kind=product` (y para
 * `weekday` con productos elegibles) renderizamos mini-thumbs con botón
 * "+ Agregar" / stepper para que el cliente pueda sumar el producto al
 * carrito sin tener que bajar a la sección de la categoría.
 *
 * Solo muestra las promos cuya ventana de día/hora aplica AHORA — el endpoint
 * /api/promotions/active devuelve todas las activas (filtra por starts_at /
 * ends_at), y acá filtramos por weekday + horario.
 */
interface PromosActiveSectionProps {
  lines: Record<string, number>;
  onAdd: (productId: string) => void;
  onInc: (productId: string) => void;
  onDec: (productId: string) => void;
}

const PromosActiveSection = memo(function PromosActiveSection({ lines, onAdd, onInc, onDec }: PromosActiveSectionProps) {
  const { data } = useQuery({
    queryKey: ['promotions', 'active'],
    queryFn: () => fetchActivePromotions(),
    // Refresh cada minuto: si una promo por día/hora arranca o termina,
    // se refleja sin recargar la página.
    refetchInterval: 60_000,
  });

  // El backend filtra por día/hora en /api/promotions/active; acá solo
  // mostramos lo que venga (puede ser [] si no hay nada vigente).
  const promos = data?.promotions ?? [];
  if (promos.length === 0) return null;

  return (
    <div className={styles.promosActive}>
      <div className={styles.promoLabel}>
        <Icon.Sparkles size={14} />
        Promociones activas
      </div>
      <div className={styles.promosActiveGrid}>
        {promos.map(p => (
          <PromoActiveCard
            key={p.id}
            promo={p}
            lines={lines}
            onAdd={onAdd}
            onInc={onInc}
            onDec={onDec}
          />
        ))}
      </div>
    </div>
  );
});

interface PromoActiveCardProps {
  promo: ActivePromotion;
  lines: Record<string, number>;
  onAdd: (productId: string) => void;
  onInc: (productId: string) => void;
  onDec: (productId: string) => void;
}

const PromoActiveCard = memo(function PromoActiveCard({ promo, lines, onAdd, onInc, onDec }: PromoActiveCardProps) {
  const badge = badgeForPromo(promo);
  return (
    <div className={styles.promoActiveCard}>
      <div className={styles.promoActiveHead}>
        <span className={styles.promoBadge}>{badge}</span>
        <div className={styles.promoActiveText}>
          <b>{promo.name}</b>
          {promo.description && <span>{promo.description}</span>}
        </div>
      </div>
      {promo.products.length > 0 && (
        <div className={styles.promoActiveProducts}>
          {promo.products.map(prod => {
            const qty = lines[prod.id] ?? 0;
            const discounted = previewDiscountedPrice(promo, prod.price);
            return (
              <div key={prod.id} className={styles.promoMini}>
                <div className={styles.promoMiniThumb}>
                  {prod.img ? (
                    <img src={prod.img} alt={prod.name} loading="lazy" />
                  ) : (
                    <div className={styles.promoMiniThumbEmpty}>{prod.name.charAt(0)}</div>
                  )}
                </div>
                <div className={styles.promoMiniBody}>
                  <div className={styles.promoMiniName}>{prod.name}</div>
                  <div className={styles.promoMiniPrices}>
                    {discounted != null && discounted < prod.price && (
                      <span className={styles.promoMiniStrike}>{COP(prod.price)}</span>
                    )}
                    <span className={styles.promoMiniPrice}>
                      {COP(discounted ?? prod.price)}
                    </span>
                  </div>
                  {qty === 0 ? (
                    <button
                      type="button"
                      className={styles.addBtn}
                      onClick={() => onAdd(prod.id)}
                      aria-label={`Agregar ${prod.name}`}
                    >
                      <Icon.Plus size={13} />
                      Agregar
                    </button>
                  ) : (
                    <div className={styles.stepper}>
                      <button
                        type="button"
                        onClick={() => onDec(prod.id)}
                        aria-label={qty === 1 ? `Quitar ${prod.name}` : `Restar uno a ${prod.name}`}
                      >
                        {qty === 1 ? <Icon.X size={13} /> : <MinusGlyph />}
                      </button>
                      <span className={styles.stepperQty}>{qty}</span>
                      <button
                        type="button"
                        onClick={() => onInc(prod.id)}
                        aria-label={`Sumar ${prod.name}`}
                      >
                        <Icon.Plus size={13} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
});

/** Marca corta para el badge del card de promo. */
function badgeForPromo(p: ActivePromotion): string {
  switch (p.discount_type) {
    case 'percent': return `${p.discount_value}%`;
    case 'fixed':   return `−$${Math.round(p.discount_value / 1000)}k`;
    case 'free_item':   return 'FREE';
    case 'two_for_one': return '2×1';
  }
}

/** Previsualización del precio descontado para mostrar tachado en el card.
 *  Solo aplicable a `percent` y `fixed` por unidad — para `free_item` y
 *  `two_for_one` el precio real depende de cuántas unidades el cliente sume
 *  al carrito; mostrarlo unitario sería engañoso. */
function previewDiscountedPrice(promo: ActivePromotion, unitPrice: number): number | null {
  switch (promo.discount_type) {
    case 'percent':
      return Math.floor(unitPrice * (1 - promo.discount_value / 100));
    case 'fixed':
      return Math.max(0, unitPrice - promo.discount_value);
    default:
      return null;
  }
}

/** Score relativo de una promo para elegir la "mejor" cuando varias aplican al
 *  mismo producto. No es perfecta (depende del subtotal real del carrito), pero
 *  alcanza para decidir cuál badge mostrar en el ProductCard.
 *  Heurística: percent grande > fixed grande > 2x1 > free_item. */
function rankPromo(p: ActivePromotion): number {
  switch (p.discount_type) {
    case 'percent':     return p.discount_value;                  // 1-100
    case 'fixed':       return Math.min(50, p.discount_value / 1000); // ~$50k cap
    case 'two_for_one': return 40;
    case 'free_item':   return 30;
  }
}

/* ---------- Order panel ---------- */

interface OrderPanelProps {
  cart: Cart;
  delivery: DeliveryInfo | null;
  customer: CustomerInfo | null;
  zone: CheckoutZone | null;
  hasDeliveryData: boolean;
  error: string | null;
  paying: boolean;
  canPay: boolean;
  syncing: boolean;
  closed?: boolean;
  opensLabel?: string | null;
  onPay: () => void;
  /** Cambia la propina: { tipPercent } (10%), { tip } (monto custom) o { tip: 0 } (ninguna). */
  onTip: (tipBody: { tipPercent?: number; tip?: number }) => void;
}

const OrderPanel = memo(function OrderPanel({
  cart,
  delivery,
  customer,
  zone,
  hasDeliveryData,
  error,
  paying,
  canPay,
  syncing,
  closed,
  opensLabel,
  onPay,
  onTip,
}: OrderPanelProps) {
  const empty = cart.items.length === 0;

  // Propina (10% sobre el subtotal / monto custom). El input custom vive acá.
  const [tipCustomOpen, setTipCustomOpen] = useState(false);
  const [tipCustomInput, setTipCustomInput] = useState('');

  // `onTip` cambia de identidad cuando cambia el carrito; lo guardamos en un ref
  // para que el debounce de abajo NO se re-dispare por eso (evitaría un loop de
  // re-aplicar la propina cada vez que el total cambia).
  const onTipRef = useRef(onTip);
  useEffect(() => { onTipRef.current = onTip; }, [onTip]);

  // Propina custom con DEBOUNCE: se aplica ~0.35s después de que el cliente DEJA
  // de escribir (no hace falta salir del input). Si sigue tecleando, el cleanup
  // cancela el cálculo anterior y re-arranca el contador. El total en sí se
  // actualiza optimista al instante (ver onTip), así que esto solo controla
  // cuándo se dispara ese recálculo mientras se teclea.
  useEffect(() => {
    if (!tipCustomOpen) return;
    const raw = tipCustomInput.trim();
    const t = setTimeout(() => {
      // Input vacío = sin propina → 0. (Antes hacía `return` cuando estaba vacío,
      // así que si borrabas el monto se quedaba la última propina escrita.)
      onTipRef.current({ tip: raw === '' ? 0 : Math.max(0, Math.round(Number(raw) || 0)) });
    }, 350);
    return () => clearTimeout(t);
  }, [tipCustomInput, tipCustomOpen]);

  const chooseTip = (mode: 'none' | 'percent10' | 'custom') => {
    if (mode === 'none') { setTipCustomOpen(false); onTip({ tip: 0 }); }
    else if (mode === 'percent10') { setTipCustomOpen(false); onTip({ tipPercent: 10 }); }
    else { setTipCustomOpen(true); }
  };
  // Enter aplica de inmediato (atajo); si no, el debounce lo hace solo.
  const applyCustomTip = () => {
    onTip({ tip: Math.max(0, Math.round(Number(tipCustomInput) || 0)) });
  };

  // Misma query key que <PromosActiveSection> → React Query dedupa
  // automáticamente; una sola request HTTP por carga de página.
  // El backend ya filtra por día/hora — usamos la respuesta directa.
  const { data: promosData } = useQuery({
    queryKey: ['promotions', 'active'],
    queryFn: () => fetchActivePromotions(),
    refetchInterval: 60_000,
  });
  const livePromos = promosData?.promotions ?? [];

  return (
    <div className={styles.orderPanel}>
      <div className={styles.opCard} data-testid="cart-summary">
        <h2 className={styles.opTitle}>
          <Icon.ShoppingBag size={16} />
          Tu pedido
        </h2>
        {empty ? (
          <div className={styles.opEmpty}>
            <Icon.ShoppingBag size={26} />
            <p>
              Tu carrito está vacío.
              <br />
              Agregá algo rico del menú.
            </p>
          </div>
        ) : (
          <div className={styles.opLines}>
            {cart.items.map((it) => (
              <div key={`${it.productId}${it.gift ? ':gift' : ''}`} className={styles.opLine}>
                <span className={styles.opQty}>{it.qty}×</span>
                <span className={styles.opName}>{it.gift ? `🍰 ${it.name}` : it.name}</span>
                <span className={`${styles.opAmt}${it.gift ? ` ${styles.opGift}` : ''}`}>
                  {it.gift ? 'Gratis' : COP(it.lineTotal)}
                </span>
              </div>
            ))}
            <div className={styles.opSep} />
            <div className={`${styles.opLine} ${styles.muted}`}>
              <span className={styles.opName}>Subtotal</span>
              <span className={styles.opAmt}>{COP(cart.subtotal)}</span>
            </div>
            {cart.discount > 0 && cart.appliedPromo && (
              <div className={`${styles.opLine} ${styles.opDiscount}`} data-testid="cart-discount">
                <span className={styles.opName}>
                  <Icon.Tag size={12} /> {cart.appliedPromo.name}
                </span>
                <span className={styles.opAmt}>−{COP(cart.discount)}</span>
              </div>
            )}
            {/* El domicilio (tarifa de la zona) SIEMPRE se muestra y se suma; nunca se descuenta. */}
            <div className={`${styles.opLine} ${styles.muted}`}>
              <span className={styles.opName}>Domicilio</span>
              <span className={styles.opAmt}>{COP(cart.delivery)}</span>
            </div>
            {cart.peakSurcharge > 0 && (
              <div className={`${styles.opLine} ${styles.muted}`}>
                <span className={styles.opName}>Recargo hora pico</span>
                <span className={styles.opAmt}>{COP(cart.peakSurcharge)}</span>
              </div>
            )}

            {/* Propina: 10% (sobre el subtotal) o monto custom. */}
            <div className={styles.opSep} />
            <div className={styles.tipBlock}>
              <span className={styles.tipHeadRow}>
                <span className={styles.tipLabel}>¿Agregar propina? 💛</span>
                {syncing && (
                  <span className={styles.tipLoading}>actualizando…</span>
                )}
              </span>
              <div className={`${styles.tipBtns}${syncing ? ` ${styles.tipBtnsSyncing}` : ''}`}>
                {([
                  ['none', 'Sin propina'],
                  ['percent10', '10%'],
                  ['custom', 'Otro'],
                ] as const).map(([mode, label]) => {
                  // Con el input "Otro" abierto, ese modo manda (aunque el monto
                  // sea 0 por estar vacío) para no resaltar "Sin propina" al borrar.
                  const active =
                    (mode === 'none' && cart.tip === 0 && !tipCustomOpen) ||
                    (mode === 'percent10' && cart.tipPercent === 10 && !tipCustomOpen) ||
                    (mode === 'custom' && tipCustomOpen);
                  return (
                    <button
                      key={mode}
                      type="button"
                      disabled={syncing || paying}
                      onClick={() => chooseTip(mode)}
                      className={`${styles.tipBtn}${active ? ` ${styles.tipBtnActive}` : ''}`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
              {tipCustomOpen && (
                <input
                  type="number"
                  min={0}
                  inputMode="numeric"
                  disabled={syncing || paying}
                  placeholder="Monto en $ (ej: 3000)"
                  value={tipCustomInput}
                  onChange={(e) => setTipCustomInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') applyCustomTip(); }}
                  aria-label="Monto de propina"
                  className={styles.tipInput}
                />
              )}
            </div>
            {cart.tip > 0 && (
              <div className={`${styles.opLine} ${styles.opTipLine}`}>
                <span className={styles.opName}>Propina{cart.tipPercent ? ` (${cart.tipPercent}%)` : ''}</span>
                <span className={styles.opAmt}>{COP(cart.tip)}</span>
              </div>
            )}

            <div className={`${styles.opLine} ${styles.total}`}>
              <span className={styles.opName}>Total</span>
              {/* key={cart.total}: al cambiar el total (p. ej. al agregar propina)
                  el span se re-monta y dispara la animación de "bump". */}
              <span key={cart.total} className={`${styles.opAmt} ${styles.totalBump}`} data-testid="cart-total">
                {COP(cart.total)}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Lista de promociones disponibles ahora. Aparece siempre que haya
       *  promos vigentes — el cliente las ve mientras arma el pedido, no
       *  solo arriba en el banner del catálogo. Si ya está aplicada al
       *  carrito, se marca con un chip verde "Aplicada". */}
      {livePromos.length > 0 && (
        <div className={styles.opCard} data-testid="cart-promos-available">
          <h2 className={styles.opTitle}>
            <Icon.Sparkles size={16} />
            Promos disponibles ahora
          </h2>
          <div className={styles.opPromos}>
            {livePromos.map(p => {
              const isApplied = cart.appliedPromo?.id === p.id;
              return (
                <div
                  key={p.id}
                  className={`${styles.opPromo}${isApplied ? ` ${styles.isApplied}` : ''}`}
                >
                  <span className={styles.opPromoBadge}>{badgeForPromo(p)}</span>
                  <div className={styles.opPromoText}>
                    <b>{p.name}</b>
                    {p.description && <span>{p.description}</span>}
                  </div>
                  {isApplied && (
                    <span className={styles.opPromoApplied} aria-label="Promoción aplicada">
                      <Icon.Check size={12} /> Aplicada
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Resumen de entrega + cliente — datos que vinieron del bot. */}
      <div className={styles.opCard} data-testid="delivery-summary">
        <h2 className={styles.opTitle}>
          <Icon.MapPin size={16} />
          Entrega
        </h2>
        {hasDeliveryData ? (
          <div className={styles.opLines}>
            <div className={styles.opLine}>
              <span className={styles.opName}>📍 {delivery!.address}</span>
            </div>
            <div className={`${styles.opLine} ${styles.muted}`}>
              <span className={styles.opName}>
                🗺️ {zone?.name ?? delivery!.zoneId}
                {zone ? ` · ${COP(zone.tarifa)}` : ''}
              </span>
            </div>
            <div className={styles.opSep} />
            <div className={styles.opLine}>
              <span className={styles.opName}>👤 {customer!.name}</span>
            </div>
            {customer?.email && (
              <div className={`${styles.opLine} ${styles.muted}`}>
                <span className={styles.opName}>✉️ {customer.email}</span>
              </div>
            )}
            <p className={styles.opNote}>
              <Icon.MessageCircle size={14} />
              Para cambiar tus datos, escribime <strong>cambiar dirección</strong> por WhatsApp.
            </p>
          </div>
        ) : (
          <div className={styles.opEmpty}>
            <Icon.AlertCircle size={26} />
            <p>
              Faltan tus datos de entrega.
              <br />
              Volvé a WhatsApp y te ayudo a completarlos 🙏
            </p>
          </div>
        )}
      </div>

      {error && (
        <div className={styles.payError} role="alert">
          <Icon.AlertCircle size={16} />
          <div>
            <b>No pudimos continuar.</b> {error}
          </div>
        </div>
      )}

      {closed && (
        <div className={styles.payError} role="alert">
          <Icon.Clock size={16} />
          <div>
            <b>Estamos cerrados.</b>{' '}
            {opensLabel ? `Abrimos ${opensLabel}.` : 'Volvé en horario de atención.'} Podés armar tu pedido y pagarlo cuando abramos.
          </div>
        </div>
      )}
      <button type="button" data-testid="pay-button" className={styles.payBtn} disabled={!canPay} onClick={onPay}>
        {paying ? (
          <>
            <span className={styles.spin} />
            Redirigiendo…
          </>
        ) : (
          <>Continuar {!empty && <span className="mono">{COP(cart.total)}</span>}</>
        )}
      </button>
      {empty && <p className={styles.payHint}>Agregá productos para continuar</p>}
      {syncing && !empty && <p className={styles.payHint}>Actualizando…</p>}
    </div>
  );
});
