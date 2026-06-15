'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Icon } from '@/lib/icons';
import {
  getCheckout,
  type CheckoutGetResponse,
  type CheckoutOrderInPipeline,
  type OrderPipelineStatus,
} from '@/lib/checkout';
import styles from '@/components/storefront.module.css';

const WA_NUMBER = process.env.NEXT_PUBLIC_WA_BUSINESS_NUMBER as string | undefined;

/**
 * Página `/pedir/pago/resultado?orderId=...`
 *
 * Acá llegan los clientes después de cerrar el Widget de Wompi o tras el
 * redirect de un método async (PSE, Bancolombia Transfer, BNPL). El estado
 * real del pago lo confirma el WEBHOOK server-side: esta página solo lee el
 * estado actual de la orden vía `GET /api/checkout/:orderId` y muestra:
 *
 *   - `ya_usada` (orden en nuevo/pagado/cocina/etc.) → ✅ pago confirmado
 *   - `valida`   (sigue en borrador/pendiente_pago)  → ⏳ procesando
 *   - `expirada` / `no_encontrada`                    → ⚠️ vencido / no existe
 *
 * En `valida` ofrecemos "Reintentar pago" (volver a la tienda) y un botón de
 * recargar; el webhook puede tardar segundos (tarjeta) o minutos (PSE/Nequi).
 */
function PaymentResultInner() {
  const sp = useSearchParams();
  const orderId = sp?.get('orderId') ?? null;

  const query = useQuery({
    queryKey: ['checkout-result', orderId],
    // Sin userId (no lo tenemos en este redirect), pero el backend igual
    // responde con el shape discriminado. Pasamos cadena vacía si falta.
    queryFn: () => getCheckout(orderId as string, ''),
    enabled: !!orderId,
    // No reintentar automáticamente: si falla la red, mostramos botón explícito.
    retry: false,
    // Polling cada 5s mientras el pedido NO esté entregado ni rechazado:
    //   - status='valida' → webhook todavía no llegó / volvió a borrador
    //   - status='ya_usada' y orderStatus != 'entregado' → mostrar avance del kanban
    // Cuando llega a 'entregado' o es link inválido, paramos el polling.
    refetchInterval: (q) => {
      const data = q.state.data as CheckoutGetResponse | undefined;
      if (data?.status === 'valida') return 5000;
      if (data?.status === 'ya_usada' && data.order?.orderStatus !== 'entregado') return 5000;
      return false;
    },
    refetchOnWindowFocus: false,
  });

  if (!orderId) {
    return (
      <Card emoji="🔗" title="Link inválido">
        Falta `orderId` en la URL. Volvé al link que te enviamos por WhatsApp.
      </Card>
    );
  }

  if (query.isLoading) {
    return <LoadingScreen label="Consultando estado de tu pago…" />;
  }

  if (query.isError || !query.data) {
    return (
      <Card emoji="⚠️" title="No pudimos consultar tu pago">
        Esperá unos segundos e intentá de nuevo. Si pagaste, te lo confirmamos por WhatsApp.
        <button className={`${styles.btn} ${styles.mt12}`} onClick={() => query.refetch()}>
          Reintentar
        </button>
      </Card>
    );
  }

  const status = query.data.status;

  if (status === 'ya_usada') {
    // El backend usa `ya_usada` para órdenes que ya pasaron de borrador
    // (nuevo/pagado/cocina/...). En este flujo eso significa: el pago se
    // confirmó vía webhook y la orden está activa en el kanban.
    return <SuccessCard orderId={orderId} pipeline={query.data.order ?? null} />;
  }

  if (status === 'valida') {
    // Sigue en borrador / pendiente_pago. Dos sub-casos:
    //   a) El webhook llegó como DECLINED/ERROR/VOIDED → orden volvió a
    //      borrador con `wompiStatusMessage` con el motivo. Mostramos copy de
    //      rechazo + CTA "Reintentar pago".
    //   b) El webhook todavía no llegó (PSE/Nequi pueden tardar minutos) →
    //      "Confirmando tu pago…" con refetch automático cada 5s.
    const order = query.data.order;
    const rejectionMessage = order.wompiStatusMessage;

    if (rejectionMessage) {
      return (
        <Card emoji="❌" title="Tu pago no se procesó">
          <span>
            Wompi nos respondió: <strong>{rejectionMessage}</strong>.<br />
            Tu carrito sigue intacto — podés volver y probar con otra tarjeta o método de pago.
          </span>
          <div className={styles.stateActions}>
            <a
              className={styles.btn}
              href={`/pedir?orderId=${encodeURIComponent(orderId)}`}
            >
              <Icon.ArrowRight size={15} /> Reintentar pago
            </a>
          </div>
        </Card>
      );
    }

    return (
      <Card emoji="⏳" title="Confirmando tu pago…">
        Esto puede tardar unos segundos (tarjeta) o algunos minutos (PSE, Nequi). Te avisamos por
        WhatsApp cuando recibamos la confirmación. Mientras tanto:
        <div className={styles.stateActions}>
          <a
            className={styles.btn}
            href={`/pedir?orderId=${encodeURIComponent(orderId)}`}
          >
            Volver al carrito
          </a>
          <button className={styles.btnGhost + ' ' + styles.btn} onClick={() => query.refetch()}>
            Actualizar estado
          </button>
        </div>
      </Card>
    );
  }

  // expirada | no_encontrada
  const waHref = `https://wa.me/${WA_NUMBER ?? ''}?text=${encodeURIComponent('Quiero hacer un pedido')}`;
  return (
    <Card emoji={status === 'expirada' ? '⏰' : '🔎'} title={status === 'expirada' ? 'El link venció' : 'No encontramos este pedido'}>
      Empezá un pedido nuevo por WhatsApp y te paso un link fresco.
      <a className={`${styles.btn} ${styles.mt12}`} href={waHref}>
        <Icon.ArrowRight size={15} /> Hacer un pedido nuevo
      </a>
    </Card>
  );
}

