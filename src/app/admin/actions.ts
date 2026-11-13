"use server";

import { updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin, signIn, signOut } from "@/lib/admin/auth";
import { cleanProductInput } from "@/lib/admin/product-input";
import * as repo from "@/lib/admin/repo";
import { TAGS } from "@/lib/data/tags";
import { isAllowedMediaUrl } from "@/lib/media";

export type ActionState = { ok: boolean; message: string; errors?: Record<string, string> } | null;

// ---------------------------------------------------------------------------
// Helpers de formulario
// ---------------------------------------------------------------------------
const str = (f: FormData, k: string, max = 300) => String(f.get(k) ?? "").trim().slice(0, max);
const opt = (f: FormData, k: string, max = 300) => str(f, k, max) || null;
const bool = (f: FormData, k: string) => f.get(k) === "on" || f.get(k) === "true";
const int = (f: FormData, k: string) => {
  const n = parseInt(String(f.get(k) ?? "").replace(/[^\d-]/g, ""), 10);
  return Number.isFinite(n) ? n : null;
};
/** datetime-local (hora de Argentina) → ISO */
const date = (f: FormData, k: string) => {
  const v = str(f, k, 30);
  if (!v) return null;
  const d = new Date(`${v.length === 16 ? `${v}:00` : v}-03:00`);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
};
const isLink = (v: string | null) => !v || v.startsWith("/") || /^https:\/\/[^\s]+$/.test(v);
const isMedia = (v: string | null) => isAllowedMediaUrl(v);

function touch(...tags: string[]) {
  tags.forEach((t) => updateTag(t));
}

async function guarded(fn: () => Promise<ActionState>): Promise<ActionState> {
  await requireAdmin();
  try {
    return await fn();
  } catch (e) {
    console.error("[admin]", e);
    return { ok: false, message: "No se pudo guardar. Probá de nuevo." };
  }
}

// ---------------------------------------------------------------------------
// Sesión
// ---------------------------------------------------------------------------
export async function loginAction(_prev: ActionState, f: FormData): Promise<ActionState> {
  const error = await signIn(str(f, "email", 120), String(f.get("password") ?? "").slice(0, 200));
  if (error) return { ok: false, message: error };
  redirect("/admin");
}

export async function logoutAction() {
  await signOut();
  redirect("/admin/ingresar");
}

// ---------------------------------------------------------------------------
// Genéricos: orden, activo, borrar
// ---------------------------------------------------------------------------
type Ordered = "home_banners" | "home_videos" | "payment_promos" | "topbar_messages";
const TAG_OF: Record<Ordered, string> = {
  home_banners: TAGS.home,
  home_videos: TAGS.home,
  payment_promos: TAGS.promos,
  topbar_messages: TAGS.promos,
};
const ORDERED: Ordered[] = ["home_banners", "home_videos", "payment_promos", "topbar_messages"];

export async function reorderAction(table: Ordered, ids: string[]) {
  await requireAdmin();
  if (!ORDERED.includes(table)) return;
  await repo.reorder(table, ids.filter((x) => typeof x === "string").slice(0, 200));
  touch(TAG_OF[table]);
}

export async function toggleAction(table: Ordered, id: string, active: boolean) {
  await requireAdmin();
  if (!ORDERED.includes(table)) return;
  await repo.setActive(table, id, active);
  touch(TAG_OF[table]);
}

export async function deleteAction(table: Ordered, id: string) {
  await requireAdmin();
  if (!ORDERED.includes(table)) return;
  await repo.removeRow(table, id);
  touch(TAG_OF[table]);
}

