/**
 * Genera supabase/seed.sql y las imágenes de muestra de public/demo/
 * a partir de src/lib/demo/catalog.ts.
 *   npm run seed:sql
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  demoBanners,
  demoCategories,
  demoCoupons,
  demoFallbackRates,
  demoProducts,
  demoPromos,
  demoSettings,
  demoSynonyms,
  demoTopbarMessages,
  demoVideos,
} from "../src/lib/demo/catalog.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

const q = (v: unknown): string => {
  if (v === null || v === undefined) return "null";
  if (typeof v === "number") return String(v);
  if (typeof v === "boolean") return v ? "true" : "false";
  if (Array.isArray(v)) return `array[${v.map(q).join(",")}]::text[]`;
  if (typeof v === "object") return `'${JSON.stringify(v).replace(/'/g, "''")}'::jsonb`;
  return `'${String(v).replace(/'/g, "''")}'`;
};

const rows = (table: string, cols: string[], values: unknown[][]) =>
  values.length === 0
    ? ""
    : `insert into ${table} (${cols.map((c) => (c === "order" ? '"order"' : c)).join(", ")}) values\n` +
      values.map((r) => `  (${r.map(q).join(", ")})`).join(",\n") +
      ";\n\n";

let sql = `-- Generado por scripts/generate-seed.ts. No editar a mano.\n\nbegin;\n\n`;

sql += rows(
  "categories",
  ["id", "parent_id", "name", "slug", "kind", "order", "size_range", "menu_promo_title", "menu_promo_link", "menu_promo_image"],
  demoCategories.map((c) => [c.id, c.parentId, c.name, c.slug, c.kind, c.order, c.sizeRange, c.menuPromoTitle, c.menuPromoLink, c.menuPromoImage]),
);

sql += rows(
  "search_synonyms",
  ["term", "expands_to"],
  demoSynonyms.map(([t, e]) => [t, e]),
);

sql += rows(
  "products",
  ["id", "name", "slug", "sku_base", "description", "specs", "line", "base_price", "sale_price", "is_offer", "is_new", "is_featured", "weight_g", "sold_count", "created_at"],
  demoProducts.map((p) => [p.id, p.name, p.slug, p.skuBase, p.description, p.specs, p.line, p.basePrice, p.salePrice, p.isOffer, p.isNew, p.isFeatured, p.weightG, p.soldCount, p.createdAt]),
);

sql += rows(
  "product_categories",
  ["product_id", "category_id"],
  demoProducts.flatMap((p) => p.categoryIds.map((c) => [p.id, c])),
);

sql += rows(
  "product_colors",
  ["id", "product_id", "color_name", "slug", "hex", "order"],
  demoProducts.flatMap((p) => p.colors.map((c) => [c.id, p.id, c.name, c.slug, c.hex, c.order])),
);

sql += rows(
  "product_images",
  ["id", "product_id", "color_id", "url", "alt", "order"],
  demoProducts.flatMap((p) => p.images.map((i) => [i.id, p.id, i.colorId, i.url, i.alt, i.order])),
);

sql += rows(
  "product_variants",
  ["id", "product_id", "color_id", "size", "size_sort", "sku", "stock"],
  demoProducts.flatMap((p) => p.variants.map((v) => [v.id, p.id, v.colorId, v.size, v.sizeSort, v.sku, v.stock])),
);

sql += rows(
  "payment_promos",
  ["id", "provider", "label", "installments", "interest_free", "min_amount", "logo_url", "show_in_topbar", "active", "order"],
  demoPromos.map((p) => [p.id, p.provider, p.label, p.installments, p.interestFree, p.minAmount, p.logoUrl, p.showInTopbar, p.active, p.order]),
);

sql += rows(
  "topbar_messages",
  ["id", "text", "link", "order", "active"],
  demoTopbarMessages.map((m) => [m.id, m.text, m.link, m.order, m.active]),
);

sql += rows(
  "settings",
  ["key", "value", "is_public"],
  Object.entries(demoSettings).map(([k, v]) => [k, v.value, v.isPublic]),
);

sql += rows(
  "shipping_fallback_rates",
  ["id", "zone", "cp_from", "cp_to", "service", "price", "eta_days"],
  demoFallbackRates.map((r) => [r.id, r.zone, r.cpFrom, r.cpTo, r.service, r.price, r.etaDays]),
);

sql += rows(
  "home_banners",
  ["id", "image_desktop", "image_mobile", "video_url", "title", "alt", "link", "order"],
  demoBanners.map((b) => [b.id, b.imageDesktop, b.imageMobile, b.videoUrl, b.title, b.alt, b.link, b.order]),
);

const productId = new Map(demoProducts.map((p) => [p.slug, p.id]));
for (const v of demoVideos) {
  if (!productId.has(v.productSlug)) throw new Error(`Video con producto inexistente: ${v.productSlug}`);
}
sql += rows(
  "home_videos",
  ["id", "source", "media_url", "instagram_url", "thumbnail", "caption", "product_id", "order"],
  demoVideos.map((v) => [v.id, v.source, v.mediaUrl, v.instagramUrl, v.thumbnail, v.caption, productId.get(v.productSlug), v.order]),
);

sql += rows(
  "coupons",
  ["code", "type", "value", "min_amount"],
  demoCoupons.map((c) => [c.code, c.type, c.value, c.minAmount]),
);

sql += `commit;\n`;

writeFileSync(join(root, "supabase/seed.sql"), sql);
console.log(`seed.sql: ${demoProducts.length} productos, ${demoCategories.length} categorías`);

// ---------------------------------------------------------------------------
// Imágenes de muestra (zapatilla genérica por color). Se reemplazan por fotos reales.
// ---------------------------------------------------------------------------
const demoDir = join(root, "public/demo");
mkdirSync(demoDir, { recursive: true });

const shoe = (hex: string, flip: boolean) => {
  const light = ["#f4f4f4", "#d9c7a7", "#f2c230"].includes(hex);
  const stroke = light ? "#5B6478" : "none";
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 800">
<rect width="800" height="800" fill="#ffffff"/>
<g transform="${flip ? "translate(800 0) scale(-1 1) " : ""}rotate(-12 400 420)">
<ellipse cx="400" cy="560" rx="270" ry="18" fill="#000" opacity=".06"/>
<path d="M140 520 C140 430 170 360 230 330 L330 300 C360 340 420 360 470 360 C540 360 600 380 640 420 C680 455 690 495 680 530 Z" fill="${hex}" stroke="${stroke}" stroke-width="4"/>
<path d="M130 520 L690 520 C695 545 680 560 650 560 L160 560 C135 560 125 545 130 520 Z" fill="#ffffff" stroke="#5B6478" stroke-width="4"/>
<path d="M250 330 L300 420 M290 315 L340 400 M330 305 L375 385" stroke="${light ? "#5B6478" : "#ffffff"}" stroke-width="10" stroke-linecap="round" opacity=".8"/>
<path d="M420 430 C480 420 560 440 610 470" stroke="${light ? "#5B6478" : "#ffffff"}" stroke-width="8" fill="none" opacity=".5"/>
</g></svg>`;
};

const colors = new Map<string, string>();
demoProducts.forEach((p) => p.colors.forEach((c) => colors.set(c.slug, c.hex)));
for (const [slug, hex] of colors) {
  writeFileSync(join(demoDir, `shoe-${slug}-a.svg`), shoe(hex, false));
  writeFileSync(join(demoDir, `shoe-${slug}-b.svg`), shoe(hex, true));
}

for (const section of ["hombre", "mujer", "ninos", "alpargatas"]) {
  const hex = { hombre: "#213681", mujer: "#e7a1b0", ninos: "#f2c230", alpargatas: "#1f1f1f" }[section]!;
  writeFileSync(
    join(demoDir, `promo-${section}.svg`),
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 600"><rect width="600" height="600" fill="#E93136"/>` +
      shoe(hex, false).replace(/^<svg[^>]*>/, "").replace(/<\/svg>$/, "").replace('<rect width="800" height="800" fill="#ffffff"/>', "").replace("<g ", '<g transform="scale(.75) translate(0 60)"><g ') +
      `</g></svg>`,
  );
}
console.log(`public/demo: ${colors.size * 2 + 4} imágenes`);

// Ofertas (tarjeta de sección)
writeFileSync(
  join(demoDir, "promo-ofertas.svg"),
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 600"><rect width="600" height="600" fill="#E93136"/>` +
    `<text x="300" y="380" text-anchor="middle" font-family="Arial Black, Arial, sans-serif" font-weight="900" font-size="260" fill="#ffffff">%</text></svg>`,
);

// Banners del hero (texto horneado, como llegan los banners reales de campaña)
const banner = (w: number, h: number, title: string, sub: string, shoeHex: string) => {
  const mobile = h >= w;
  const tx = mobile ? w / 2 : w * 0.07;
  const anchor = mobile ? "middle" : "start";
  const ty = mobile ? h * 0.18 : h * 0.42;
  const fs = mobile ? 70 : 92;
  const lines = title.split("|");
  const shoeSvg = shoe(shoeHex, false)
    .replace(/^<svg[^>]*>/, "")
    .replace(/<\/svg>$/, "")
    .replace('<rect width="800" height="800" fill="#ffffff"/>', "");
  const sx = mobile ? (w - 640) / 2 : w * 0.5;
  const sy = mobile ? h * 0.3 : h * 0.02;
  const scale = mobile ? 0.8 : 0.78;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}"><rect width="${w}" height="${h}" fill="#E93136"/>
<circle cx="${mobile ? w / 2 : w * 0.72}" cy="${mobile ? h * 0.66 : h / 2}" r="${mobile ? 270 : 290}" fill="#ffffff" opacity=".12"/>
<g transform="translate(${sx} ${sy}) scale(${scale})">${shoeSvg}</g>
${lines
  .map(
    (l, i) =>
      `<text x="${tx}" y="${ty + i * fs * 1.05}" text-anchor="${anchor}" font-family="Arial Black, Arial, sans-serif" font-weight="900" font-size="${fs}" fill="#ffffff">${l}</text>`,
  )
  .join("")}
<text x="${tx}" y="${ty + lines.length * fs * 1.05 + 10}" text-anchor="${anchor}" font-family="Arial, sans-serif" font-weight="700" font-size="${mobile ? 34 : 36}" fill="#ffffff">${sub}</text>
</svg>`;
};

const bannerDefs: Record<string, [string, string, string]> = {
  nuevos: ["LLEGARON|LOS NUEVOS", "Zapatillas de temporada", "#213681"],
  cuotas: ["HASTA 5 CUOTAS|SIN INTERÉS", "Visa · Master · Naranja", "#1f1f1f"],
  colegial: ["VUELTA|AL COLE", "Tenemos tu talle", "#1f1f1f"],
};
for (const [key, [title, sub, hex]] of Object.entries(bannerDefs)) {
  writeFileSync(join(demoDir, `banner-${key}-desktop.svg`), banner(1600, 600, title, sub, hex));
  writeFileSync(join(demoDir, `banner-${key}-mobile.svg`), banner(800, 800, title, sub, hex));
}

// Portadas de reels (9:16)
demoVideos.forEach((v, i) => {
  const hex = demoProducts.find((p) => p.slug === v.productSlug)!.colors[0].hex;
  const shoeSvg = shoe(hex, i % 2 === 1)
    .replace(/^<svg[^>]*>/, "")
    .replace(/<\/svg>$/, "")
    .replace('<rect width="800" height="800" fill="#ffffff"/>', "");
  writeFileSync(
    join(demoDir, `reel-${i + 1}.svg`),
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 540 960"><rect width="540" height="960" fill="${i % 3 === 0 ? "#213681" : i % 3 === 1 ? "#E93136" : "#f4f4f4"}"/>` +
      `<g transform="translate(-60 220) scale(.82)">${shoeSvg}</g></svg>`,
  );
});

// Foto del local (provisoria hasta tener la real)
writeFileSync(
  join(demoDir, "local.svg"),
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600"><rect width="800" height="600" fill="#ffffff"/>
<rect x="80" y="120" width="640" height="420" fill="#E93136"/><rect x="80" y="80" width="640" height="70" fill="#213681"/>
<text x="400" y="128" text-anchor="middle" font-family="Arial Black, Arial, sans-serif" font-size="40" fill="#ffffff">ALBERTITO CALZADOS</text>
<rect x="130" y="200" width="250" height="280" fill="#ffffff" opacity=".9"/><rect x="420" y="200" width="250" height="340" fill="#ffffff" opacity=".9"/>
<text x="400" y="580" text-anchor="middle" font-family="Arial, sans-serif" font-size="22" fill="#5B6478">Foto del local (provisoria)</text></svg>`,
);
console.log("public/demo: banners, reels y local");
