'use client';

import { Icon } from '@/lib/icons';
import type { CheckoutUnusableStatus } from '@/lib/checkout';
import styles from './storefront.module.css';

const WA_NUMBER = process.env.NEXT_PUBLIC_WA_BUSINESS_NUMBER as string | undefined;
const WA_TEXT = 'Quiero hacer un pedido';

interface CartExpiredProps {
  /** Por qué el carrito no es utilizable. Cambia el copy. */
  status?: CheckoutUnusableStatus;
}

const COPY: Record<CheckoutUnusableStatus, { emoji: string; title: string; sub: string }> = {
  expirada: {
    emoji: '⏰',
    title: 'Este carrito ya venció',
    sub: 'El link de tu pedido tenía un tiempo límite y ya pasó. Pedí uno nuevo y seguimos donde quedaste.',
  },
  no_encontrada: {
    emoji: '🔎',
    title: 'No encontramos este carrito',
    sub: 'El link no es válido o ya no existe. Empezá un pedido nuevo por WhatsApp.',
  },
  ya_usada: {
    emoji: '✅',
    title: 'Este pedido ya está en proceso',
    sub: 'Ya recibimos este pedido y lo estamos atendiendo. Si querés pedir algo más, empezá uno nuevo.',
  },
};

/**
 * Pantalla amable cuando el link de checkout no es utilizable
 * (`expirada` | `no_encontrada` | `ya_usada`). Ofrece un único CTA que abre
 * WhatsApp con el bot y un texto pre-rellenado que dispara un pedido nuevo.
 */
export function CartExpired({ status = 'expirada' }: CartExpiredProps) {
  const { emoji, title, sub } = COPY[status] ?? COPY.expirada;
  const waHref = `https://wa.me/${WA_NUMBER ?? ''}?text=${encodeURIComponent(WA_TEXT)}`;

  return (
    <div className={styles.center}>
      <div className={styles.stateCard}>
        <div className={styles.stateEmoji} aria-hidden="true">{emoji}</div>
        <h1 className={styles.stateTitle}>{title}</h1>
        <p className={styles.stateSub}>{sub}</p>
        <a className={styles.btn} href={waHref}>
          <Icon.ArrowRight size={15} />
          Hacer un pedido nuevo
        </a>
      </div>
    </div>
  );
}
