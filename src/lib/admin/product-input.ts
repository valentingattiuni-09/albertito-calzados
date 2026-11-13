import "server-only";
import { randomUUID } from "node:crypto";
import { isAllowedMediaUrl } from "@/lib/media";
import * as repo from "./repo";

/**
 * Validación y normalización de un producto completo. La usan el panel (/admin) y la API del
 * back office, así las reglas son las mismas venga de donde venga el dato.
 */
export const slugify = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 80);

const isMedia = isAllowedMediaUrl;
const isUuid = (v: unknown) => typeof v === "string" && /^[0-9a-f-]{36}$/i.test(v);

export type ProductInputResult = { ok: true; product: repo.AdminProduct } | { ok: false; errors: Record<string, string> };

export async function cleanProductInput(raw: unknown): Promise<ProductInputResult> {
  const input = (raw ?? {}) as Partial<repo.AdminProduct>;
  const errors: Record<string, string> = {};

  const name = String(input.name ?? "").trim().slice(0, 120);
  const slug = slugify(String(input.slug || name));
  if (!name) errors.name = "Poné el nombre.";
  if (!slug) errors.slug = "Revisá la URL.";
  else if (await repo.slugTaken(slug, input.id || undefined)) errors.slug = "Ya hay otro producto con esa URL.";

  const basePrice = Math.round(Number(input.basePrice));
  if (!(basePrice > 0)) errors.basePrice = "Poné el precio.";

  const categoryIds = Array.isArray(input.categoryIds) ? input.categoryIds.filter((c): c is string => typeof c === "string").slice(0, 20) : [];
  if (categoryIds.length === 0) errors.categoryIds = "Elegí al menos una sección.";

  const colorsIn = Array.isArray(input.colors) ? input.colors.slice(0, 20) : [];
  if (colorsIn.length === 0) errors.colors = "Agregá al menos un color.";

  const colorIds = new Set(colorsIn.map((c) => c.id));
  const variantsIn = (Array.isArray(input.variants) ? input.variants : []).filter((v) => colorIds.has(v.colorId) && String(v.size ?? "").trim());
  if (variantsIn.length === 0) errors.variants = "Agregá talles con stock.";
  const skus = variantsIn.map((v) => String(v.sku ?? "").trim());
  if (skus.some((s) => !s)) errors.variants = "Cada talle necesita un SKU.";
  else if (new Set(skus).size !== skus.length) errors.variants = "Hay SKUs repetidos.";

  const badImage = colorsIn.flatMap((c) => (Array.isArray(c.images) ? c.images : [])).find((i) => !isMedia(i?.url));
  if (badImage) errors.colors = `Foto no permitida: ${String(badImage.url).slice(0, 80)}. Subila desde el panel o usá un host permitido.`;

  if (Object.keys(errors).length) return { ok: false, errors };

  const salePrice = Number(input.salePrice);
  const validSale = Boolean(input.isOffer) && salePrice > 0 && salePrice < basePrice;
  const colors = colorsIn.map((c) => ({
    id: isUuid(c.id) ? c.id : randomUUID(),
    name: String(c.name ?? "").trim().slice(0, 40) || "Único",
    slug: slugify(String(c.slug || c.name || "")) || "unico",
    hex: /^#[0-9a-f]{6}$/i.test(String(c.hex)) ? c.hex : "#000000",
    images: (Array.isArray(c.images) ? c.images : [])
      .filter((i) => isMedia(i?.url))
      .slice(0, 12)
      .map((i) => ({ url: i.url, alt: String(i.alt ?? "").slice(0, 200) })),
  }));
  // Los ids de color pudieron regenerarse: mantener la relación con las variantes
  const colorMap = new Map(colorsIn.map((c, i) => [c.id, colors[i].id]));
  const box = input.box;

  const product: repo.AdminProduct = {
    id: isUuid(input.id) ? (input.id as string) : "",
    name,
    slug,
    skuBase: String(input.skuBase ?? "").trim().slice(0, 40) || null,
    description: String(input.description ?? "").trim().slice(0, 4000),
    specs: Object.fromEntries(
      Object.entries(input.specs ?? {})
        .map(([k, v]) => [String(k).trim().slice(0, 40), String(v).trim().slice(0, 200)])
        .filter(([k, v]) => k && v),
    ),
    line: input.line === "seleccion" ? "seleccion" : "diario",
    basePrice,
    salePrice: validSale ? Math.round(salePrice) : null,
    isOffer: validSale,
    saleStartsAt: input.saleStartsAt ?? null,
    saleEndsAt: input.saleEndsAt ?? null,
    isNew: Boolean(input.isNew),
    isFeatured: Boolean(input.isFeatured),
    active: input.active === undefined ? true : Boolean(input.active),
    weightG: Number(input.weightG) > 0 ? Math.round(Number(input.weightG)) : null,
    box: box && Number(box.l) > 0 && Number(box.w) > 0 && Number(box.h) > 0 ? { l: Number(box.l), w: Number(box.w), h: Number(box.h) } : null,
    categoryIds,
    colors,
    variants: variantsIn.slice(0, 400).map((v) => ({
      id: isUuid(v.id) ? v.id : randomUUID(),
      colorId: colorMap.get(v.colorId) ?? v.colorId,
      size: String(v.size).trim().slice(0, 10),
      sku: String(v.sku).trim().slice(0, 60),
      stock: Math.max(0, Math.round(Number(v.stock) || 0)),
    })),
  };
  return { ok: true, product };
}
