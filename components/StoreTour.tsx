'use client';

// Mini-recorrido guiado del storefront (driver.js), una sola página. Resalta la
// experiencia del cliente (menú, promos, carrito, pago). No se puede cerrar a la
// fuerza; al terminar lleva a la website. Auto-arranca al entrar a /demo.

import { useCallback, useEffect, useRef, useState } from 'react';
import { driver } from 'driver.js';
import 'driver.js/dist/driver.css';
import { TOUR_STEPS, type TourStep } from '@/lib/tour';

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://skipfee.co').replace(/\/+$/, '');
const MUTE_KEY = 'skipfee-store-tour-muted';
const DONE_KEY = 'skipfee-store-tour-done';

function isMobile(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(max-width: 940px)').matches;
}

let audioCtx: AudioContext | null = null;
function playBlip(muted: boolean): void {
  if (muted || typeof window === 'undefined') return;
  try {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return;
    audioCtx = audioCtx ?? new Ctor();
    const ctx = audioCtx;
    if (ctx.state === 'suspended') void ctx.resume();
    const t = ctx.currentTime;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.connect(g);
    g.connect(ctx.destination);
    o.type = 'sine';
    o.frequency.setValueAtTime(620, t);
    o.frequency.exponentialRampToValueAtTime(880, t + 0.09);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.1, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.2);
    o.start(t);
    o.stop(t + 0.22);
  } catch {
    /* ignore */
  }
}

export function StoreTour() {
  const steps = TOUR_STEPS;
  const [active, setActive] = useState(false);
  const [idx, setIdx] = useState(0);
  const [showFinal, setShowFinal] = useState(false);
  const [muted, setMuted] = useState(false);
  const driverRef = useRef<ReturnType<typeof driver> | null>(null);

  useEffect(() => {
    try {
      setMuted(localStorage.getItem(MUTE_KEY) === '1');
    } catch {
      /* ignore */
    }
  }, []);
  const toggleMute = useCallback(() => {
    setMuted((m) => {
      const next = !m;
      try {
        localStorage.setItem(MUTE_KEY, next ? '1' : '0');
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  // Scroll instantáneo durante el tour (evita que el scroll-behavior:smooth
  // descuadre el posicionamiento de los popovers).
  useEffect(() => {
    if (!active || typeof document === 'undefined') return;
    const html = document.documentElement;
    const prev = html.style.scrollBehavior;
    html.style.scrollBehavior = 'auto';
    return () => {
      html.style.scrollBehavior = prev;
    };
  }, [active]);

  useEffect(() => {
    if (!active) return;
    const d = driver({
      allowClose: false,
      overlayColor: 'rgba(8, 14, 28, 0.86)',
      stagePadding: 8,
      stageRadius: 12,
      popoverClass: 'skipfee-tour',
      animate: true,
    });
    driverRef.current = d;
    return () => {
      d.destroy();
      driverRef.current = null;
    };
  }, [active]);

  const goNext = useCallback(() => {
    playBlip(muted);
    setIdx((i) => {
      if (i >= steps.length - 1) {
        driverRef.current?.destroy();
        setActive(false);
        setShowFinal(true);
        try {
          sessionStorage.setItem(DONE_KEY, '1');
        } catch {
          /* ignore */
        }
        return i;
      }
      return i + 1;
    });
  }, [steps.length, muted]);

  const goPrev = useCallback(() => setIdx((i) => Math.max(0, i - 1)), []);

  const startTour = useCallback(() => {
    setShowFinal(false);
    setIdx(0);
    setActive(true);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const force = new URLSearchParams(window.location.search).get('tour') === '1';
    if (force) {
      try {
        const u = new URL(window.location.href);
        u.searchParams.delete('tour');
        window.history.replaceState({}, '', u.toString());
      } catch {
        /* ignore */
      }
      try {
        sessionStorage.removeItem(DONE_KEY);
      } catch {
        /* ignore */
      }
      startTour();
      return;
    }
    let done = false;
    try {
      done = sessionStorage.getItem(DONE_KEY) === '1';
    } catch {
      /* ignore */
    }
    if (!done) startTour();
  }, [startTour]);

  useEffect(() => {
    if (!active) return;
    const step = steps[idx];
    if (!step) return;
    const d = driverRef.current;
    if (!d) return;
    const sel = isMobile() && step.elementMobile ? step.elementMobile : step.element;
    const isLast = idx >= steps.length - 1;
    const popover = {
      title: step.title,
      description: step.description,
      showButtons: (idx > 0 ? ['previous', 'next'] : ['next']) as Array<'previous' | 'next'>,
      nextBtnText: isLast ? 'Terminar →' : 'Siguiente →',
      prevBtnText: '← Atrás',
      onNextClick: () => goNext(),
      onPrevClick: () => goPrev(),
    };
    let timer = 0;
    let tries = 0;
    const run = () => {
      const el = sel ? (document.querySelector(sel) as HTMLElement | null) : null;
      if (sel && !el && tries < 12) {
        tries += 1;
        timer = window.setTimeout(run, 110);
        return;
      }
      if (sel && el) {
        // Centra el elemento destino en pantalla ANTES de resaltar: el foco queda
        // claro aunque el cliente haya hecho scroll (lo "sube" solo) y driver
        // calcula la posición del popover sobre una geometría ya estable.
        el.scrollIntoView({ behavior: 'auto', block: 'center', inline: 'nearest' });
        timer = window.setTimeout(() => d.highlight({ element: sel, popover }), 70);
      } else {
        // Paso centrado (sin selector): llevamos la vista arriba para enfocar.
        window.scrollTo({ top: 0, behavior: 'auto' });
        d.highlight({ popover });
      }
    };
    timer = window.setTimeout(run, 90);
    return () => window.clearTimeout(timer);
  }, [active, idx, steps, goNext, goPrev]);

  const step = steps[idx];
  const pct = steps.length ? Math.round(((idx + 1) / steps.length) * 100) : 0;

  return (
    <>
      {active && step && (
        <div className="tour-progress" role="status" aria-live="polite">
          <div className="tour-progress-track"><span style={{ width: `${pct}%` }} /></div>
          <div className="tour-progress-meta">
            <span className="tour-progress-section">{step.section}</span>
            <span className="tour-progress-count">Paso {idx + 1} de {steps.length}</span>
            <button type="button" className="tour-progress-mute" onClick={toggleMute} aria-label={muted ? 'Activar sonido' : 'Silenciar'} title={muted ? 'Activar sonido' : 'Silenciar'}>
              {muted ? '🔇' : '🔊'}
            </button>
          </div>
        </div>
      )}

      {showFinal && (
        <div className="demo-final" role="dialog" aria-modal="true">
          <div className="demo-final-card">
            <span className="demo-final-emoji" aria-hidden="true">🎉</span>
            <h2>Así de fácil pide tu cliente</h2>
            <p>Cero apps, cero cuentas, <b>0% de comisión</b> — y la venta es 100% tuya. ¿Lo activamos para tu restaurante?</p>
            <div className="demo-final-actions">
              <a className="btn btn-primary" href={SITE_URL}>🌐 Conocer Skipfee</a>
              <button type="button" className="btn btn-ghost" onClick={startTour}>↻ Repetir recorrido</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
