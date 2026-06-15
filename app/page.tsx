import Link from "next/link";

/**
 * Raíz de la tienda. Un cliente real llega a /pedir?orderId=… desde el link de
 * WhatsApp; si alguien entra a "/" sin pedido, lo orientamos (y dejamos ver la demo).
 */
export default function Home() {
  return (
    <main style={{ minHeight: "100dvh", display: "grid", placeItems: "center", padding: 24, textAlign: "center" }}>
      <div style={{ maxWidth: 460, display: "grid", gap: 14, justifyItems: "center" }}>
        <div style={{ fontFamily: "var(--font-display), sans-serif", fontWeight: 800, fontSize: 30, letterSpacing: "-0.02em" }}>
          Skip<span style={{ color: "var(--green-strong)" }}>fee</span>
        </div>
        <div style={{ fontSize: 52, lineHeight: 1 }} aria-hidden="true">🍔</div>
        <h1 style={{ fontFamily: "var(--font-display), sans-serif", fontWeight: 800, fontSize: "1.7rem", letterSpacing: "-0.02em" }}>
          Tu pedido te espera en WhatsApp
        </h1>
        <p style={{ color: "var(--text-muted)", fontSize: 16, lineHeight: 1.6, maxWidth: "36ch" }}>
          Abrí el enlace que te enviamos por WhatsApp para ver el menú, armar tu pedido y pagar en línea.
        </p>
        <Link href="/demo" className="btn btn-primary" style={{ marginTop: 8 }}>
          Ver demo de la tienda
        </Link>
      </div>
    </main>
  );
}
