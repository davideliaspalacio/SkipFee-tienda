import type { Metadata } from "next";
import { Bricolage_Grotesque, Hanken_Grotesk, DM_Mono } from "next/font/google";
import "./brand.css";
import { Providers } from "./providers";

// Mismas fuentes que la marca Skipfee (Bricolage display + Hanken body + DM Mono).
const display = Bricolage_Grotesque({ subsets: ["latin"], variable: "--font-display", display: "swap" });
const sans = Hanken_Grotesk({ subsets: ["latin"], variable: "--font-sans", display: "swap" });
const mono = DM_Mono({ subsets: ["latin"], weight: ["400", "500"], variable: "--font-mono", display: "swap" });

export const metadata: Metadata = {
  title: "Skipfee · Pedido",
  description: "Completá tu pedido y pagá en línea.",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${display.variable} ${sans.variable} ${mono.variable}`}>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
