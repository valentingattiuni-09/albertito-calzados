import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  // Sitios de prueba (preview de Vercel) no se indexan
  const isProduction = process.env.VERCEL_ENV ? process.env.VERCEL_ENV === "production" : true;
  return {
    rules: isProduction
      ? [{ userAgent: "*", allow: "/", disallow: ["/admin", "/api", "/checkout", "/cuenta", "/buscar"] }]
      : [{ userAgent: "*", disallow: "/" }],
    sitemap: new URL("/sitemap.xml", site).toString(),
  };
}
