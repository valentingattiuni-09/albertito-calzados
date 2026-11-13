import type { ColorSummary, ProductCard, ProductLine } from "@/lib/data/types";

/**
 * Filtros del listado, siempre reflejados en la URL para poder compartirlos:
 *   ?talle=38,39&color=negro&min=20000&max=60000&linea=seleccion&oferta=1&orden=menor-precio&pagina=2
 * En /ofertas y /buscar además: ?seccion=mujer
 */
export type SortKey = "nuevos" | "menor-precio" | "mayor-precio" | "mas-vendidos" | "mayor-descuento";

export const SORTS: { key: SortKey; label: string }[] = [
  { key: "nuevos", label: "Más nuevos" },
  { key: "menor-precio", label: "Menor precio" },
  { key: "mayor-precio", label: "Mayor precio" },
  { key: "mas-vendidos", label: "Más vendidos" },
  { key: "mayor-descuento", label: "Mayor descuento" },
];

export const LINES: { key: ProductLine; label: string }[] = [
  { key: "diario", label: "De todos los días" },
  { key: "seleccion", label: "Selección Albertito" },
];

export const PAGE_SIZE = 24;

export type Filters = {
  sizes: string[];
  colors: string[];
  min: number | null;
  max: number | null;
  line: ProductLine | null;
  onSale: boolean;
  section: string | null;
  /** null = orden por defecto (más nuevos; en /buscar, relevancia) */
  sort: SortKey | null;
  page: number;
};

type Params = Record<string, string | string[] | undefined>;

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";
const list = (v: string | string[] | undefined) =>
  one(v)
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 20);
const num = (v: string | string[] | undefined) => {
  const n = parseInt(one(v).replace(/\D/g, ""), 10);
  return Number.isFinite(n) && n > 0 ? n : null;
};

export function parseFilters(sp: Params): Filters {
  const sort = one(sp.orden) as SortKey;
  const line = one(sp.linea) as ProductLine;
  return {
    sizes: list(sp.talle),
    colors: list(sp.color),
    min: num(sp.min),
    max: num(sp.max),
    line: LINES.some((l) => l.key === line) ? line : null,
    onSale: one(sp.oferta) === "1",
    section: one(sp.seccion) || null,
    sort: SORTS.some((s) => s.key === sort) ? sort : null,
    page: Math.min(num(sp.pagina) ?? 1, 50),
  };
}

/** Serializa filtros a querystring (sin los valores por defecto). */
export function toQuery(f: Partial<Filters>, extra: Record<string, string> = {}): string {
  const p = new URLSearchParams(extra);
  if (f.sizes?.length) p.set("talle", f.sizes.join(","));
  if (f.colors?.length) p.set("color", f.colors.join(","));
  if (f.min) p.set("min", String(f.min));
  if (f.max) p.set("max", String(f.max));
  if (f.line) p.set("linea", f.line);
  if (f.onSale) p.set("oferta", "1");
  if (f.section) p.set("seccion", f.section);
  if (f.sort) p.set("orden", f.sort);
  if (f.page && f.page > 1) p.set("pagina", String(f.page));
  const s = p.toString();
  return s ? `?${s}` : "";
}

const toggle = (arr: string[], v: string) => (arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);

/** Helpers para armar los links de cada opción (cambiar un filtro vuelve a la página 1). */
export function withSize(f: Filters, size: string): Filters {
  return { ...f, sizes: toggle(f.sizes, size), page: 1 };
}
export function withColor(f: Filters, color: string): Filters {
  return { ...f, colors: toggle(f.colors, color), page: 1 };
}

export function applyFilters(
  products: ProductCard[],
  f: Filters,
  sectionIds?: Map<string, string>, // slug de sección → id (para ?seccion=)
): ProductCard[] {
  const sectionId = f.section ? sectionIds?.get(f.section) : undefined;
  return products.filter(
    (p) =>
      (f.sizes.length === 0 || f.sizes.some((s) => p.sizesInStock.includes(s))) &&
      (f.colors.length === 0 || p.colors.some((c) => f.colors.includes(c.slug))) &&
      (f.min === null || p.price >= f.min) &&
      (f.max === null || p.price <= f.max) &&
      (f.line === null || p.line === f.line) &&
      (!f.onSale || p.onSale) &&
      (!sectionId || p.categoryIds.includes(sectionId)),
  );
}

export function sortProducts(products: ProductCard[], sort: SortKey | "relevancia"): ProductCard[] {
  const arr = [...products];
  switch (sort) {
    case "menor-precio":
      return arr.sort((a, b) => a.price - b.price);
    case "mayor-precio":
      return arr.sort((a, b) => b.price - a.price);
    case "mas-vendidos":
      return arr.sort((a, b) => b.soldCount - a.soldCount);
    case "mayor-descuento":
      return arr.sort((a, b) => b.discountPct - a.discountPct || a.price - b.price);
    case "relevancia":
      return arr; // ya vienen ordenados por la búsqueda
    default:
      return arr.sort((a, b) => Number(b.isNew) - Number(a.isNew) || b.createdAt.localeCompare(a.createdAt));
  }
}

export type Facets = {
  sizes: { value: string; count: number }[];
  colors: (ColorSummary & { count: number })[];
  priceMin: number;
  priceMax: number;
  lines: { key: ProductLine; label: string; count: number }[];
  onSaleCount: number;
};

/** Opciones disponibles con su cantidad, calculadas sobre el conjunto base de la página. */
export function buildFacets(products: ProductCard[]): Facets {
  const sizes = new Map<string, number>();
  const colors = new Map<string, ColorSummary & { count: number }>();
  for (const p of products) {
    p.sizesInStock.forEach((s) => sizes.set(s, (sizes.get(s) ?? 0) + 1));
    p.colors.forEach((c) => {
      const prev = colors.get(c.slug);
      colors.set(c.slug, { ...c, count: (prev?.count ?? 0) + 1 });
    });
  }
  const prices = products.map((p) => p.price);
  return {
    sizes: [...sizes].map(([value, count]) => ({ value, count })).sort((a, b) => Number(a.value) - Number(b.value)),
    colors: [...colors.values()].sort((a, b) => b.count - a.count),
    priceMin: prices.length ? Math.min(...prices) : 0,
    priceMax: prices.length ? Math.max(...prices) : 0,
    lines: LINES.map((l) => ({ ...l, count: products.filter((p) => p.line === l.key).length })),
    onSaleCount: products.filter((p) => p.onSale).length,
  };
}