// ---------------------------------------------------------------------------
// Banners
// ---------------------------------------------------------------------------
export async function saveBannerAction(_prev: ActionState, f: FormData): Promise<ActionState> {
  return guarded(async (): Promise<ActionState> => {
    const b = {
      id: opt(f, "id", 40) ?? undefined,
      imageDesktop: opt(f, "imageDesktop", 500),
      imageMobile: opt(f, "imageMobile", 500),
      videoUrl: opt(f, "videoUrl", 500),
      title: str(f, "title", 120),
      alt: str(f, "alt", 200),
      link: opt(f, "link", 300),
      startsAt: date(f, "startsAt"),
      endsAt: date(f, "endsAt"),
      active: bool(f, "active"),
    };
    const errors: Record<string, string> = {};
    if (!b.title) errors.title = "Poné un título (sirve para ordenarte).";
    if (!b.imageDesktop && !b.videoUrl) errors.imageDesktop = "Subí la imagen de desktop o un video.";
    if (!isMedia(b.imageDesktop) || !isMedia(b.imageMobile) || !isMedia(b.videoUrl)) errors.imageDesktop = "Archivo inválido.";
    if (!isLink(b.link)) errors.link = "El link tiene que empezar con / o https://";
    if (b.startsAt && b.endsAt && b.endsAt <= b.startsAt) errors.endsAt = "La fecha de fin tiene que ser posterior al inicio.";
    if (Object.keys(errors).length) return { ok: false, message: "Revisá los campos marcados.", errors };
    if (!b.alt) b.alt = b.title;
    await repo.saveBanner(b);
    touch(TAGS.home);
    return { ok: true, message: "Banner guardado." };
  });
}

// ---------------------------------------------------------------------------
// Promos de cuotas y mensajes de la barra
// ---------------------------------------------------------------------------
export async function savePromoAction(_prev: ActionState, f: FormData): Promise<ActionState> {
  return guarded(async (): Promise<ActionState> => {
    const p = {
      id: opt(f, "id", 40) ?? undefined,
      provider: str(f, "provider", 40).toLowerCase().replace(/[^a-z0-9_]/g, "_"),
      label: str(f, "label", 60),
      installments: int(f, "installments") ?? 0,
      interestFree: bool(f, "interestFree"),
      minAmount: int(f, "minAmount") ?? 0,
      logoUrl: opt(f, "logoUrl", 500),
      paywayPlanId: opt(f, "paywayPlanId", 60),
      showInTopbar: bool(f, "showInTopbar"),
      startsAt: date(f, "startsAt"),
      endsAt: date(f, "endsAt"),
      active: bool(f, "active"),
    };
    const errors: Record<string, string> = {};
    if (!p.provider) errors.provider = "Elegí el medio de pago.";
    if (!p.label) errors.label = "Poné el nombre que ve el cliente.";
    if (p.installments < 1 || p.installments > 24) errors.installments = "Entre 1 y 24 cuotas.";
    if (p.minAmount < 0) errors.minAmount = "El monto mínimo no puede ser negativo.";
    if (Object.keys(errors).length) return { ok: false, message: "Revisá los campos marcados.", errors };
    await repo.savePromo(p);
    touch(TAGS.promos);
    return { ok: true, message: "Promo guardada. Ya se ve en la barra, las tarjetas y el checkout." };
  });
}

export async function saveTopbarAction(_prev: ActionState, f: FormData): Promise<ActionState> {
  return guarded(async (): Promise<ActionState> => {
    const m = { id: opt(f, "id", 40) ?? undefined, text: str(f, "text", 120), link: opt(f, "link", 300), active: bool(f, "active") };
    if (!m.text) return { ok: false, message: "Escribí el mensaje.", errors: { text: "Escribí el mensaje." } };
    if (!isLink(m.link)) return { ok: false, message: "El link tiene que empezar con / o https://", errors: { link: "Link inválido." } };
    await repo.saveTopbar(m);
    touch(TAGS.promos);
    return { ok: true, message: "Mensaje guardado." };
  });
}

// ---------------------------------------------------------------------------
// Videos
// ---------------------------------------------------------------------------
export async function saveVideoAction(_prev: ActionState, f: FormData): Promise<ActionState> {
  return guarded(async (): Promise<ActionState> => {
    const source = str(f, "source", 20) === "instagram" ? "instagram" : "upload";
    const v = {
      id: opt(f, "id", 40) ?? undefined,
      source,
      mediaUrl: source === "upload" ? opt(f, "mediaUrl", 500) : null,
      instagramUrl: source === "instagram" ? opt(f, "instagramUrl", 300) : null,
      thumbnail: opt(f, "thumbnail", 500),
      caption: opt(f, "caption", 200),
      productId: opt(f, "productId", 40),
      active: bool(f, "active"),
    } as const;
    const errors: Record<string, string> = {};
    if (source === "upload" && !v.mediaUrl) errors.mediaUrl = "Subí el video.";
    if (source === "instagram" && !/^https:\/\/(www\.)?instagram\.com\/(reel|reels|p|tv)\/[\w-]+/i.test(v.instagramUrl ?? "")) {
      errors.instagramUrl = "Pegá el link del reel o post (instagram.com/reel/…).";
    }
    if (!v.productId) errors.productId = "Elegí el producto para el botón “Ver producto”.";
    if (!isMedia(v.mediaUrl) || !isMedia(v.thumbnail)) errors.mediaUrl = "Archivo inválido.";
    if (Object.keys(errors).length) return { ok: false, message: "Revisá los campos marcados.", errors };
    await repo.saveVideo({ ...v, source });
    touch(TAGS.home);
    return { ok: true, message: "Video guardado." };
  });
}

