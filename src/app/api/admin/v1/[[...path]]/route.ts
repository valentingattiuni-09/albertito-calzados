import { revalidateTag } from "next/cache";
import { NextResponse, type NextRequest } from "next/server";
import { getAdmin, isBackofficeToken, runAsBackoffice } from "@/lib/admin/auth";
import { importProductsCsv } from "@/lib/admin/csv-import";
import { cleanProductInput } from "@/lib/admin/product-input";
import * as repo from "@/lib/admin/repo";
import { TABLE_TAGS, TAGS } from "@/lib/data/tags";
import { isAllowedMediaUrl, MEDIA_URL_HINT } from "@/lib/media";

/**
 * API REST del back office. Documentación: docs/API.md
 * Autenticación: `Authorization: Bearer <BACKOFFICE_API_TOKEN>` (o sesión de admin del panel).
 */
type Ctx = { params: Promise<{ path?: string[] }> };
type Handler = (req: NextRequest, args: string[]) => Promise<Response>;

const json = (data: unknown, status = 200) => NextResponse.json(data, { status, headers: { "Cache-Control": "no-store" } });
const fail = (status: number, error: string, details?: unknown) => json({ error, details }, status);
const touch = (...tags: string[]) => tags.forEach((t) => revalidateTag(t, { expire: 0 }));

async function body<T>(req: NextRequest): Promise<T | null> {
  try {
    return (await req.json()) as T;
  } catch {
    return null;
  }
}

const str = (v: unknown, max = 300) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const optStr = (v: unknown, max = 300) => str(v, max) || null;
const optDate = (v: unknown) => (typeof v === "string" && !Number.isNaN(Date.parse(v)) ? new Date(v).toISOString() : null);
const isLink = (v: string | null) => !v || v.startsWith("/") || /^https:\/\/\S+$/.test(v);

