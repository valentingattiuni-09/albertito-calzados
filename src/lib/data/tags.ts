import { createHash, timingSafeEqual } from "node:crypto";

/**
 * Tags de caché. Cuando cambia una tabla (admin, back office o webhook de Supabase)
 * se invalidan estos tags y la tienda se actualiza sola. Ver src/app/api/revalidate.
 */
export const TAGS = {
  categories: "categories",
  products: "products",
  product: (slug: string) => `product:${slug}`,
  promos: "promos",
  home: "home",
  settings: "settings",
} as const;

/** Qué tags invalidar según la tabla que cambió. */
export const TABLE_TAGS: Record<string, string[]> = {
  categories: [TAGS.categories, TAGS.products],
  products: [TAGS.products, TAGS.home],
  product_categories: [TAGS.products],
  product_colors: [TAGS.products],
  product_images: [TAGS.products],
  product_variants: [TAGS.products],
  search_synonyms: [TAGS.products],
  payment_promos: [TAGS.promos],
  topbar_messages: [TAGS.promos],
  home_banners: [TAGS.home],
  home_videos: [TAGS.home],
  settings: [TAGS.settings],
  // Back office: las promos de cuotas salen de los planes de cuotas
  payment_plans: [TAGS.promos],
};

/**
 * El secreto del aviso, comparado en tiempo constante (sobre el SHA-256 de cada lado, así el largo tampoco se filtra). Sin secreto configurado, nada pasa.
 */
export function secretMatches(expected: string | undefined, given: string | null): boolean {
  if (!expected || !given) return false;
  const a = createHash("sha256").update(expected).digest();
  const b = createHash("sha256").update(given).digest();
  return timingSafeEqual(a, b);
}