// ---------------------------------------------------------------------------
// Ofertas
// ---------------------------------------------------------------------------
export async function saveOfferAction(_prev: ActionState, f: FormData): Promise<ActionState> {
  return guarded(async (): Promise<ActionState> => {
    const id = str(f, "id", 40);
    const basePrice = int(f, "basePrice") ?? 0;
    const isOffer = bool(f, "isOffer");
    const mode = str(f, "mode", 10);
    let salePrice: number | null = null;
    if (isOffer) {
      if (mode === "pct") {
        const pct = int(f, "pct") ?? 0;
        if (pct < 1 || pct > 90) return { ok: false, message: "El descuento va de 1% a 90%.", errors: { pct: "Entre 1 y 90." } };
        salePrice = Math.round((basePrice * (100 - pct)) / 100 / 100) * 100;
      } else {
        salePrice = int(f, "salePrice");
        if (!salePrice || salePrice <= 0 || salePrice >= basePrice) {
          return { ok: false, message: "El precio de oferta tiene que ser menor al precio normal.", errors: { salePrice: "Menor al precio normal." } };
        }
      }
    }
    const saleStartsAt = date(f, "saleStartsAt");
    const saleEndsAt = date(f, "saleEndsAt");
    if (saleStartsAt && saleEndsAt && saleEndsAt <= saleStartsAt) return { ok: false, message: "La fecha de fin tiene que ser posterior al inicio." };
    await repo.setOffer(id, { isOffer, salePrice, saleStartsAt, saleEndsAt });
    touch(TAGS.products, TAGS.home);
    return { ok: true, message: isOffer ? "Oferta guardada." : "Oferta quitada." };
  });
}

// ---------------------------------------------------------------------------
// Productos
// ---------------------------------------------------------------------------
export async function saveProductAction(_prev: ActionState, f: FormData): Promise<ActionState> {
  await requireAdmin();
  let raw: unknown;
  try {
    raw = JSON.parse(String(f.get("payload") ?? "{}"));
  } catch {
    return { ok: false, message: "Datos inválidos." };
  }
  const isNew = !(raw as { id?: string })?.id;
  const res = await cleanProductInput(raw);
  if (!res.ok) return { ok: false, message: "Revisá los campos marcados.", errors: res.errors };

  try {
    const id = await repo.saveProduct(res.product);
    touch(TAGS.products, TAGS.product(res.product.slug), TAGS.home);
    if (isNew) redirect(`/admin/productos/${id}?nuevo=1`);
    return { ok: true, message: "Producto guardado." };
  } catch (e) {
    if (e && typeof e === "object" && "digest" in e) throw e; // redirect
    console.error("[admin producto]", e);
    return { ok: false, message: "No se pudo guardar el producto." };
  }
}

export async function toggleProductAction(id: string, active: boolean) {
  await requireAdmin();
  await repo.setProductActive(id, active);
  touch(TAGS.products, TAGS.home);
}

