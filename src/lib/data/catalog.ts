import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { demoSynonyms } from "@/lib/demo/catalog";
import { demoDb, demoSaleActive, type DbProduct } from "@/lib/demo/db";
import { safeMediaUrl } from "@/lib/media";
import { normalize, termScore, tokens } from "@/lib/search/normalize";
import { hasSupabase, publicClient } from "@/lib/supabase/clients";
import { getNavigation } from "./layout";
import { TAGS } from "./tags";
import type { ColorSummary, ProductCard, ProductDetail, ProductLine } from "./types";

// ---------------------------------------------------------------------------
// Modo demo
// ---------------------------------------------------------------------------
function demoCard(p: DbProduct): ProductCard {
  const onSale = demoSaleActive(p);
  const price = onSale ? p.salePrice! : p.basePrice;
  const firstColor = p.colors[0]?.id;
  const catNames = p.categoryIds.map((id) => demoDb().categories.find((c) => c.id === id)?.name ?? "");
  return {
    id: p.id,
    name: p.name,
    slug: p.slug,
    line: p.line,
    basePrice: p.basePrice,
    price,
    discountPct: onSale ? Math.round((100 * (p.basePrice - price)) / p.basePrice) : 0,
    onSale,
    isNew: p.isNew,
    isFeatured: p.isFeatured,
    soldCount: p.soldCount,
    createdAt: p.createdAt,
    images: p.images.filter((i) => i.colorId === firstColor || i.colorId === null).slice(0, 2).map((i) => safeMediaUrl(i.url)!),
    colors: p.colors.map((c) => ({ name: c.name, slug: c.slug, hex: c.hex })),
    sizesInStock: [...new Set(p.variants.filter((v) => v.stock > 0).map((v) => v.size))].sort((a, b) => Number(a) - Number(b)),
    categoryIds: p.categoryIds,
    searchText: normalize(`${p.name} ${catNames.join(" ")}`),
  };
}

// ---------------------------------------------------------------------------
// Supabase
// ---------------------------------------------------------------------------
type CardRow = {
  id: string;
  name: string;
  slug: string;
  line: ProductLine;
  base_price: number;
  price: number;
  discount_pct: number;
  on_sale: boolean;
  is_new: boolean;
  is_featured: boolean;
  sold_count: number;
  created_at: string;
  images: string[];
  colors: ColorSummary[];
  sizes_in_stock: string[];
  category_ids: string[];
};

async function categoryNames(): Promise<Map<string, string>> {
  const nav = await getNavigation();
  const map = new Map<string, string>();
  nav.forEach((s) => {
    map.set(s.id, s.name);
    s.children.forEach((c) => map.set(c.id, c.name));
  });
  return map;
}

function rowToCard(r: CardRow, names: Map<string, string>): ProductCard {
  return {
    id: r.id,
    name: r.name,
    slug: r.slug,
    line: r.line,
    basePrice: r.base_price,
    price: r.price,
    discountPct: r.discount_pct,
    onSale: r.on_sale,
    isNew: r.is_new,
    isFeatured: r.is_featured,
    soldCount: r.sold_count,
    createdAt: r.created_at,
    images: (r.images ?? []).map((u) => safeMediaUrl(u)!),
    colors: r.colors ?? [],
    sizesInStock: [...(r.sizes_in_stock ?? [])].sort((a, b) => Number(a) - Number(b)),
    categoryIds: r.category_ids ?? [],
    searchText: normalize(`${r.name} ${(r.category_ids ?? []).map((id) => names.get(id) ?? "").join(" ")}`),
  };
}

// ---------------------------------------------------------------------------
// API pública de la capa de datos
// ---------------------------------------------------------------------------

/**
 * Todo el catálogo activo como tarjetas. El catálogo de una zapatería entra cómodo en memoria
 * (cientos o pocos miles de productos), así que filtros y orden se resuelven en el servidor
 * sobre esta lista cacheada, igual en modo demo y con Supabase.
 */
export async function getCatalog(): Promise<ProductCard[]> {
  "use cache";
  cacheTag(TAGS.products);
  cacheLife("minutes");

  if (!hasSupabase) return demoDb().products.filter((p) => p.active).map(demoCard);

  const names = await categoryNames();
  const all: CardRow[] = [];
  const PAGE = 1000;
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await publicClient()
      .from("v_product_cards")
      .select("*")
      .order("created_at", { ascending: false })
      .range(from, from + PAGE - 1);
    if (error) throw error;
    all.push(...(data as CardRow[]));
    if (data.length < PAGE) break;
  }
  return all.map((r) => rowToCard(r, names));
}

