import type { MetadataRoute } from "next";
import { noIndex, siteUrl } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  const site = siteUrl();
  // Sitios de prueba (preview de Vercel) no se indexan
  const isProduction = !noIndex() && (process.env.VERCEL_ENV ? process.env.VERCEL_ENV === "production" : true);
  return {
    rules: isProduction
      ? [{ userAgent: "*", allow: "/", disallow: ["/admin", "/api", "/checkout", "/cuenta", "/buscar"] }]
      : [{ userAgent: "*", disallow: "/" }],
    sitemap: new URL("/sitemap.xml", site).toString(),
  };
}
