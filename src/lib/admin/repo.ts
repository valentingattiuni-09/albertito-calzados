import "server-only";
import { randomUUID } from "node:crypto";
import { requireAdmin } from "@/lib/admin/auth";
import { demoDb } from "@/lib/demo/db";
import { getOrderByNumberUnsafe, type OrderView } from "@/lib/orders/orders";
import { hasSupabase, serviceClient } from "@/lib/supabase/clients";

/**
 * Lecturas y escrituras del panel /admin. Mismo contrato con Supabase (service role, después de
 * verificar que quien llama es admin) o con la base demo en memoria.
 */
const db = () => serviceClient();
const nn = <T>(v: T | undefined | null): T | null => (v === undefined ? null : v);

// ---------------------------------------------------------------------------
// Tipos del panel
// ---------------------------------------------------------------------------
export type AdminBanner = {
  id: string;
  imageDesktop: string | null;
  imageMobile: string | null;
  videoUrl: string | null;
  title: string;
  alt: string;
  link: string | null;
  order: number;
  startsAt: string | null;
  endsAt: string | null;
  active: boolean;
};

export type AdminPromo = {
  id: string;
  provider: string;
  label: string;
  installments: number;
  interestFree: boolean;
  minAmount: number;
  logoUrl: string | null;
  paywayPlanId: string | null;
  showInTopbar: boolean;
  startsAt: string | null;
  endsAt: string | null;
  active: boolean;
  order: number;
};

export type AdminTopbar = { id: string; text: string; link: string | null; order: number; active: boolean };

