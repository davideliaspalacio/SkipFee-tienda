import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Tienda pública (checkout): SPA client-rendered → export estático a Cloudflare.
  // El cliente abre /pedir?orderId=… desde el link de WhatsApp.
  output: "export",
  images: { unoptimized: true },
  poweredByHeader: false,
};

export default nextConfig;
