'use client';

import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import {
  getCheckout,
  type CheckoutUnusableStatus,
  type CheckoutValid,
} from '@/lib/checkout';
import { CartExpired } from '@/components/CartExpired';
import { OrderBuilder } from '@/components/OrderBuilder';
import styles from '@/components/storefront.module.css';

/**
 * Raíz de la tienda pública (ruta `/pedir`, sin login).
 *
 * 1. Lee `orderId` (requerido) y `userId` (opcional, contexto) del query string
 *    vía `useSearchParams()`. `userId` lo manda el bot al armar el link inicial,
 *    pero NO es requisito: el token de la orden es el `orderId` (uuid no
 *    adivinable). Esto importa porque cuando el cliente vuelve de un pago
 *    rechazado, Wompi redirige a /pedir/pago/resultado con SOLO orderId y desde
 *    ahí "Volver al carrito" no necesita el userId para reabrir el carrito.
 * 2. `GET /api/checkout/:orderId?userId=…` al montar.
 * 3. Branch por `status`: `valida` → <OrderBuilder/>; resto → <CartExpired/>.
 *    Si una mutación posterior reporta 409, salta a <CartExpired/> también.
 */
function StorefrontInner() {
  const sp = useSearchParams();
  const orderId = sp?.get('orderId') ?? null;
  const userId = sp?.get('userId') ?? null;
  const [overrideUnusable, setOverrideUnusable] = useState<CheckoutUnusableStatus | null>(null);

  const query = useQuery({
    queryKey: ['checkout', orderId, userId],
    queryFn: () => getCheckout(orderId as string, userId ?? ''),
    enabled: !!orderId,
    staleTime: Infinity,
    retry: false,
    refetchOnWindowFocus: false,
  });

  if (!orderId) {
    return (
      <div className={styles.center}>
        <div className={styles.stateCard}>
          <div className={styles.stateEmoji} aria-hidden="true">🔗</div>
          <h1 className={styles.stateTitle}>Link inválido</h1>
          <p className={styles.stateSub}>
            Falta el código del pedido en el link. Abrí el enlace que te enviamos por WhatsApp.
          </p>
        </div>
      </div>
    );
  }

  if (overrideUnusable) {
    return <CartExpired status={overrideUnusable} />;
  }

  if (query.isLoading) {
    return <LoadingScreen label="Cargando tu pedido…" />;
  }

  if (query.isError || !query.data) {
    return (
      <div className={styles.center}>
        <div className={styles.stateCard}>
          <div className={styles.stateEmoji} aria-hidden="true">⚠️</div>
          <h1 className={styles.stateTitle}>No pudimos cargar tu pedido</h1>
          <p className={styles.stateSub}>
            Revisá tu conexión e intentá de nuevo.
          </p>
          <button className={styles.btn} onClick={() => query.refetch()}>
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  if (query.data.status !== 'valida') {
    return <CartExpired status={query.data.status} />;
  }

  return (
    <OrderBuilder
      data={query.data as CheckoutValid}
      onUnusable={(status) => setOverrideUnusable(status)}
    />
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

/**
 * Next 16 + output:'export' exige envolver cualquier consumidor de
 * useSearchParams en <Suspense> (la prerenderización estática lo requiere).
 */
export default function PedirPage() {
  return (
    <Suspense fallback={<LoadingScreen label="Cargando…" />}>
      <StorefrontInner />
    </Suspense>
  );
}