// ---------------------------------------------------------------------------
// Rutas
// ---------------------------------------------------------------------------
const routes: Record<string, Partial<Record<"GET" | "POST" | "PUT" | "PATCH" | "DELETE", Handler>>> = {
  categories: {
    GET: async () => json({ data: await repo.listCategories() }),
  },

  products: {
    GET: async (_req, [id]) => {
      if (!id) return json({ data: await repo.listProducts() });
      const p = await repo.getProduct(id);
      return p ? json({ data: p }) : fail(404, "Producto no encontrado");
    },
    POST: async (req, [sub]) => {
      if (sub === "import") {
        const text = await req.text();
        const dryRun = req.nextUrl.searchParams.get("dryRun") === "1";
        if (text.length > 5_000_000) return fail(413, "Archivo demasiado grande (máx. 5 MB)");
        const report = await importProductsCsv(text, dryRun);
        if (!dryRun && report.created + report.updated > 0) touch(TAGS.products, TAGS.home);
        return json({ data: report }, report.rowErrors.length && report.products.length === 0 ? 422 : 200);
      }
      const input = await body<Record<string, unknown>>(req);
      const res = await cleanProductInput({ ...(input ?? {}), id: "" });
      if (!res.ok) return fail(422, "Datos inválidos", res.errors);
      const id = await repo.saveProduct(res.product);
      touch(TAGS.products, TAGS.home);
      return json({ data: await repo.getProduct(id) }, 201);
    },
    PUT: async (req, [id]) => {
      if (!id) return fail(400, "Falta el id");
      if (!(await repo.getProduct(id))) return fail(404, "Producto no encontrado");
      const input = await body<Record<string, unknown>>(req);
      const res = await cleanProductInput({ ...(input ?? {}), id });
      if (!res.ok) return fail(422, "Datos inválidos", res.errors);
      await repo.saveProduct(res.product);
      touch(TAGS.products, TAGS.product(res.product.slug), TAGS.home);
      return json({ data: await repo.getProduct(id) });
    },
    PATCH: async (req, [id]) => {
      if (!id || !(await repo.getProduct(id))) return fail(404, "Producto no encontrado");
      const b = (await body<{ active?: boolean; offer?: { isOffer: boolean; salePrice?: number | null; startsAt?: string | null; endsAt?: string | null } }>(req)) ?? {};
      if (typeof b.active === "boolean") await repo.setProductActive(id, b.active);
      if (b.offer) {
        const p = (await repo.getProduct(id))!;
        const sale = Math.round(Number(b.offer.salePrice));
        if (b.offer.isOffer && !(sale > 0 && sale < p.basePrice)) return fail(422, "salePrice tiene que ser menor al precio base");
        await repo.setOffer(id, {
          isOffer: b.offer.isOffer,
          salePrice: b.offer.isOffer ? sale : null,
          saleStartsAt: optDate(b.offer.startsAt),
          saleEndsAt: optDate(b.offer.endsAt),
        });
      }
      touch(TAGS.products, TAGS.home);
      return json({ data: await repo.getProduct(id) });
    },
  },

  stock: {
    // [{ sku, stock }] — actualización masiva de stock
    PATCH: async (req) => {
      const items = await body<{ sku: string; stock: number }[]>(req);
      if (!Array.isArray(items) || items.length === 0 || items.length > 2000) return fail(400, "Mandá un array de { sku, stock } (máx. 2000)");
      const clean = items.map((i) => ({ sku: str(i?.sku, 60), stock: Math.max(0, Math.round(Number(i?.stock) || 0)) })).filter((i) => i.sku);
      const res = await repo.setStockBySku(clean);
      touch(TAGS.products);
      return json({ data: res });
    },
  },

  banners: {
    GET: async () => json({ data: await repo.listBanners() }),
    POST: async (req) => saveBanner(req),
    PUT: async (req, [id]) => (id ? saveBanner(req, id) : fail(400, "Falta el id")),
    DELETE: async (_req, [id]) => {
      if (!id) return fail(400, "Falta el id");
      await repo.removeRow("home_banners", id);
      touch(TAGS.home);
      return json({ ok: true });
    },
  },

  promos: {
    GET: async () => json({ data: await repo.listPromos() }),
    POST: async (req) => savePromo(req),
    PUT: async (req, [id]) => (id ? savePromo(req, id) : fail(400, "Falta el id")),
    DELETE: async (_req, [id]) => {
      if (!id) return fail(400, "Falta el id");
      await repo.removeRow("payment_promos", id);
      touch(TAGS.promos);
      return json({ ok: true });
    },
  },

  videos: {
    GET: async () => json({ data: await repo.listVideos() }),
    POST: async (req) => saveVideo(req),
    PUT: async (req, [id]) => (id ? saveVideo(req, id) : fail(400, "Falta el id")),
    DELETE: async (_req, [id]) => {
      if (!id) return fail(400, "Falta el id");
      await repo.removeRow("home_videos", id);
      touch(TAGS.home);
      return json({ ok: true });
    },
  },

  shipping: {
    GET: async (_req, [what]) => {
      if (what === "rates") return json({ data: await repo.listFallbackRates() });
      if (what === "config") return json({ data: await repo.getSetting("shipping") });
      return fail(404, "Usá /shipping/rates o /shipping/config");
    },
    PUT: async (req, [what]) => {
      if (what === "rates") {
        const rates = await body<repo.AdminFallbackRate[]>(req);
        if (!Array.isArray(rates)) return fail(400, "Mandá un array de tarifas");
        const clean = rates.map((r) => ({
          zone: str(r.zone, 60),
          cpFrom: Math.round(Number(r.cpFrom)),
          cpTo: Math.round(Number(r.cpTo)),
          service: r.service === "sucursal" ? ("sucursal" as const) : ("domicilio" as const),
          price: Math.round(Number(r.price)),
          etaDays: Number(r.etaDays) > 0 ? Math.round(Number(r.etaDays)) : null,
        }));
        if (clean.some((r) => !r.zone || !(r.cpFrom >= 1000 && r.cpTo <= 9999 && r.cpFrom <= r.cpTo) || !(r.price >= 0))) {
          return fail(422, "Cada tarifa necesita zone, cpFrom/cpTo entre 1000 y 9999 y price");
        }
        await repo.replaceFallbackRates(clean);
        return json({ data: await repo.listFallbackRates() });
      }
      if (what === "config") {
        const c = await body<{ originCp: string; defaultBox: { weightG: number; l: number; w: number; h: number }; cacheHours?: number }>(req);
        if (!c || !/^\d{4}$/.test(String(c.originCp)) || !c.defaultBox) return fail(422, "originCp (4 números) y defaultBox son obligatorios");
        await repo.saveSetting("shipping", { originCp: c.originCp, defaultBox: c.defaultBox, cacheHours: c.cacheHours ?? 6 }, false);
        return json({ data: await repo.getSetting("shipping") });
      }
      return fail(404, "Usá /shipping/rates o /shipping/config");
    },
  },

  orders: {
    GET: async (req, [number]) => {
      if (!number) return json({ data: await repo.listOrders(req.nextUrl.searchParams.get("status") ?? undefined) });
      const o = await repo.getOrderAdmin(number);
      if (!o) return fail(404, "Pedido no encontrado");
      const { accessToken: _t, ...safe } = o;
      void _t;
      return json({ data: safe });
    },
    PATCH: async (req, [number]) => {
      const o = number ? await repo.getOrderAdmin(number) : null;
      if (!o) return fail(404, "Pedido no encontrado");
      const b = (await body<{ status?: string; trackingCode?: string | null }>(req)) ?? {};
      const statuses = ["pendiente", "pagado", "enviado", "entregado", "cancelado"] as const;
      const status = (b.status ?? o.status) as (typeof statuses)[number];
      if (!statuses.includes(status)) return fail(422, `status tiene que ser uno de: ${statuses.join(", ")}`);
      const trackingCode = b.trackingCode === undefined ? o.trackingCode : optStr(b.trackingCode, 60);
      if (status === "enviado" && !trackingCode) return fail(422, "Para marcar enviado hace falta trackingCode");
      await repo.updateOrder(o.id, { status, trackingCode });
      return json({ data: { number: o.number, status, trackingCode } });
    },
  },

  newsletter: {
    GET: async () => json({ data: await repo.listSubscribers() }),
  },

  // Fuerza la actualización de la tienda: { tables: ["products"] } o { tags: ["home"] }
  revalidate: {
    POST: async (req) => {
      const b = (await body<{ tables?: string[]; tags?: string[] }>(req)) ?? {};
      const tags = new Set<string>([...(b.tags ?? []).filter((t) => typeof t === "string"), ...(b.tables ?? []).flatMap((t) => TABLE_TAGS[t] ?? [])]);
      if (tags.size === 0) Object.values(TAGS).forEach((t) => typeof t === "string" && tags.add(t));
      touch(...tags);
      return json({ revalidated: [...tags] });
    },
  },
};

