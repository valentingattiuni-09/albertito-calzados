import type { MetadataRoute } from "next";
import { HELP_PAGES, LEGAL_PAGES } from "@/lib/content/pages";
import { getCatalog } from "@/lib/data/catalog";
import { getNavigation } from "@/lib/data/layout";

const site = () => process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [nav, catalog] = await Promise.all([getNavigation(), getCatalog()]);
  const url = (path: string) => new URL(path, site()).toString();

  return [
    { url: url("/"), changeFrequency: "daily", priority: 1 },
    ...nav.flatMap((s) => [
      { url: url(s.href), changeFrequency: "daily" as const, priority: 0.8 },
      ...s.children.map((c) => ({ url: url(c.href), changeFrequency: "daily" as const, priority: 0.7 })),
    ]),
    ...catalog.map((p) => ({
      url: url(`/producto/${p.slug}`),
      changeFrequency: "weekly" as const,
      priority: 0.6,
      images: p.images.slice(0, 1).map((i) => url(i)),
    })),
    ...Object.keys(HELP_PAGES).map((slug) => ({ url: url(`/ayuda/${slug}`), changeFrequency: "monthly" as const, priority: 0.3 })),
    ...Object.keys(LEGAL_PAGES).map((slug) => ({ url: url(`/legales/${slug}`), changeFrequency: "yearly" as const, priority: 0.2 })),
    { url: url("/nosotros"), changeFrequency: "yearly", priority: 0.3 },
    { url: url("/contacto"), changeFrequency: "yearly", priority: 0.3 },
    { url: url("/arrepentimiento"), changeFrequency: "yearly", priority: 0.2 },
  ];
}
