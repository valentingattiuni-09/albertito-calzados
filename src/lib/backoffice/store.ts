import "server-only";
import type { NavSection, PaymentPromo, ProductCard, ProductDetail, StoreSettings, TopbarMessage } from "@/lib/data/types";
import type { LiveVariant } from "@/lib/orders/live";
import { safeMediaUrl } from "@/lib/media";
import { normalize } from "@/lib/search/normalize";
import { backoffice } from "./client";
import type { BoCatalogPage, BoDetail, BoHomeBanner, BoLookup, BoNavSection, BoPaymentPromo, BoSettings, BoTopbarMessage } from "./dto";
import { BackofficeNotFoundError } from "./http";
import { categoryNames, toCard, toDetail, toHomeBanners, toLiveVariant, toNavigation, toPaymentPromos, toSettings, toTopbar } from "./map";
import type { HomeBanner } from "@/lib/data/home";

const deps = { normalize, media: safeMediaUrl };

export async function boNavigation(): Promise<NavSection[]> {
  return toNavigation(await backoffice().get<BoNavSection[]>("/store/navigation"), deps);
}

/** Todo el catálogo, siguiendo el cursor (páginas de 200). */
export async function boCatalog(nav: NavSection[]): Promise<ProductCard[]> {
  const names = categoryNames(nav);
  const out: ProductCard[] = [];
  let cursor: string | null = null;
  for (let i = 0; i < 100; i++) {
    const page: BoCatalogPage = await backoffice().get<BoCatalogPage>(`/store/catalog?limit=200${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ""}`);
    out.push(...page.items.map((c) => toCard(c, names, deps)));
    cursor = page.nextCursor;
    if (!cursor) break;
  }
  return out;
}

export async function boProduct(slug: string, nav: NavSection[]): Promise<ProductDetail | null> {
  try {
    return toDetail(await backoffice().get<BoDetail>(`/store/products/${encodeURIComponent(slug)}`), categoryNames(nav), deps);
  } catch (e) {
    if (e instanceof BackofficeNotFoundError) return null;
    throw e;
  }
}

/** Precio, stock, peso y caja EN VIVO (sin caché ni respaldo). */
export async function boLiveVariants(ids: string[]): Promise<Map<string, LiveVariant>> {
  const out = new Map<string, LiveVariant>();
  if (ids.length === 0) return out;
  const res = await backoffice().post<BoLookup>("/store/variants/lookup", { ids });
  for (const v of res.items) out.set(v.id, toLiveVariant(v, deps));
  return out;
}

export async function boSettings(): Promise<StoreSettings> {
  return toSettings(await backoffice().get<BoSettings>("/store/settings"));
}

// ---------- Contenido (fase C): decorativo, así que si la API falla y no hay copia, la tienda sigue sin él ----------

async function decorative<T>(what: string, read: () => Promise<T[]>): Promise<T[]> {
  try {
    return await read();
  } catch (e) {
    if (process.env.NEXT_PHASE === "phase-production-build") throw e; // en el build lo maneja orEmptyDuringBuild
    console.warn(`[back office] ${what}: ${(e as Error).message}. Se muestra sin ${what}.`);
    return [];
  }
}

export const boHomeBanners = (): Promise<HomeBanner[]> => decorative("banners", async () => toHomeBanners(await backoffice().get<BoHomeBanner[]>("/store/home-banners"), deps));
export const boTopbar = (): Promise<TopbarMessage[]> => decorative("barra superior", async () => toTopbar(await backoffice().get<BoTopbarMessage[]>("/store/topbar")));
export const boPaymentPromos = (): Promise<PaymentPromo[]> => decorative("promos de cuotas", async () => toPaymentPromos(await backoffice().get<BoPaymentPromo[]>("/store/payment-promos")));
