import "server-only";
import { demoSettings } from "@/lib/demo/catalog";
import { demoDb, demoSaleActive } from "@/lib/demo/db";
import { safeMediaUrl } from "@/lib/media";
import { hasSupabase, serviceClient } from "@/lib/supabase/clients";

/**
 * Lecturas en vivo (sin caché) para carrito, envío y checkout:
 * stock y precio tienen que ser los de este momento.
 */
export type LiveVariant = {
  id: string;
  productId: string;
  slug: string;
  name: string;
  colorName: string;
  colorSlug: string;
  size: string;
  sku: string;
  stock: number;
  price: number;
  image: string | null;
  weightG: number | null;
  box: { l: number; w: number; h: number } | null;
  available: boolean;
};

function salePrice(p: { base_price: number; sale_price: number | null; is_offer: boolean; sale_starts_at: string | null; sale_ends_at: string | null }) {
  const now = Date.now();
  const active =
    p.is_offer &&
    p.sale_price !== null &&
    p.sale_price < p.base_price &&
    (!p.sale_starts_at || Date.parse(p.sale_starts_at) <= now) &&
    (!p.sale_ends_at || Date.parse(p.sale_ends_at) > now);
  return active ? p.sale_price! : p.base_price;
}

export async function getLiveVariants(ids: string[]): Promise<Map<string, LiveVariant>> {
  const unique = [...new Set(ids)].filter((id) => /^[0-9a-f-]{36}$/i.test(id)).slice(0, 50);
  const out = new Map<string, LiveVariant>();
  if (unique.length === 0) return out;

  if (!hasSupabase) {
    for (const p of demoDb().products) {
      for (const v of p.variants) {
        if (!unique.includes(v.id)) continue;
        const color = p.colors.find((c) => c.id === v.colorId)!;
        out.set(v.id, {
          id: v.id,
          productId: p.id,
          slug: p.slug,
          name: p.name,
          colorName: color.name,
          colorSlug: color.slug,
          size: v.size,
          sku: v.sku,
          stock: v.stock,
          price: demoSaleActive(p) ? p.salePrice! : p.basePrice,
          image: safeMediaUrl(p.images.find((i) => i.colorId === v.colorId)?.url ?? p.images[0]?.url ?? null),
          weightG: p.weightG,
          box: p.box,
          available: p.active,
        });
      }
    }
    return out;
  }

  const { data, error } = await serviceClient()
    .from("product_variants")
    .select(
      "id, size, sku, stock, active, color_id, product_colors(color_name, slug), products!inner(id, slug, name, active, base_price, sale_price, is_offer, sale_starts_at, sale_ends_at, weight_g, box_dimensions, product_images(url, color_id, order, type))",
    )
    .in("id", unique);
  if (error) throw error;

  for (const row of data as unknown as {
    id: string;
    size: string;
    sku: string;
    stock: number;
    active: boolean;
    color_id: string | null;
    product_colors: { color_name: string; slug: string } | null;
    products: {
      id: string;
      slug: string;
      name: string;
      active: boolean;
      base_price: number;
      sale_price: number | null;
      is_offer: boolean;
      sale_starts_at: string | null;
      sale_ends_at: string | null;
      weight_g: number | null;
      box_dimensions: { l: number; w: number; h: number } | null;
      product_images: { url: string; color_id: string | null; order: number; type: string }[];
    };
  }[]) {
    const p = row.products;
    const imgs = p.product_images.filter((i) => i.type === "image").sort((a, b) => a.order - b.order);
    out.set(row.id, {
      id: row.id,
      productId: p.id,
      slug: p.slug,
      name: p.name,
      colorName: row.product_colors?.color_name ?? "",
      colorSlug: row.product_colors?.slug ?? "",
      size: row.size,
      sku: row.sku,
      stock: row.stock,
      price: salePrice(p),
      image: safeMediaUrl((imgs.find((i) => i.color_id === row.color_id) ?? imgs[0])?.url ?? null),
      weightG: p.weight_g,
      box: p.box_dimensions,
      available: row.active && p.active,
    });
  }
  return out;
}

/** Peso y caja por producto (para cotizar desde la ficha, antes de elegir talle). */
export async function getProductShippingData(productId: string): Promise<{ weightG: number | null; box: { l: number; w: number; h: number } | null } | null> {
  if (!hasSupabase) {
    const p = demoDb().products.find((x) => x.id === productId && x.active);
    return p ? { weightG: p.weightG, box: p.box } : null;
  }
  const { data } = await serviceClient().from("products").select("weight_g, box_dimensions").eq("id", productId).eq("active", true).maybeSingle();
  return data ? { weightG: data.weight_g, box: data.box_dimensions } : null;
}

export type ShippingConfig = {
  originCp: string;
  defaultBox: { weightG: number; l: number; w: number; h: number };
  cacheHours: number;
};

export async function getShippingConfig(): Promise<ShippingConfig> {
  const fallback = demoSettings.shipping.value as ShippingConfig;
  if (!hasSupabase) return { ...fallback, ...(demoDb().settings.shipping?.value as object) };
  const { data } = await serviceClient().from("settings").select("value").eq("key", "shipping").maybeSingle();
  return { ...fallback, ...(data?.value ?? {}) };
}

export type FallbackRate = { zone: string; cpFrom: number; cpTo: number; service: "domicilio" | "sucursal"; price: number; etaDays: number | null };

export async function getFallbackRates(): Promise<FallbackRate[]> {
  if (!hasSupabase) return demoDb().fallbackRates;
  const { data, error } = await serviceClient().from("shipping_fallback_rates").select("zone, cp_from, cp_to, service, price, eta_days");
  if (error) throw error;
  return data.map((r) => ({ zone: r.zone, cpFrom: r.cp_from, cpTo: r.cp_to, service: r.service, price: r.price, etaDays: r.eta_days }));
}