// ---------------------------------------------------------------------------
// Envíos
// ---------------------------------------------------------------------------
export async function saveShippingAction(_prev: ActionState, f: FormData): Promise<ActionState> {
  return guarded(async (): Promise<ActionState> => {
    const originCp = str(f, "originCp", 4);
    const box = { weightG: int(f, "weightG") ?? 0, l: int(f, "l") ?? 0, w: int(f, "w") ?? 0, h: int(f, "h") ?? 0 };
    const cacheHours = int(f, "cacheHours") ?? 6;
    if (!/^\d{4}$/.test(originCp)) return { ok: false, message: "El CP de origen son 4 números.", errors: { originCp: "4 números." } };
    if (box.weightG <= 0 || box.l <= 0 || box.w <= 0 || box.h <= 0) return { ok: false, message: "Completá peso y medidas de la caja estándar." };

    let rates: Omit<repo.AdminFallbackRate, "id">[] = [];
    try {
      rates = (JSON.parse(String(f.get("rates") ?? "[]")) as repo.AdminFallbackRate[]).map((r) => ({
        zone: String(r.zone).trim().slice(0, 60),
        cpFrom: Math.round(Number(r.cpFrom)),
        cpTo: Math.round(Number(r.cpTo)),
        service: r.service === "sucursal" ? "sucursal" : "domicilio",
        price: Math.round(Number(r.price)),
        etaDays: Number(r.etaDays) > 0 ? Math.round(Number(r.etaDays)) : null,
      }));
    } catch {
      return { ok: false, message: "Tarifas inválidas." };
    }
    const bad = rates.find((r) => !r.zone || !(r.cpFrom >= 1000 && r.cpTo <= 9999 && r.cpFrom <= r.cpTo) || !(r.price >= 0));
    if (bad) return { ok: false, message: `Revisá la tarifa “${bad.zone || "sin nombre"}”: CP entre 1000 y 9999 y precio válido.` };

    await repo.saveSetting("shipping", { originCp, defaultBox: box, cacheHours: Math.min(Math.max(cacheHours, 1), 48) }, false);
    await repo.replaceFallbackRates(rates);
    return { ok: true, message: "Envíos guardados." };
  });
}

// ---------------------------------------------------------------------------
// Configuración
// ---------------------------------------------------------------------------
export async function saveSettingsAction(_prev: ActionState, f: FormData): Promise<ActionState> {
  return guarded(async (): Promise<ActionState> => {
    const number = str(f, "whatsappNumber", 20).replace(/\D/g, "");
    if (number.length < 10) return { ok: false, message: "Revisá el WhatsApp: con 549 + característica + número.", errors: { whatsappNumber: "Ej: 5492657123456" } };
    const factor = Number(str(f, "taxFactor", 6).replace(",", "."));
    if (!(factor >= 1 && factor <= 2)) return { ok: false, message: "El factor de impuestos va entre 1 y 2 (ej. 1,21).", errors: { taxFactor: "Ej: 1,21" } };

    await repo.saveSetting("whatsapp", { number, display: str(f, "whatsappDisplay", 30) || number }, true);
    await repo.saveSetting(
      "store",
      {
        address: str(f, "address", 80),
        city: str(f, "city", 60),
        province: str(f, "province", 40),
        hours: str(f, "hours", 60),
        hoursDetail: str(f, "hoursDetail", 120),
        instagram: str(f, "instagram", 40).replace(/^@/, ""),
        email: str(f, "email", 120),
      },
      true,
    );
    await repo.saveSetting(
      "newsletter_popup",
      {
        title: str(f, "popupTitle", 60) || "Enterate antes que nadie",
        text: str(f, "popupText", 120) || "Recibí ofertas y lanzamientos en tu mail",
        delaySeconds: Math.min(Math.max(int(f, "popupDelay") ?? 5, 2), 60),
        enabled: bool(f, "popupEnabled"),
      },
      true,
    );
    await repo.saveSetting("tax", { factor, label: "Precio sin impuestos nacionales" }, true);
    touch(TAGS.settings);
    return { ok: true, message: "Configuración guardada." };
  });
}

// ---------------------------------------------------------------------------
// Pedidos
// ---------------------------------------------------------------------------
const STATUSES = ["pendiente", "pagado", "enviado", "entregado", "cancelado"] as const;

export async function updateOrderAction(_prev: ActionState, f: FormData): Promise<ActionState> {
  return guarded(async (): Promise<ActionState> => {
    const status = str(f, "status", 20) as (typeof STATUSES)[number];
    if (!STATUSES.includes(status)) return { ok: false, message: "Estado inválido." };
    const trackingCode = opt(f, "trackingCode", 60);
    if (status === "enviado" && !trackingCode) return { ok: false, message: "Para marcar como enviado cargá el número de seguimiento.", errors: { trackingCode: "Obligatorio al enviar." } };
    await repo.updateOrder(str(f, "id", 40), { status, trackingCode });
    return { ok: true, message: "Pedido actualizado." };
  });
}
