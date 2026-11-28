import type { NextConfig } from "next";

// Fotos subidas al Storage de Supabase (bucket "media")
const supabaseHost = process.env.NEXT_PUBLIC_SUPABASE_URL ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname : null;
// Otros hosts de fotos permitidos (CDN propio, el de las fotos del back office, etc.). Misma lista que valida src/lib/media.ts
// Una entrada «http://localhost:PUERTO» (solo fuera de producción) sirve para probar contra la API local del back office.
const isProd = process.env.NODE_ENV === "production" && process.env.ALLOW_LOCAL_MEDIA !== "1";
const entries = (process.env.IMAGE_HOSTS ?? "").split(",").map((h) => h.trim()).filter(Boolean);
const extraHosts = entries.filter((h) => !h.includes("://"));
const localHosts = isProd ? [] : entries.filter((h) => /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(h)).map((h) => new URL(h));

const nextConfig: NextConfig = {
  // De dónde salen los datos (demo | backoffice). No es secreto: lo usan los error.tsx para decidir qué mostrar.
  env: { NEXT_PUBLIC_DATA_SOURCE: (process.env.DATA_SOURCE ?? "demo").trim().toLowerCase() || "demo" },
  cacheComponents: true,
  partialPrefetching: true,
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      ...(supabaseHost ? [{ protocol: "https" as const, hostname: supabaseHost, pathname: "/storage/v1/object/public/**" }] : []),
      ...extraHosts.map((hostname) => ({ protocol: "https" as const, hostname })),
      ...localHosts.map((u) => ({ protocol: "http" as const, hostname: u.hostname, port: u.port, pathname: "/**" })),
    ],
    // Solo para la prueba local contra la API del back office en localhost (nunca en producción)
    ...(localHosts.length ? { dangerouslyAllowLocalIP: true } : {}),
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
