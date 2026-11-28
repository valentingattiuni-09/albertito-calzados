/**
 * Mapeo de la API del back office a los tipos de la tienda (src/lib/data/types.ts, sin cambiarlos).
 * Puro (sin imports de ejecución) para poder testearlo con node --test: las dos utilidades de la tienda que usa se inyectan.
 */
import type { NavSection, PaymentPromo, ProductCard, ProductDetail, StoreSettings, TopbarMessage } from "@/lib/data/types";
import type { HomeBanner } from "@/lib/data/home";
import type { LiveVariant } from "@/lib/orders/live";
import type { BoCard, BoDetail, BoHomeBanner, BoLiveVariant, BoNavSection, BoPaymentPromo, BoSettings, BoTopbarMessage } from "./dto";

export type MapDeps = {
  /** normalize() de src/lib/search/normalize.ts */
  normalize: (s: string) => string;
  /** safeMediaUrl() de src/lib/media.ts: una URL de un host no permitido se cambia por el placeholder */
  media: (url: string | null | undefined) => string | null;
};

/** Gris neutro para los colores que todavía no tienen hex cargado en el back office */
export const NO_HEX = "#D9D9D9";

/** Centavos → pesos (la tienda trabaja en pesos; con oferta el back ya redondea al peso entero). */
export const pesos = (cents: number) => Math.round(cents) / 100;

export function toNavigation(sections: BoNavSection[], deps: Pick<MapDeps, "media">): NavSection[] {
  const banner = (b: BoNavSection["banner"]) => (b ? { desktop: deps.media(b.desktop)!, mobile: deps.media(b.mobile) } : null);
  return sections.map((s) => ({
    id: s.id,
    name: s.name,
    slug: s.slug,
    kind: s.kind,
    href: s.href,
    sizeRange: s.sizeRange,
    promo: s.promo ? { title: s.promo.title, link: s.promo.link || `/${s.slug}`, image: deps.media(s.promo.image) } : null,
    banner: banner(s.banner),
    children: s.children.map((c) => ({ id: c.id, name: c.name, slug: c.slug, href: c.href, banner: banner(c.banner) })),
  }));
}

/** Nombre de cada categoría (sección y subsección), para el texto de búsqueda */
export function categoryNames(nav: NavSection[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const s of nav) {
    map.set(s.id, s.name);
    for (const c of s.children) map.set(c.id, c.name);
  }
  return map;
}

const bySize = (a: string, b: string) => {
  const na = Number(a.replace(",", "."));
  const nb = Number(b.replace(",", "."));
  return Number.isFinite(na) && Number.isFinite(nb) ? na - nb : a.localeCompare(b);
};

export function toCard(c: BoCard, names: Map<string, string>, deps: MapDeps): ProductCard {
  return {
    id: c.id,
    name: c.name,
    slug: c.slug,
    line: c.line ?? "diario",
    basePrice: pesos(c.basePriceCents),
    price: pesos(c.priceCents),
    discountPct: c.discountPct,
    onSale: c.onSale,
    isNew: c.isNew,
    isFeatured: c.isFeatured,
    soldCount: c.soldCount,
    createdAt: c.createdAt,
    images: c.images.map((u) => deps.media(u)!).filter(Boolean),
    colors: c.colors.map((x) => ({ name: x.name, slug: x.slug, hex: x.hex ?? NO_HEX })),
    sizesInStock: [...c.sizesInStock].sort(bySize),
    categoryIds: c.categoryIds,
    // Igual que en el modo demo: nombre + nombres de sus categorías, normalizado (la búsqueda y los sinónimos se resuelven en memoria)
    searchText: deps.normalize(`${c.name} ${c.categoryIds.map((id) => names.get(id) ?? "").join(" ")}`),
  };
}

export function toDetail(d: BoDetail, names: Map<string, string>, deps: MapDeps): ProductDetail {
  return {
    ...toCard(d, names, deps),
    skuBase: d.skuBase,
    description: d.description,
    specs: d.specs,
    weightG: d.weightG,
    media: d.media.map((m) => ({ url: deps.media(m.url)!, alt: m.alt, type: m.type, colorSlug: m.colorSlug })),
    variants: d.variants.map((v) => ({ id: v.id, colorSlug: v.colorSlug, size: v.size, sizeSort: v.sizeSort, sku: v.sku, stock: v.stock })),
  };
}

export function toLiveVariant(v: BoLiveVariant, deps: Pick<MapDeps, "media">): LiveVariant {
  return {
    id: v.id,
    productId: v.productId,
    slug: v.productSlug,
    name: v.productName,
    colorName: v.color.name,
    colorSlug: v.color.slug,
    size: v.size,
    sku: v.sku,
    stock: v.stock,
    price: pesos(v.priceCents),
    image: deps.media(v.image),
    weightG: v.weightG,
    box: v.box ? { l: v.box.lengthCm, w: v.box.widthCm, h: v.box.heightCm } : null,
    // Lo que vuelve en `items` se puede vender; lo no vendible viene en `missing` y no aparece acá
    available: true,
  };
}

export function toSettings(s: BoSettings): StoreSettings {
  return { whatsapp: { ...s.whatsapp }, store: { ...s.store }, newsletterPopup: { ...s.newsletterPopup }, tax: { ...s.tax } };
}

// ---------- Contenido (fase C) ----------

/**
 * Banners del home: cada foto tiene que pasar TAL CUAL el filtro de hosts permitidos (si el filtro la cambia por la imagen genérica, el banner no se
 * muestra: un banner con un ícono en lugar de la foto es peor que ninguno). La API manda solo los vigentes.
 */
export function toHomeBanners(list: BoHomeBanner[], deps: Pick<MapDeps, "media">): HomeBanner[] {
  const allowed = (u: string) => (deps.media(u) === u ? u : null);
  return list
    .map((b) => ({ id: b.id, imageDesktop: allowed(b.imageDesktop), imageMobile: allowed(b.imageMobile), videoUrl: null, title: b.title, alt: b.alt || b.title, link: safeLink(b.link) }))
    .filter((b) => b.imageDesktop && b.imageMobile);
}

/** Mensajes de la barra superior */
export const toTopbar = (list: BoTopbarMessage[]): TopbarMessage[] => list.map((m) => ({ id: m.id, text: m.text, link: safeLink(m.link) }));

/** Promos de cuotas: la API ya manda la forma de la tienda (salen de los planes que acepta el checkout). */
export const toPaymentPromos = (list: BoPaymentPromo[]): PaymentPromo[] =>
  list.map((p) => ({ id: p.id, provider: p.provider, label: p.label, installments: p.installments, interestFree: p.interestFree, minAmount: p.minAmount, logoUrl: null, showInTopbar: p.showInTopbar }));

/** Solo links internos o https (lo valida también el back office): cualquier otra cosa se descarta */
export function safeLink(link: string | null | undefined): string | null {
  if (!link) return null;
  return /^(\/(?!\/)[A-Za-z0-9\-._~/?=&%#]*|https:\/\/[^\s"'<>]+)$/.test(link) ? link : null;
}