export type AdminVideo = {
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

export type AdminCategory = { id: string; parentId: string | null; name: string; slug: string; kind: string; order: number; active: boolean };

export type AdminProductSummary = {
  id: string;
  name: string;
  slug: string;
  line: "diario" | "seleccion";
  basePrice: number;
  salePrice: number | null;
  isOffer: boolean;
  saleStartsAt: string | null;
  saleEndsAt: string | null;
  isNew: boolean;
  isFeatured: boolean;
  active: boolean;
  image: string | null;
  stock: number;
  categoryIds: string[];
};

export type AdminColor = { id: string; name: string; slug: string; hex: string; images: { url: string; alt: string }[] };
export type AdminVariant = { id: string; colorId: string; size: string; sku: string; stock: number };

export type AdminProduct = Omit<AdminProductSummary, "image" | "stock"> & {
  skuBase: string | null;
  description: string;
  specs: Record<string, string>;
  weightG: number | null;
  box: { l: number; w: number; h: number } | null;
  colors: AdminColor[];
  variants: AdminVariant[];
};

export type AdminFallbackRate = { id: string; zone: string; cpFrom: number; cpTo: number; service: "domicilio" | "sucursal"; price: number; etaDays: number | null };
export type AdminSubscriber = { id: string; email: string; preference: string | null; birthDate: string | null; source: string; createdAt: string };
export type AdminOrderRow = {
  id: string;
  number: string;
  createdAt: string;
  customer: string;
  email: string;
  total: number;
  status: OrderView["status"];
  paymentStatus: OrderView["paymentStatus"];
  shipping: string;
  trackingCode: string | null;
  items: number;
};

// ---------------------------------------------------------------------------
// Orden y activo (genérico por tabla)
// ---------------------------------------------------------------------------
type OrderedTable = "home_banners" | "home_videos" | "payment_promos" | "topbar_messages";
const demoTable = { home_banners: "banners", home_videos: "videos", payment_promos: "promos", topbar_messages: "topbar" } as const;

export async function reorder(table: OrderedTable, ids: string[]) {
  if (!hasSupabase) {
    const rows = demoDb()[demoTable[table]] as { id: string; order: number }[];
    ids.forEach((id, i) => {
      const r = rows.find((x) => x.id === id);
      if (r) r.order = i;
    });
    return;
  }
  await Promise.all(ids.map((id, i) => db().from(table).update({ order: i }).eq("id", id)));
}

export async function setActive(table: OrderedTable, id: string, active: boolean) {
  if (!hasSupabase) {
    const r = (demoDb()[demoTable[table]] as { id: string; active: boolean }[]).find((x) => x.id === id);
    if (r) r.active = active;
    return;
  }
  const { error } = await db().from(table).update({ active }).eq("id", id);
  if (error) throw error;
}

export async function removeRow(table: OrderedTable, id: string) {
  if (!hasSupabase) {
    const key = demoTable[table];
    const rows = demoDb()[key] as { id: string }[];
    const i = rows.findIndex((x) => x.id === id);
    if (i >= 0) rows.splice(i, 1);
    return;
  }
  const { error } = await db().from(table).delete().eq("id", id);
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// Banners
// ---------------------------------------------------------------------------
export async function listBanners(): Promise<AdminBanner[]> {
  if (!hasSupabase) {
    return [...demoDb().banners]
      .sort((a, b) => a.order - b.order)
      .map((b) => ({ ...b, imageDesktop: b.imageDesktop, imageMobile: b.imageMobile }));
  }
  const { data, error } = await db().from("home_banners").select("*").order("order");
  if (error) throw error;
  return data.map((b) => ({
    id: b.id,
    imageDesktop: b.image_desktop,
    imageMobile: b.image_mobile,
    videoUrl: b.video_url,
    title: b.title,
    alt: b.alt,
    link: b.link,
    order: b.order,
    startsAt: b.starts_at,
    endsAt: b.ends_at,
    active: b.active,
  }));
}

export async function saveBanner(b: Omit<AdminBanner, "id" | "order"> & { id?: string }) {
  if (!hasSupabase) {
    const rows = demoDb().banners;
    const existing = b.id ? rows.find((x) => x.id === b.id) : undefined;
    const row = {
      imageDesktop: b.imageDesktop ?? "",
      imageMobile: b.imageMobile ?? b.imageDesktop ?? "",
      videoUrl: b.videoUrl,
      title: b.title,
      alt: b.alt,
      link: b.link ?? "",
      startsAt: b.startsAt,
      endsAt: b.endsAt,
      active: b.active,
    };
    if (existing) Object.assign(existing, row);
    else rows.push({ id: randomUUID(), order: rows.length, ...row });
    return;
  }
  const row = {
    image_desktop: b.imageDesktop,
    image_mobile: b.imageMobile,
    video_url: b.videoUrl,
    title: b.title,
    alt: b.alt,
    link: b.link,
    starts_at: b.startsAt,
    ends_at: b.endsAt,
    active: b.active,
  };
  if (b.id) {
    const { error } = await db().from("home_banners").update(row).eq("id", b.id);
    if (error) throw error;
  } else {
    const { count } = await db().from("home_banners").select("id", { count: "exact", head: true });
    const { error } = await db().from("home_banners").insert({ ...row, order: count ?? 0 });
    if (error) throw error;
  }
}

// ---------------------------------------------------------------------------
// Promos de cuotas y mensajes de la barra
// ---------------------------------------------------------------------------
export async function listPromos(): Promise<AdminPromo[]> {
  if (!hasSupabase) return [...demoDb().promos].sort((a, b) => a.order - b.order).map((p) => ({ ...p }));
  const { data, error } = await db().from("payment_promos").select("*").order("order");
  if (error) throw error;
  return data.map((p) => ({
    id: p.id,
    provider: p.provider,
    label: p.label,
    installments: p.installments,
    interestFree: p.interest_free,
    minAmount: p.min_amount,
    logoUrl: p.logo_url,
    paywayPlanId: p.payway_plan_id,
    showInTopbar: p.show_in_topbar,
    startsAt: p.starts_at,
    endsAt: p.ends_at,
    active: p.active,
    order: p.order,
  }));
}

export async function savePromo(p: Omit<AdminPromo, "id" | "order"> & { id?: string }) {
  if (!hasSupabase) {
    const rows = demoDb().promos;
    const existing = p.id ? rows.find((x) => x.id === p.id) : undefined;
    if (existing) Object.assign(existing, { ...p, id: existing.id });
    else rows.push({ ...p, id: randomUUID(), order: rows.length });
    return;
  }
  const row = {
    provider: p.provider,
    label: p.label,
    installments: p.installments,
    interest_free: p.interestFree,
    min_amount: p.minAmount,
    logo_url: p.logoUrl,
    payway_plan_id: p.paywayPlanId,
    show_in_topbar: p.showInTopbar,
    starts_at: p.startsAt,
    ends_at: p.endsAt,
    active: p.active,
  };
  if (p.id) {
    const { error } = await db().from("payment_promos").update(row).eq("id", p.id);
    if (error) throw error;
  } else {
    const { count } = await db().from("payment_promos").select("id", { count: "exact", head: true });
    const { error } = await db().from("payment_promos").insert({ ...row, order: count ?? 0 });
    if (error) throw error;
  }
}

export async function listTopbar(): Promise<AdminTopbar[]> {
  if (!hasSupabase) return [...demoDb().topbar].sort((a, b) => a.order - b.order).map((m) => ({ ...m }));
  const { data, error } = await db().from("topbar_messages").select("id, text, link, order, active").order("order");
  if (error) throw error;
  return data;
}

export async function saveTopbar(m: { id?: string; text: string; link: string | null; active: boolean }) {
  if (!hasSupabase) {
    const rows = demoDb().topbar;
    const existing = m.id ? rows.find((x) => x.id === m.id) : undefined;
    if (existing) Object.assign(existing, { text: m.text, link: m.link, active: m.active });
    else rows.push({ id: randomUUID(), text: m.text, link: m.link, active: m.active, order: rows.length });
    return;
  }
  if (m.id) {
    const { error } = await db().from("topbar_messages").update({ text: m.text, link: m.link, active: m.active }).eq("id", m.id);
    if (error) throw error;
  } else {
    const { count } = await db().from("topbar_messages").select("id", { count: "exact", head: true });
    const { error } = await db().from("topbar_messages").insert({ text: m.text, link: m.link, active: m.active, order: count ?? 0 });
    if (error) throw error;
  }
}

// ---------------------------------------------------------------------------
// Videos del home
// ---------------------------------------------------------------------------
export async function listVideos(): Promise<AdminVideo[]> {
  if (!hasSupabase) return [...demoDb().videos].sort((a, b) => a.order - b.order).map((v) => ({ ...v }));
  const { data, error } = await db().from("home_videos").select("*").order("order");
  if (error) throw error;
  return data.map((v) => ({
    id: v.id,
    source: v.source,
    mediaUrl: v.media_url,
    instagramUrl: v.instagram_url,
    thumbnail: v.thumbnail,
    caption: v.caption,
    productId: v.product_id,
    order: v.order,
    active: v.active,
  }));
}

export async function saveVideo(v: Omit<AdminVideo, "id" | "order"> & { id?: string }) {
  if (!hasSupabase) {
    const rows = demoDb().videos;
    const existing = v.id ? rows.find((x) => x.id === v.id) : undefined;
    if (existing) Object.assign(existing, { ...v, id: existing.id });
    else rows.push({ ...v, id: randomUUID(), order: rows.length });
    return;
  }
  const row = {
    source: v.source,
    media_url: v.mediaUrl,
    instagram_url: v.instagramUrl,
    thumbnail: v.thumbnail,
    caption: v.caption,
    product_id: v.productId,
    active: v.active,
  };
  if (v.id) {
    const { error } = await db().from("home_videos").update(row).eq("id", v.id);
    if (error) throw error;
  } else {
    const { count } = await db().from("home_videos").select("id", { count: "exact", head: true });
    const { error } = await db().from("home_videos").insert({ ...row, order: count ?? 0 });
    if (error) throw error;
  }
}

// ---------------------------------------------------------------------------
// Categorías y productos
// ---------------------------------------------------------------------------
export async function listCategories(): Promise<AdminCategory[]> {
  if (!hasSupabase) {
    return demoDb().categories.map((c) => ({ id: c.id, parentId: c.parentId, name: c.name, slug: c.slug, kind: c.kind, order: c.order, active: c.active }));
  }
  const { data, error } = await db().from("categories").select("id, parent_id, name, slug, kind, order, active").order("order");
  if (error) throw error;
  return data.map((c) => ({ id: c.id, parentId: c.parent_id, name: c.name, slug: c.slug, kind: c.kind, order: c.order, active: c.active }));
}

export async function listProducts(): Promise<AdminProductSummary[]> {
  if (!hasSupabase) {
    return demoDb().products.map((p) => ({
      id: p.id,
      name: p.name,
      slug: p.slug,
      line: p.line,
      basePrice: p.basePrice,
      salePrice: p.salePrice,
      isOffer: p.isOffer,
      saleStartsAt: p.saleStartsAt,
      saleEndsAt: p.saleEndsAt,
      isNew: p.isNew,
      isFeatured: p.isFeatured,
      active: p.active,
      image: p.images[0]?.url ?? null,
      stock: p.variants.reduce((n, v) => n + v.stock, 0),
      categoryIds: p.categoryIds,
    }));
  }
  const { data, error } = await db()
    .from("products")
    .select(
      "id, name, slug, line, base_price, sale_price, is_offer, sale_starts_at, sale_ends_at, is_new, is_featured, active, product_images(url, order), product_variants(stock), product_categories(category_id)",
    )
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data.map((p) => ({
    id: p.id,
    name: p.name,
    slug: p.slug,
    line: p.line,
    basePrice: p.base_price,
    salePrice: p.sale_price,
    isOffer: p.is_offer,
    saleStartsAt: p.sale_starts_at,
    saleEndsAt: p.sale_ends_at,
    isNew: p.is_new,
    isFeatured: p.is_featured,
    active: p.active,
    image: [...p.product_images].sort((a, b) => a.order - b.order)[0]?.url ?? null,
    stock: p.product_variants.reduce((n: number, v: { stock: number }) => n + v.stock, 0),
    categoryIds: p.product_categories.map((c: { category_id: string }) => c.category_id),
  }));
}

export async function getProduct(id: string): Promise<AdminProduct | null> {
  if (!hasSupabase) {
    const p = demoDb().products.find((x) => x.id === id);
    if (!p) return null;
    return {
      id: p.id,
      name: p.name,
      slug: p.slug,
      line: p.line,
      basePrice: p.basePrice,
      salePrice: p.salePrice,
      isOffer: p.isOffer,
      saleStartsAt: p.saleStartsAt,
      saleEndsAt: p.saleEndsAt,
      isNew: p.isNew,
      isFeatured: p.isFeatured,
      active: p.active,
      categoryIds: [...p.categoryIds],
      skuBase: p.skuBase,
      description: p.description,
      specs: { ...p.specs },
      weightG: p.weightG,
      box: p.box,
      colors: p.colors.map((c) => ({
        id: c.id,
        name: c.name,
        slug: c.slug,
        hex: c.hex,
        images: p.images.filter((i) => i.colorId === c.id).sort((a, b) => a.order - b.order).map((i) => ({ url: i.url, alt: i.alt })),
      })),
      variants: p.variants.map((v) => ({ id: v.id, colorId: v.colorId, size: v.size, sku: v.sku, stock: v.stock })),
    };
  }
  const { data: p, error } = await db()
    .from("products")
    .select("*, product_categories(category_id), product_colors(id, color_name, slug, hex, order), product_images(url, alt, color_id, order, type), product_variants(id, color_id, size, sku, stock, size_sort)")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!p) return null;
  return {
    id: p.id,
    name: p.name,
    slug: p.slug,
    line: p.line,
    basePrice: p.base_price,
    salePrice: p.sale_price,
    isOffer: p.is_offer,
    saleStartsAt: p.sale_starts_at,
    saleEndsAt: p.sale_ends_at,
    isNew: p.is_new,
    isFeatured: p.is_featured,
    active: p.active,
    categoryIds: p.product_categories.map((c: { category_id: string }) => c.category_id),
    skuBase: p.sku_base,
    description: p.description,
    specs: p.specs ?? {},
    weightG: p.weight_g,
    box: p.box_dimensions,
    colors: [...p.product_colors]
      .sort((a, b) => a.order - b.order)
      .map((c: { id: string; color_name: string; slug: string; hex: string }) => ({
        id: c.id,
        name: c.color_name,
        slug: c.slug,
        hex: c.hex,
        images: p.product_images
          .filter((i: { color_id: string | null; type: string }) => i.color_id === c.id && i.type === "image")
          .sort((a: { order: number }, b: { order: number }) => a.order - b.order)
          .map((i: { url: string; alt: string }) => ({ url: i.url, alt: i.alt })),
      })),
    variants: [...p.product_variants]
      .sort((a, b) => Number(a.size_sort) - Number(b.size_sort))
      .map((v: { id: string; color_id: string; size: string; sku: string; stock: number }) => ({ id: v.id, colorId: v.color_id, size: v.size, sku: v.sku, stock: v.stock })),
  };
}

export async function slugTaken(slug: string, exceptId?: string): Promise<boolean> {
  if (!hasSupabase) return demoDb().products.some((p) => p.slug === slug && p.id !== exceptId);
  let q = db().from("products").select("id").eq("slug", slug);
  if (exceptId) q = q.neq("id", exceptId);
  const { data } = await q;
  return (data?.length ?? 0) > 0;
}

/** Guarda el producto completo (datos, categorías, colores con fotos y variantes). Devuelve el id. */
export async function saveProduct(p: AdminProduct & { id: string | "" }): Promise<string> {
  const id = p.id || randomUUID();
  const sizeSort = (s: string) => Number(s.split(/[/-]/)[0]) || 0;

  if (!hasSupabase) {
    const rows = demoDb().products;
    const existing = rows.find((x) => x.id === id);
    const images = p.colors.flatMap((c) => c.images.map((img, i) => ({ id: randomUUID(), colorId: c.id, url: img.url, alt: img.alt || `${p.name} ${c.name}`, order: i })));
    const row = {
      id,
      name: p.name,
      slug: p.slug,
      skuBase: p.skuBase ?? "",
      description: p.description,
      specs: p.specs,
      line: p.line,
      basePrice: p.basePrice,
      salePrice: p.salePrice,
      isOffer: p.isOffer,
      saleStartsAt: p.saleStartsAt,
      saleEndsAt: p.saleEndsAt,
      isNew: p.isNew,
      isFeatured: p.isFeatured,
      active: p.active,
      weightG: p.weightG ?? 1000,
      box: p.box,
      categoryIds: p.categoryIds,
      colors: p.colors.map((c, i) => ({ id: c.id, name: c.name, slug: c.slug, hex: c.hex, order: i })),
      variants: p.variants.map((v) => ({ id: v.id, colorId: v.colorId, size: v.size, sizeSort: sizeSort(v.size), sku: v.sku, stock: v.stock })),
      images,
      soldCount: existing?.soldCount ?? 0,
      createdAt: existing?.createdAt ?? new Date().toISOString(),
    };
    if (existing) Object.assign(existing, row);
    else rows.unshift(row);
    return id;
  }

  const client = db();
  const { error } = await client.from("products").upsert({
    id,
    name: p.name,
    slug: p.slug,
    sku_base: p.skuBase,
    description: p.description,
    specs: p.specs,
    line: p.line,
    base_price: p.basePrice,
    sale_price: p.salePrice,
    is_offer: p.isOffer,
    sale_starts_at: p.saleStartsAt,
    sale_ends_at: p.saleEndsAt,
    is_new: p.isNew,
    is_featured: p.isFeatured,
    active: p.active,
    weight_g: p.weightG,
    box_dimensions: p.box,
  });
  if (error) throw error;

  // Categorías: reemplazar
  await client.from("product_categories").delete().eq("product_id", id);
  if (p.categoryIds.length) {
    const { error: e } = await client.from("product_categories").insert(p.categoryIds.map((c) => ({ product_id: id, category_id: c })));
    if (e) throw e;
  }

  // Colores: upsert los que vienen, borrar los que ya no están (cascada borra sus fotos/variantes)
  const colorIds = p.colors.map((c) => c.id);
  await client.from("product_colors").delete().eq("product_id", id).not("id", "in", `(${colorIds.join(",") || "00000000-0000-0000-0000-000000000000"})`);
  if (p.colors.length) {
    const { error: e } = await client
      .from("product_colors")
      .upsert(p.colors.map((c, i) => ({ id: c.id, product_id: id, color_name: c.name, slug: c.slug, hex: c.hex, order: i })));
    if (e) throw e;
  }

  // Fotos: reemplazar
  await client.from("product_images").delete().eq("product_id", id);
  const imgs = p.colors.flatMap((c) => c.images.map((img, i) => ({ product_id: id, color_id: c.id, url: img.url, alt: img.alt || `${p.name} ${c.name}`, order: i, type: "image" })));
  if (imgs.length) {
    const { error: e } = await client.from("product_images").insert(imgs);
    if (e) throw e;
  }

  // Variantes: upsert por id y borrar las que sobran (los pedidos guardan copia del SKU)
  const variantIds = p.variants.map((v) => v.id);
  await client.from("product_variants").delete().eq("product_id", id).not("id", "in", `(${variantIds.join(",") || "00000000-0000-0000-0000-000000000000"})`);
  if (p.variants.length) {
    const { error: e } = await client.from("product_variants").upsert(
      p.variants.map((v) => ({ id: v.id, product_id: id, color_id: v.colorId, size: v.size, size_sort: sizeSort(v.size), sku: v.sku, stock: v.stock, active: true })),
    );
    if (e) throw e;
  }
  return id;
}

/** Actualiza stock por SKU (lo más usado desde un back office). Devuelve los SKUs que no existen. */
export async function setStockBySku(items: { sku: string; stock: number }[]): Promise<{ updated: number; notFound: string[] }> {
  const notFound: string[] = [];
  let updated = 0;
  if (!hasSupabase) {
    const bySku = new Map(demoDb().products.flatMap((p) => p.variants.map((v) => [v.sku, v] as const)));
    for (const it of items) {
      const v = bySku.get(it.sku);
      if (!v) notFound.push(it.sku);
      else {
        v.stock = it.stock;
        updated++;
      }
    }
    return { updated, notFound };
  }
  const client = db();
  for (const it of items) {
    const { data, error } = await client.from("product_variants").update({ stock: it.stock }).eq("sku", it.sku).select("id");
    if (error) throw error;
    if (!data?.length) notFound.push(it.sku);
    else updated++;
  }
  return { updated, notFound };
}

export async function setProductActive(id: string, active: boolean) {
  if (!hasSupabase) {
    const p = demoDb().products.find((x) => x.id === id);
    if (p) p.active = active;
    return;
  }
  const { error } = await db().from("products").update({ active }).eq("id", id);
  if (error) throw error;
}

export async function setOffer(id: string, o: { isOffer: boolean; salePrice: number | null; saleStartsAt: string | null; saleEndsAt: string | null }) {
  if (!hasSupabase) {
    const p = demoDb().products.find((x) => x.id === id);
    if (p) Object.assign(p, o);
    return;
  }
  const { error } = await db()
    .from("products")
    .update({ is_offer: o.isOffer, sale_price: o.salePrice, sale_starts_at: o.saleStartsAt, sale_ends_at: o.saleEndsAt })
    .eq("id", id);
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// Configuración, envíos, newsletter
// ---------------------------------------------------------------------------
export async function getSetting<T>(key: string): Promise<T | null> {
  if (!hasSupabase) return (demoDb().settings[key]?.value as T) ?? null;
  const { data } = await db().from("settings").select("value").eq("key", key).maybeSingle();
  return (data?.value as T) ?? null;
}

export async function saveSetting(key: string, value: unknown, isPublic: boolean) {
  if (!hasSupabase) {
    demoDb().settings[key] = { value, isPublic };
    return;
  }
  const { error } = await db().from("settings").upsert({ key, value, is_public: isPublic });
  if (error) throw error;
}

export async function listFallbackRates(): Promise<AdminFallbackRate[]> {
  if (!hasSupabase) return demoDb().fallbackRates.map((r) => ({ ...r }));
  const { data, error } = await db().from("shipping_fallback_rates").select("*").order("cp_from");
  if (error) throw error;
  return data.map((r) => ({ id: r.id, zone: r.zone, cpFrom: r.cp_from, cpTo: r.cp_to, service: r.service, price: r.price, etaDays: r.eta_days }));
}

export async function replaceFallbackRates(rates: Omit<AdminFallbackRate, "id">[]) {
  if (!hasSupabase) {
    demoDb().fallbackRates = rates.map((r) => ({ ...r, id: randomUUID() }));
    return;
  }
  const client = db();
  await client.from("shipping_fallback_rates").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  if (rates.length) {
    const { error } = await client
      .from("shipping_fallback_rates")
      .insert(rates.map((r) => ({ zone: r.zone, cp_from: r.cpFrom, cp_to: r.cpTo, service: r.service, price: r.price, eta_days: r.etaDays })));
    if (error) throw error;
  }
}

export async function listSubscribers(): Promise<AdminSubscriber[]> {
  await requireAdmin(); // datos personales: doble control además de la página
  if (!hasSupabase) return [...demoDb().subscribers];
  const { data, error } = await db().from("newsletter_subscribers").select("id, email, preference, birth_date, source, created_at").order("created_at", { ascending: false });
  if (error) throw error;
  return data.map((s) => ({ id: s.id, email: s.email, preference: s.preference, birthDate: s.birth_date, source: s.source, createdAt: s.created_at }));
}

// ---------------------------------------------------------------------------
// Pedidos
// ---------------------------------------------------------------------------
const gOrders = globalThis as unknown as { __demoOrders?: Map<string, OrderView> };

export async function listOrders(status?: string): Promise<AdminOrderRow[]> {
  await requireAdmin(); // datos personales: doble control además de la página
  const toRow = (o: OrderView): AdminOrderRow => ({
    id: o.id,
    number: o.number,
    createdAt: o.createdAt,
    customer: `${o.customer.firstName} ${o.customer.lastName}`,
    email: o.customer.email,
    total: o.total,
    status: o.status,
    paymentStatus: o.paymentStatus,
    shipping: o.shipping.label,
    trackingCode: o.trackingCode,
    items: o.items.reduce((n, i) => n + i.qty, 0),
  });
  if (!hasSupabase) {
    return [...(gOrders.__demoOrders?.values() ?? [])]
      .filter((o) => !status || o.status === status)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map(toRow);
  }
  let q = db()
    .from("orders")
    .select("id, number, created_at, first_name, last_name, email, total, status, payment_status, shipping_provider, shipping_service, tracking_code, order_items(qty)")
    .order("created_at", { ascending: false })
    .limit(200);
  if (status) q = q.eq("status", status);
  const { data, error } = await q;
  if (error) throw error;
  return data.map((o) => ({
    id: o.id,
    number: o.number,
    createdAt: o.created_at,
    customer: `${o.first_name} ${o.last_name}`,
    email: o.email,
    total: o.total,
    status: o.status,
    paymentStatus: o.payment_status,
    shipping: o.shipping_service === "retiro" ? "Retiro en el local" : `${o.shipping_provider ?? ""} a ${o.shipping_service ?? ""}`,
    trackingCode: o.tracking_code,
    items: o.order_items.reduce((n: number, i: { qty: number }) => n + i.qty, 0),
  }));
}

export async function getOrderAdmin(number: string): Promise<OrderView | null> {
  await requireAdmin();
  return getOrderByNumberUnsafe(number);
}

export async function updateOrder(id: string, patch: { status: OrderView["status"]; trackingCode: string | null }) {
  if (!hasSupabase) {
    const o = gOrders.__demoOrders?.get(id);
    if (o) gOrders.__demoOrders!.set(id, { ...o, status: patch.status, trackingCode: patch.trackingCode });
    return;
  }
  const client = db();
  const { error } = await client.from("orders").update({ status: patch.status, tracking_code: patch.trackingCode }).eq("id", id);
  if (error) throw error;
  await client.from("order_events").insert({ order_id: id, type: `status_${patch.status}`, data: { tracking_code: patch.trackingCode } });
}

export { nn };
