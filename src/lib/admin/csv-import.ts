import "server-only";
import { randomUUID } from "node:crypto";
import { cleanProductInput, slugify } from "./product-input";
import { parseCsv } from "./csv";
import * as repo from "./repo";

/**
 * Importación masiva de productos (carga inicial). Una fila por variante (color + talle):
 *
 *   nombre;slug;descripcion;seccion;subseccion;linea;precio;precio_oferta;color;hex;talle;sku;stock;peso_g;foto_url
 *
 * - Separador ";" o "," (se detecta). Primera fila = encabezados (en cualquier orden).
 * - Las filas con el mismo `slug` (o nombre) forman un producto; el mismo `color` agrupa fotos y talles.
 * - `seccion` y `subseccion` son los slugs de la tienda (ej. mujer / verano). `linea`: diario | seleccion.
 * - Si el producto ya existe (mismo slug) se actualiza: se reemplazan colores, talles y fotos con lo del archivo.
 */
export const CSV_COLUMNS = [
  "nombre",
  "slug",
  "descripcion",
  "seccion",
  "subseccion",
  "linea",
  "precio",
  "precio_oferta",
  "color",
  "hex",
  "talle",
  "sku",
  "stock",
  "peso_g",
  "foto_url",
] as const;

type Row = Partial<Record<(typeof CSV_COLUMNS)[number], string>> & { _line: number };

export type ImportReport = {
  dryRun: boolean;
  products: { slug: string; name: string; action: "crear" | "actualizar"; variants: number; errors: Record<string, string> | null }[];
  rowErrors: { line: number; message: string }[];
  created: number;
  updated: number;
  failed: number;
};

const money = (v: string | undefined) => {
  const n = Number(String(v ?? "").replace(/[^\d,.-]/g, "").replace(/\./g, "").replace(",", "."));
  return Number.isFinite(n) && n > 0 ? Math.round(n) : 0;
};

export async function importProductsCsv(text: string, dryRun: boolean): Promise<ImportReport> {
  const report: ImportReport = { dryRun, products: [], rowErrors: [], created: 0, updated: 0, failed: 0 };
  const table = parseCsv(text);
  if (table.length < 2) {
    report.rowErrors.push({ line: 1, message: "El archivo no tiene filas de productos." });
    return report;
  }
  const header = table[0].map((h) => slugify(h).replace(/-/g, "_"));
  const missing = ["nombre", "precio", "seccion", "talle"].filter((c) => !header.includes(c));
  if (missing.length) {
    report.rowErrors.push({ line: 1, message: `Faltan columnas: ${missing.join(", ")}.` });
    return report;
  }
  if (table.length > 5001) {
    report.rowErrors.push({ line: 1, message: "Máximo 5000 filas por archivo. Dividilo en partes." });
    return report;
  }

  const rows: Row[] = table.slice(1).map((cells, i) => {
    const r: Row = { _line: i + 2 };
    header.forEach((h, j) => {
      if ((CSV_COLUMNS as readonly string[]).includes(h)) r[h as (typeof CSV_COLUMNS)[number]] = (cells[j] ?? "").trim();
    });
    return r;
  });

  const categories = await repo.listCategories();
  const sectionOf = (slug: string) => categories.find((c) => c.parentId === null && c.slug === slug);
  const subOf = (sectionId: string, slug: string) => categories.find((c) => c.parentId === sectionId && c.slug === slug);
  const existing = new Map((await repo.listProducts()).map((p) => [p.slug, p.id]));

  // Agrupar filas por producto
  const groups = new Map<string, Row[]>();
  for (const r of rows) {
    const key = slugify(r.slug || r.nombre || "");
    if (!key) {
      report.rowErrors.push({ line: r._line, message: "Falta el nombre." });
      continue;
    }
    groups.set(key, [...(groups.get(key) ?? []), r]);
  }

  for (const [slug, group] of groups) {
    const first = group[0];
    const errors: Record<string, string> = {};
    const categoryIds = new Set<string>();
    for (const r of group) {
      const sec = sectionOf(slugify(r.seccion ?? ""));
      if (!sec) {
        errors.seccion = `Sección “${r.seccion}” no existe (fila ${r._line}).`;
        continue;
      }
      categoryIds.add(sec.id);
      if (r.subseccion) {
        const sub = subOf(sec.id, slugify(r.subseccion));
        if (sub) categoryIds.add(sub.id);
        else errors.subseccion = `Subsección “${r.subseccion}” no existe en ${sec.name} (fila ${r._line}).`;
      }
    }

    // Colores (con sus fotos) y variantes
    const colors = new Map<string, repo.AdminColor>();
    const variants: repo.AdminVariant[] = [];
    for (const r of group) {
      const colorName = r.color || "Único";
      const cKey = slugify(colorName);
      if (!colors.has(cKey)) colors.set(cKey, { id: randomUUID(), name: colorName, slug: cKey, hex: r.hex || "#1f1f1f", images: [] });
      const color = colors.get(cKey)!;
      if (r.foto_url && !color.images.some((i) => i.url === r.foto_url)) color.images.push({ url: r.foto_url, alt: `${first.nombre} ${colorName}` });
      if (r.talle) {
        variants.push({
          id: randomUUID(),
          colorId: color.id,
          size: r.talle,
          sku: r.sku || `${slug.slice(0, 12).toUpperCase()}-${cKey.slice(0, 3).toUpperCase()}-${r.talle}`,
          stock: Math.max(0, parseInt(r.stock || "0", 10) || 0),
        });
      }
    }

    const id = existing.get(slug) ?? "";
    const prev = id ? await repo.getProduct(id) : null;
    const salePrice = money(first.precio_oferta);
    const res = await cleanProductInput({
      ...(prev ?? {}),
      id,
      name: first.nombre,
      slug,
      description: first.descripcion || prev?.description || "",
      line: first.linea === "seleccion" ? "seleccion" : (prev?.line ?? "diario"),
      basePrice: money(first.precio),
      isOffer: salePrice > 0,
      salePrice: salePrice || null,
      weightG: parseInt(first.peso_g || "", 10) || prev?.weightG || null,
      categoryIds: [...categoryIds],
      colors: [...colors.values()],
      variants,
      active: prev?.active ?? true,
      isNew: prev ? prev.isNew : true,
    });

    const allErrors = { ...errors, ...(res.ok ? {} : res.errors) };
    const hasErrors = Object.keys(allErrors).length > 0;
    report.products.push({ slug, name: first.nombre ?? slug, action: id ? "actualizar" : "crear", variants: variants.length, errors: hasErrors ? allErrors : null });
    if (hasErrors || !res.ok) {
      report.failed++;
      continue;
    }
    if (!dryRun) await repo.saveProduct(res.product);
    if (id) report.updated++;
    else report.created++;
  }
  return report;
}