export async function getProductBySlug(slug: string): Promise<ProductDetail | null> {
  "use cache";
  cacheTag(TAGS.products, TAGS.product(slug));
  cacheLife("minutes");

  const card = (await getCatalog()).find((p) => p.slug === slug);
  if (!card) return null;

  if (!hasSupabase) {
    const p = demoDb().products.find((d) => d.slug === slug)!;
    const colorSlug = new Map(p.colors.map((c) => [c.id, c.slug]));
    return {
      ...card,
      skuBase: p.skuBase,
      description: p.description,
      specs: p.specs,
      weightG: p.weightG,
      media: p.images.map((i) => ({ url: safeMediaUrl(i.url)!, alt: i.alt, type: "image", colorSlug: i.colorId ? colorSlug.get(i.colorId)! : null })),
      variants: p.variants.map((v) => ({
        id: v.id,
        colorSlug: colorSlug.get(v.colorId)!,
        size: v.size,
        sizeSort: v.sizeSort,
        sku: v.sku,
        stock: v.stock,
      })),
    };
  }

  const { data, error } = await publicClient()
    .from("products")
    .select(
      "sku_base, description, specs, weight_g, product_colors(id, slug, order), product_images(url, alt, type, order, color_id), product_variants(id, color_id, size, size_sort, sku, stock, active)",
    )
    .eq("id", card.id)
    .single();
  if (error) throw error;

  const colorSlug = new Map<string, string>(data.product_colors.map((c: { id: string; slug: string }) => [c.id, c.slug]));
  return {
    ...card,
    skuBase: data.sku_base,
    description: data.description,
    specs: data.specs ?? {},
    weightG: data.weight_g,
    media: [...data.product_images]
      .sort((a, b) => a.order - b.order)
      .map((i) => ({ url: safeMediaUrl(i.url)!, alt: i.alt, type: i.type, colorSlug: i.color_id ? (colorSlug.get(i.color_id) ?? null) : null })),
    variants: data.product_variants
      .filter((v: { active: boolean }) => v.active)
      .map((v: { id: string; color_id: string; size: string; size_sort: number; sku: string; stock: number }) => ({
        id: v.id,
        colorSlug: colorSlug.get(v.color_id) ?? "",
        size: v.size,
        sizeSort: Number(v.size_sort),
        sku: v.sku,
        stock: v.stock,
      })),
  };
}

// ---------------------------------------------------------------------------
// Búsqueda
// ---------------------------------------------------------------------------
const SYNONYMS = new Map(demoSynonyms.map(([t, e]) => [normalize(t), e.map(normalize)]));

/** Búsqueda en memoria para el modo demo (misma lógica que la RPC search_products). */
function demoSearch(q: string, catalog: ProductCard[]): ProductCard[] {
  const terms = tokens(q);
  if (terms.length === 0) return [];
  const scored = catalog
    .map((p) => {
      const words = p.searchText.split(" ");
      let total = 0;
      for (const t of terms) {
        const alternatives = [t, ...(SYNONYMS.get(t) ?? [])];
        const s = Math.max(...alternatives.map((a) => termScore(a, words)));
        if (s === 0) return null; // todos los términos tienen que coincidir
        total += s;
      }
      return { p, total };
    })
    .filter((x): x is { p: ProductCard; total: number } => x !== null);
  return scored.sort((a, b) => b.total - a.total || b.p.soldCount - a.p.soldCount).map((x) => x.p);
}

/** Productos que coinciden con la búsqueda, ordenados por relevancia. */
export async function searchProducts(q: string, limit = 200): Promise<ProductCard[]> {
  const query = q.trim().slice(0, 80);
  if (normalize(query).length < 2) return [];
  const catalog = await getCatalog();

  if (!hasSupabase) return demoSearch(query, catalog).slice(0, limit);

  const { data, error } = await publicClient().rpc("search_products", { q: query, max_results: limit });
  if (error) throw error;
  const byId = new Map(catalog.map((p) => [p.id, p]));
  return (data as { product_id: string }[]).map((r) => byId.get(r.product_id)).filter((p): p is ProductCard => Boolean(p));
}