async function saveBanner(req: NextRequest, id?: string) {
  const b = (await body<Record<string, unknown>>(req)) ?? {};
  const banner = {
    id,
    imageDesktop: optStr(b.imageDesktop, 500),
    imageMobile: optStr(b.imageMobile, 500),
    videoUrl: optStr(b.videoUrl, 500),
    title: str(b.title, 120),
    alt: str(b.alt, 200) || str(b.title, 120),
    link: optStr(b.link),
    startsAt: optDate(b.startsAt),
    endsAt: optDate(b.endsAt),
    active: b.active === undefined ? true : Boolean(b.active),
  };
  if (!banner.title || (!banner.imageDesktop && !banner.videoUrl)) return fail(422, "title e imageDesktop (o videoUrl) son obligatorios");
  if (!isLink(banner.link)) return fail(422, "link tiene que empezar con / o https://");
  if (![banner.imageDesktop, banner.imageMobile, banner.videoUrl].every(isAllowedMediaUrl)) return fail(422, MEDIA_URL_HINT);
  await repo.saveBanner(banner);
  touch(TAGS.home);
  return json({ data: await repo.listBanners() }, id ? 200 : 201);
}

async function savePromo(req: NextRequest, id?: string) {
  const b = (await body<Record<string, unknown>>(req)) ?? {};
  const promo = {
    id,
    provider: str(b.provider, 40).toLowerCase().replace(/[^a-z0-9_]/g, "_"),
    label: str(b.label, 60),
    installments: Math.round(Number(b.installments)),
    interestFree: b.interestFree === undefined ? true : Boolean(b.interestFree),
    minAmount: Math.max(0, Math.round(Number(b.minAmount) || 0)),
    logoUrl: optStr(b.logoUrl, 500),
    paywayPlanId: optStr(b.paywayPlanId, 60),
    showInTopbar: b.showInTopbar === undefined ? true : Boolean(b.showInTopbar),
    startsAt: optDate(b.startsAt),
    endsAt: optDate(b.endsAt),
    active: b.active === undefined ? true : Boolean(b.active),
  };
  if (!isAllowedMediaUrl(promo.logoUrl)) return fail(422, MEDIA_URL_HINT);
  if (!promo.provider || !promo.label || !(promo.installments >= 1 && promo.installments <= 24)) return fail(422, "provider, label e installments (1-24) son obligatorios");
  await repo.savePromo(promo);
  touch(TAGS.promos);
  return json({ data: await repo.listPromos() }, id ? 200 : 201);
}

