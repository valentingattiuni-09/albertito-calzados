import "server-only";
import type { NavSection, ProductCard, ProductDetail, StoreSettings } from "@/lib/data/types";
import type { LiveVariant } from "@/lib/orders/live";
import { safeMediaUrl } from "@/lib/media";
import { normalize } from "@/lib/search/normalize";
import { backoffice } from "./client";
import type { BoCatalogPage, BoDetail, BoLookup, BoNavSection, BoSettings } from "./dto";
import { BackofficeNotFoundError } from "./http";
import { categoryNames, toCard, toDetail, toLiveVariant, toNavigation, toSettings } from "./map";

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
