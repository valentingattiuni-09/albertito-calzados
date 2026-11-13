import "server-only";
import {
  demoBanners,
  demoCategories,
  demoCoupons,
  demoFallbackRates,
  demoProducts,
  demoPromos,
  demoSettings,
  demoTopbarMessages,
  demoVideos,
  type DemoBanner,
  type DemoCategory,
  type DemoProduct,
  type DemoPromo,
} from "./catalog";

/**
 * "Base de datos" del modo demo: una copia editable del catálogo de ejemplo, en memoria del servidor.
 * La tienda y el panel /admin leen y escriben acá cuando no hay Supabase configurado,
 * así el panel se puede probar completo. Se reinicia al reiniciar el servidor.
 */
export type DbCategory = DemoCategory & { active: boolean; bannerUrl: string | null; bannerMobileUrl: string | null };
export type DbProduct = DemoProduct & {
  active: boolean;
  saleStartsAt: string | null;
  saleEndsAt: string | null;
  box: { l: number; w: number; h: number } | null;
};
export type DbPromo = DemoPromo & { startsAt: string | null; endsAt: string | null; paywayPlanId: string | null };
export type DbBanner = DemoBanner & { startsAt: string | null; endsAt: string | null; active: boolean };
export type DbVideo = {
  id: string;
  source: "upload" | "instagram";
  mediaUrl: string | null;
  instagramUrl: string | null;
  thumbnail: string | null;
  caption: string | null;
  productId: string | null;
  order: number;
  active: boolean;
};
export type DbTopbar = { id: string; text: string; link: string | null; order: number; active: boolean };
export type DbFallbackRate = { id: string; zone: string; cpFrom: number; cpTo: number; service: "domicilio" | "sucursal"; price: number; etaDays: number | null };
export type DbCoupon = { code: string; type: "percent" | "fixed"; value: number; minAmount: number };
export type DbSubscriber = { id: string; email: string; preference: string | null; birthDate: string | null; source: string; createdAt: string };

export type DemoDb = {
  categories: DbCategory[];
  products: DbProduct[];
  promos: DbPromo[];
  topbar: DbTopbar[];
  banners: DbBanner[];
  videos: DbVideo[];
  settings: Record<string, { value: unknown; isPublic: boolean }>;
  fallbackRates: DbFallbackRate[];
  coupons: DbCoupon[];
  subscribers: DbSubscriber[];
};

const g = globalThis as unknown as { __albertitoDemoDb?: DemoDb };

export function demoDb(): DemoDb {
  if (!g.__albertitoDemoDb) {
    const productId = new Map(demoProducts.map((p) => [p.slug, p.id]));
    g.__albertitoDemoDb = structuredClone({
      categories: demoCategories.map((c) => ({ ...c, active: true, bannerUrl: null, bannerMobileUrl: null })),
      products: demoProducts.map((p) => ({ ...p, active: true, saleStartsAt: null, saleEndsAt: null, box: null })),
      promos: demoPromos.map((p) => ({ ...p, startsAt: null, endsAt: null, paywayPlanId: null })),
      topbar: demoTopbarMessages.map((m) => ({ ...m })),
      banners: demoBanners.map((b) => ({ ...b, startsAt: null, endsAt: null, active: true })),
      videos: demoVideos.map((v) => ({
        id: v.id,
        source: v.source,
        mediaUrl: v.mediaUrl,
        instagramUrl: v.instagramUrl,
        thumbnail: v.thumbnail,
        caption: v.caption,
        productId: productId.get(v.productSlug) ?? null,
        order: v.order,
        active: true,
      })),
      settings: demoSettings,
      fallbackRates: demoFallbackRates,
      coupons: demoCoupons,
      subscribers: [],
    } satisfies DemoDb);
  }
  return g.__albertitoDemoDb!;
}

/** Vigente según fechas (null = sin límite). */
export function withinDates(startsAt: string | null, endsAt: string | null, now = Date.now()): boolean {
  return (!startsAt || Date.parse(startsAt) <= now) && (!endsAt || Date.parse(endsAt) > now);
}

/** Precio de oferta vigente para un producto del modo demo. */
export function demoSaleActive(p: DbProduct): boolean {
  return p.isOffer && p.salePrice !== null && p.salePrice < p.basePrice && withinDates(p.saleStartsAt, p.saleEndsAt);
}