async function saveVideo(req: NextRequest, id?: string) {
  const b = (await body<Record<string, unknown>>(req)) ?? {};
  const source = b.source === "instagram" ? ("instagram" as const) : ("upload" as const);
  const video = {
    id,
    source,
    mediaUrl: source === "upload" ? optStr(b.mediaUrl, 500) : null,
    instagramUrl: source === "instagram" ? optStr(b.instagramUrl, 300) : null,
    thumbnail: optStr(b.thumbnail, 500),
    caption: optStr(b.caption, 200),
    productId: optStr(b.productId, 40),
    active: b.active === undefined ? true : Boolean(b.active),
  };
  if (source === "upload" && !video.mediaUrl) return fail(422, "mediaUrl es obligatorio con source=upload");
  if (source === "instagram" && !/^https:\/\/(www\.)?instagram\.com\/(reel|reels|p|tv)\/[\w-]+/i.test(video.instagramUrl ?? "")) return fail(422, "instagramUrl inválido");
  if (!video.productId) return fail(422, "productId es obligatorio");
  if (![video.mediaUrl, video.thumbnail].every(isAllowedMediaUrl)) return fail(422, MEDIA_URL_HINT);
  await repo.saveVideo(video);
  touch(TAGS.home);
  return json({ data: await repo.listVideos() }, id ? 200 : 201);
}

// ---------------------------------------------------------------------------
// Entrada
// ---------------------------------------------------------------------------
async function handle(req: NextRequest, ctx: Ctx) {
  const [resource, ...args] = (await ctx.params).path ?? [];
  const method = req.method as keyof (typeof routes)[string];
  const handler = resource ? routes[resource]?.[method] : undefined;

  const viaToken = isBackofficeToken(req.headers.get("authorization"));
  if (!viaToken && !(await getAdmin())) return fail(401, "No autorizado");
  if (!resource) return json({ resources: Object.keys(routes), docs: "docs/API.md" });
  if (!handler) return fail(routes[resource] ? 405 : 404, routes[resource] ? "Método no permitido" : "Recurso inexistente");

  try {
    return viaToken ? await runAsBackoffice(() => handler(req, args)) : await handler(req, args);
  } catch (e) {
    console.error(`[api admin] ${method} ${resource}`, e);
    return fail(500, "Error interno");
  }
}

export const GET = handle;
export const POST = handle;
export const PUT = handle;
export const PATCH = handle;
export const DELETE = handle;