function LoadingScreen({ label }: { label: string }) {
  return (
    <div className={styles.center}>
      <div className={styles.stateCard}>
        <span className={styles.spin} style={{ width: 30, height: 30, borderWidth: 3 }} />
        <p className={styles.stateSub} style={{ marginTop: 6 }}>{label}</p>
      </div>
    </div>
  );
}

function Card({ emoji, title, children }: { emoji: string; title: string; children: React.ReactNode }) {
  return (
    <div className={styles.center}>
      <div className={styles.stateCard}>
        <div className={styles.stateEmoji} aria-hidden="true">{emoji}</div>
        <h1 className={styles.stateTitle}>{title}</h1>
        <p className={styles.stateSub}>{children}</p>
      </div>
    </div>
  );
}

/**
 * Mapeo del estado real de la orden al índice del paso visible. El cliente ve
 * 4 hitos (los mismos que recibe por WhatsApp via `notifyOrderStatus`):
 *
 *   índice 0  →  Pagado
 *   índice 1  →  En cocina  (incluye `empacado`, que es estado interno)
 *   índice 2  →  En camino  (ruta)
 *   índice 3  →  Entregado
 */
function stepIndexOf(orderStatus: OrderPipelineStatus | string | undefined): number {
  switch (orderStatus) {
    case 'nuevo':
    case 'pagado':
      return 0;
    case 'cocina':
    case 'empacado':
      return 1;
    case 'ruta':
      return 2;
    case 'entregado':
      return 3;
    default:
      return 0;
  }
}

const STEP_LABELS = ['Pagado', 'En cocina', 'En camino', 'Entregado'] as const;

function titleFor(stepIdx: number): string {
  if (stepIdx >= 3) return '¡Pedido entregado!';
  if (stepIdx >= 2) return '🛵 Tu pedido va en camino';
  if (stepIdx >= 1) return '👨‍🍳 Tu pedido está en cocina';
  return '¡Pago confirmado!';
}

function subtitleFor(stepIdx: number): string {
  if (stepIdx >= 3) return 'fue entregado.';
  if (stepIdx >= 2) return 'va en camino.';
  if (stepIdx >= 1) return 'está en preparación.';
  return 'fue confirmado.';
}

/**
 * Tarjeta de pago confirmado con timeline DINÁMICO que refleja el estado real
 * de la orden en el kanban. El query padre poolea cada 5s hasta que esté
 * `entregado` — los avances aparecen sin recargar.
 */
function SuccessCard({
  orderId,
  pipeline,
}: {
  orderId: string;
  pipeline: CheckoutOrderInPipeline | null;
}) {
  const stepIdx = stepIndexOf(pipeline?.orderStatus);
  const idLabel = pipeline?.orderNumber
    ? `#${pipeline.orderNumber}`
    : `#${orderId.slice(-6).toUpperCase()}`;

  return (
    <div className={styles.center}>
      <div className={styles.successCard}>
        <div className={styles.successMark} aria-hidden="true">
          <Icon.Check size={30} strokeWidth={2.5} />
        </div>
        <h1 className={styles.successTitle}>{titleFor(stepIdx)}</h1>
        <p className={styles.successSub}>
          Tu pedido <b>{idLabel}</b> {subtitleFor(stepIdx)}
        </p>

        <div className={styles.successTrack} aria-label="Estado del pedido">
          {STEP_LABELS.map((s, i) => {
            const isDone = i <= stepIdx;
            const isCurrent = i === stepIdx;
            const cls = isDone ? ` ${styles.done}` : isCurrent ? ` ${styles.current}` : '';
            return (
              <div key={s} className={`${styles.trackStep}${cls}`}>
                <span className={styles.trackDot}>
                  {isDone ? <Icon.Check size={12} strokeWidth={2.5} /> : i + 1}
                </span>
                <span>{s}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/**
 * Next 16 + output:'export' exige envolver cualquier consumidor de
 * useSearchParams en <Suspense>.
 */
export default function PaymentResultPage() {
  return (
    <Suspense fallback={<LoadingScreen label="Consultando estado de tu pago…" />}>
      <PaymentResultInner />
    </Suspense>
  );
}
