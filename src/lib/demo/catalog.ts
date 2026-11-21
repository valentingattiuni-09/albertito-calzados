/**
 * Catálogo de ejemplo. Es la única fuente de los datos de prueba:
 *  - `npm run seed:sql` genera supabase/seed.sql a partir de acá.
 *  - Si no hay Supabase configurado, la tienda lee estos mismos datos (modo demo).
 * Los IDs son determinísticos para que seed y demo coincidan.
 */
import { createHash } from "node:crypto";

export function uid(key: string): string {
  const h = createHash("md5").update(`albertito:${key}`).digest("hex");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-a${h.slice(17, 20)}-${h.slice(20, 32)}`;
}

/** Pseudo-aleatorio determinístico en [0,1) a partir de una clave. */
function rand(key: string): number {
  return parseInt(createHash("md5").update(key).digest("hex").slice(0, 8), 16) / 0xffffffff;
}

export type DemoCategory = {
  id: string;
  parentId: string | null;
  name: string;
  slug: string;
  kind: "section" | "subsection" | "offers";
  order: number;
  sizeRange: string[];
  menuPromoTitle: string | null;
  menuPromoLink: string | null;
  menuPromoImage: string | null;
};

export type DemoColor = { id: string; name: string; slug: string; hex: string; order: number };
export type DemoVariant = { id: string; colorId: string; size: string; sizeSort: number; sku: string; stock: number };
export type DemoImage = { id: string; colorId: string | null; url: string; alt: string; order: number };

export type DemoProduct = {
  id: string;
  name: string;
  slug: string;
  skuBase: string;
  description: string;
  specs: Record<string, string>;
  line: "diario" | "seleccion";
  basePrice: number;
  salePrice: number | null;
  isOffer: boolean;
  isNew: boolean;
  isFeatured: boolean;
  weightG: number;
  categoryIds: string[];
  colors: DemoColor[];
  variants: DemoVariant[];
  images: DemoImage[];
  soldCount: number;
  createdAt: string;
};

const range = (from: number, to: number) => Array.from({ length: to - from + 1 }, (_, i) => String(from + i));

/** Alpargatas: niños del 28 al 36 y adultos del 37 al 46. */
const ALPARGATA_SIZES = { ninos: range(28, 36), adultos: range(37, 46) };

const SIZES = {
  hombre: range(39, 45),
  mujer: range(35, 40),
  ninos: range(26, 35),
  alpargatas: range(28, 46),
};

// ---------------------------------------------------------------------------
// Secciones y subsecciones
// ---------------------------------------------------------------------------
const sectionDefs: {
  slug: keyof typeof SIZES | "ofertas";
  name: string;
  subs: [string, string][];
  promo?: [string, string];
}[] = [
  {
    slug: "hombre",
    name: "Hombre",
    subs: [["moda", "Moda"], ["deportivo", "Deportivo"], ["alto-verano", "Alto verano"]],
    promo: ["Zapatillas desde $ 49.000", "/hombre/deportivo"],
  },
  {
    slug: "mujer",
    name: "Mujer",
    subs: [["moda", "Moda"], ["deportivo", "Deportivo"], ["verano", "Verano"], ["invierno", "Invierno"]],
    promo: ["Llegaron las sandalias", "/mujer/verano"],
  },
  {
    slug: "ninos",
    name: "Niño",
    subs: [["moda", "Moda"], ["deportivo", "Deportivo"], ["verano", "Verano"], ["invierno", "Invierno"], ["colegial", "Colegial"]],
    promo: ["Vuelta al cole: tenemos tu talle", "/ninos/colegial"],
  },
  {
    slug: "alpargatas",
    name: "Alpargatas",
    subs: [
      ["ninos", "Niños"],
      ["adultos", "Adultos"],
      ["reforzada-clasica", "Reforzada clásica"],
      ["reforzada-premium", "Reforzada premium"],
      ["reforzada-pvc", "Reforzada PVC"],
    ],
    promo: ["Todos los colores, todos los talles", "/alpargatas"],
  },
  { slug: "ofertas", name: "Ofertas", subs: [] },
];

export const demoCategories: DemoCategory[] = sectionDefs.flatMap((s, i) => {
  const id = uid(`cat:${s.slug}`);
  const sizeRange = s.slug === "ofertas" ? [] : SIZES[s.slug];
  const section: DemoCategory = {
    id,
    parentId: null,
    name: s.name,
    slug: s.slug,
    kind: s.slug === "ofertas" ? "offers" : "section",
    order: i,
    sizeRange,
    menuPromoTitle: s.promo?.[0] ?? null,
    menuPromoLink: s.promo?.[1] ?? null,
    menuPromoImage: s.slug === "ofertas" ? null : `/demo/promo-${s.slug}.svg`,
  };
  const subs: DemoCategory[] = s.subs.map(([slug, name], j) => ({
    id: uid(`cat:${s.slug}/${slug}`),
    parentId: id,
    name,
    slug,
    kind: "subsection",
    order: j,
    // En alpargatas, Niños y Adultos tienen su propia numeración
    sizeRange: s.slug === "alpargatas" && (slug === "ninos" || slug === "adultos") ? ALPARGATA_SIZES[slug] : sizeRange,
    menuPromoTitle: null,
    menuPromoLink: null,
    menuPromoImage: null,
  }));
  return [section, ...subs];
});

// ---------------------------------------------------------------------------
// Productos
// ---------------------------------------------------------------------------
const PALETTE: Record<string, [string, string]> = {
  negro: ["Negro", "#1f1f1f"],
  blanco: ["Blanco", "#f4f4f4"],
  azul: ["Azul", "#213681"],
  rojo: ["Rojo", "#c62828"],
  gris: ["Gris", "#8a8f99"],
  marron: ["Marrón", "#6d4c3d"],
  suela: ["Suela", "#b07a4f"],
  beige: ["Beige", "#d9c7a7"],
  rosa: ["Rosa", "#e7a1b0"],
  verde: ["Verde", "#2e7d32"],
  celeste: ["Celeste", "#7fb3e0"],
  bordo: ["Bordó", "#7b1f2e"],
  amarillo: ["Amarillo", "#f2c230"],
};

type Seed = {
  name: string;
  sub: string;
  price: number;
  colors: (keyof typeof PALETTE)[];
  line?: "seleccion";
  offerPct?: number;
  isNew?: boolean;
  featured?: boolean;
  material?: string;
  /** Solo alpargatas: define la numeración y la subsección Niños/Adultos. */
  age?: keyof typeof ALPARGATA_SIZES;
};

const seeds: Record<keyof typeof SIZES, Seed[]> = {
  hombre: [
    { name: "Zapatilla urbana Ruta", sub: "moda", price: 64900, colors: ["negro", "blanco", "gris"], isNew: true },
    { name: "Zapato náutico Puerto", sub: "moda", price: 72900, colors: ["azul", "marron"], line: "seleccion", material: "Cuero" },
    { name: "Botín urbano Cuyo", sub: "moda", price: 89900, colors: ["marron", "negro"], line: "seleccion", material: "Cuero", featured: true },
    { name: "Mocasín Sierra", sub: "moda", price: 58900, colors: ["suela", "negro"], offerPct: 20 },
    { name: "Zapatilla running Trote", sub: "deportivo", price: 69900, colors: ["negro", "azul", "rojo"], isNew: true, featured: true },
    { name: "Zapatilla training Fuerza", sub: "deportivo", price: 61900, colors: ["gris", "negro"], offerPct: 25 },
    { name: "Zapatilla de lona Barrio", sub: "deportivo", price: 39900, colors: ["blanco", "negro", "azul"], isNew: true },
    { name: "Zapatilla trekking Médanos", sub: "deportivo", price: 94900, colors: ["marron", "gris"], line: "seleccion" },
    { name: "Ojota Playa Grande", sub: "alto-verano", price: 14900, colors: ["negro", "azul"], isNew: true },
    { name: "Sandalia Río Quinto", sub: "alto-verano", price: 32900, colors: ["negro", "marron"], offerPct: 15 },
    { name: "Chinela Descanso", sub: "alto-verano", price: 18900, colors: ["gris", "azul"] },
    { name: "Sandalia trekking Potrero", sub: "alto-verano", price: 45900, colors: ["negro"], line: "seleccion" },
  ],
  mujer: [
    { name: "Zapatilla urbana Luna", sub: "moda", price: 59900, colors: ["blanco", "rosa", "negro"], isNew: true, featured: true },
    { name: "Guillermina Merlo", sub: "moda", price: 54900, colors: ["negro", "suela"], offerPct: 20 },
    { name: "Mocasín Juana", sub: "moda", price: 62900, colors: ["suela", "negro", "bordo"], line: "seleccion", material: "Cuero" },
    { name: "Zapatilla plataforma Nube", sub: "moda", price: 67900, colors: ["blanco", "beige"], isNew: true },
    { name: "Zapatilla running Brisa", sub: "deportivo", price: 66900, colors: ["rosa", "gris", "negro"], isNew: true },
    { name: "Zapatilla training Ritmo", sub: "deportivo", price: 57900, colors: ["blanco", "celeste"], offerPct: 30 },
    { name: "Zapatilla de lona Plaza", sub: "deportivo", price: 37900, colors: ["blanco", "negro", "rojo"] },
    { name: "Sandalia Trapiche", sub: "verano", price: 34900, colors: ["suela", "negro", "blanco"], isNew: true },
    { name: "Ojota Carolina", sub: "verano", price: 13900, colors: ["rosa", "negro", "blanco"] },
    { name: "Sandalia plataforma Merlo", sub: "verano", price: 48900, colors: ["beige", "negro"], line: "seleccion", offerPct: 15 },
    { name: "Bota caña alta Pampa", sub: "invierno", price: 109900, colors: ["negro", "marron"], line: "seleccion", material: "Cuero", featured: true },
    { name: "Borcego Volcán", sub: "invierno", price: 79900, colors: ["negro", "suela"], offerPct: 25 },
    { name: "Pantubota Escarcha", sub: "invierno", price: 69900, colors: ["negro", "gris"] },
    { name: "Pantufla Abrigo", sub: "invierno", price: 22900, colors: ["rosa", "gris", "bordo"], isNew: true },
  ],
  ninos: [
    { name: "Zapatilla urbana Recreo", sub: "moda", price: 42900, colors: ["blanco", "azul", "rosa"], isNew: true },
    { name: "Zapatilla con abrojo Rayuela", sub: "moda", price: 38900, colors: ["negro", "rojo", "rosa"], offerPct: 20 },
    { name: "Guillermina Mini", sub: "moda", price: 34900, colors: ["negro", "rosa"] },
    { name: "Zapatilla running Pique", sub: "deportivo", price: 45900, colors: ["azul", "negro", "rosa"], isNew: true, featured: true },
    { name: "Zapatilla botita Cancha", sub: "deportivo", price: 49900, colors: ["blanco", "negro"], line: "seleccion" },
    { name: "Zapatilla luces Estrella", sub: "deportivo", price: 47900, colors: ["rosa", "azul"], offerPct: 15 },
    { name: "Sandalia Arenero", sub: "verano", price: 26900, colors: ["azul", "rosa", "amarillo"], isNew: true },
    { name: "Ojota Pileta", sub: "verano", price: 9900, colors: ["azul", "rosa", "verde"] },
    { name: "Crocs Charco", sub: "verano", price: 21900, colors: ["verde", "celeste", "rosa"], offerPct: 20 },
    { name: "Bota de lluvia Charquito", sub: "invierno", price: 29900, colors: ["amarillo", "rojo", "azul"] },
    { name: "Botita abrigada Copito", sub: "invierno", price: 44900, colors: ["marron", "negro", "rosa"], line: "seleccion" },
    { name: "Pantufla Osito", sub: "invierno", price: 16900, colors: ["gris", "rosa", "azul"], isNew: true },
    { name: "Zapato colegial Guardapolvo", sub: "colegial", price: 39900, colors: ["negro"], featured: true },
    { name: "Zapatilla colegial Recreo Negra", sub: "colegial", price: 36900, colors: ["negro"], offerPct: 10 },
    { name: "Guillermina colegial Pizarrón", sub: "colegial", price: 37900, colors: ["negro", "azul"] },
  ],
  alpargatas: [
    { name: "Alpargata Reforzada clásica", sub: "reforzada-clasica", age: "adultos", price: 12900, colors: ["negro", "azul", "rojo", "beige"], featured: true },
    { name: "Alpargata Reforzada clásica niños", sub: "reforzada-clasica", age: "ninos", price: 9900, colors: ["azul", "rojo", "verde"], isNew: true },
    { name: "Alpargata Reforzada premium", sub: "reforzada-premium", age: "adultos", price: 22900, colors: ["negro", "azul", "beige"], line: "seleccion", material: "Lona reforzada con puntera de cuero" },
    { name: "Alpargata Reforzada premium niños", sub: "reforzada-premium", age: "ninos", price: 17900, colors: ["negro", "azul"], line: "seleccion", isNew: true },
    { name: "Alpargata Reforzada PVC", sub: "reforzada-pvc", age: "adultos", price: 10900, colors: ["negro", "verde"], offerPct: 10, material: "Lona con suela de PVC" },
    { name: "Alpargata Reforzada PVC niños", sub: "reforzada-pvc", age: "ninos", price: 8900, colors: ["negro", "azul", "rojo"], offerPct: 15, material: "Lona con suela de PVC" },
  ],
};

const slugify = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

const roundPrice = (n: number) => Math.round(n / 100) * 100;

const BASE_DATE = Date.UTC(2026, 10, 1);

export const demoProducts: DemoProduct[] = (Object.keys(seeds) as (keyof typeof SIZES)[]).flatMap((section, si) =>
  seeds[section].map((s, i): DemoProduct => {
    const slug = slugify(`${s.name}-${section === "ninos" ? "nino" : section === "alpargatas" ? "" : section}`);
    const key = `prod:${slug}`;
    const id = uid(key);
    const skuBase = `ALB-${String(si + 1)}${String(i + 1).padStart(3, "0")}`;
    const colors: DemoColor[] = s.colors.map((c, ci) => ({
      id: uid(`${key}:color:${c}`),
      name: PALETTE[c][0],
      slug: c,
      hex: PALETTE[c][1],
      order: ci,
    }));
    const sizes = s.age ? ALPARGATA_SIZES[s.age] : SIZES[section];
    const variants: DemoVariant[] = colors.flatMap((c) =>
      sizes.map((size) => {
        const r = rand(`${key}:${c.slug}:${size}`);
        return {
          id: uid(`${key}:var:${c.slug}:${size}`),
          colorId: c.id,
          size,
          sizeSort: Number(size),
          sku: `${skuBase}-${c.slug.slice(0, 3).toUpperCase()}-${size}`,
          stock: r < 0.18 ? 0 : Math.ceil(r * 8),
        };
      }),
    );
    const images: DemoImage[] = colors.flatMap((c) => [
      { id: uid(`${key}:img:${c.slug}:1`), colorId: c.id, url: `/demo/shoe-${c.slug}-a.svg`, alt: `${s.name} ${c.name}`, order: 0 },
      { id: uid(`${key}:img:${c.slug}:2`), colorId: c.id, url: `/demo/shoe-${c.slug}-b.svg`, alt: `${s.name} ${c.name}, vista lateral`, order: 1 },
    ]);
    const sectionCat = demoCategories.find((c) => c.slug === section && c.parentId === null)!;
    const subCat = demoCategories.find((c) => c.slug === s.sub && c.parentId === sectionCat.id)!;
    const ageCat = s.age ? demoCategories.find((c) => c.slug === s.age && c.parentId === sectionCat.id) : undefined;
    return {
      id,
      name: s.name,
      slug,
      skuBase,
      description: `${s.name}: cómoda, liviana y lista para todos los días. Probala, caminá y decidí.`,
      specs: {
        Material: s.material ?? "Sintético",
        Suela: section === "alpargatas" ? (s.sub === "reforzada-pvc" ? "PVC" : "Yute con refuerzo de goma") : "Goma",
        Origen: "Argentina",
      },
      line: s.line ?? "diario",
      basePrice: s.price,
      salePrice: s.offerPct ? roundPrice(s.price * (1 - s.offerPct / 100)) : null,
      isOffer: Boolean(s.offerPct),
      isNew: Boolean(s.isNew),
      isFeatured: Boolean(s.featured),
      weightG: section === "alpargatas" ? (s.age === "ninos" ? 300 : 450) : section === "ninos" ? 600 : 1000,
      categoryIds: [sectionCat.id, subCat.id, ...(ageCat ? [ageCat.id] : [])],
      colors,
      variants,
      images,
      soldCount: Math.floor(rand(`${key}:sold`) * 120),
      createdAt: new Date(BASE_DATE - (si * 20 + i) * 86400000).toISOString(),
    };
  }),
);

// ---------------------------------------------------------------------------
// Promos, mensajes, settings, tarifas de respaldo
// ---------------------------------------------------------------------------
export type DemoPromo = {
  id: string;
  provider: string;
  label: string;
  installments: number;
  interestFree: boolean;
  minAmount: number;
  logoUrl: string | null;
  showInTopbar: boolean;
  active: boolean;
  order: number;
};


export const demoPromos: DemoPromo[] = [
  { provider: "visa", label: "Visa", installments: 3, active: true },
  { provider: "master", label: "Mastercard", installments: 3, active: true },
  { provider: "tarjeta_verde", label: "Tarjeta Verde", installments: 3, active: true },
  { provider: "naranja", label: "Naranja", installments: 5, active: true },
  // Go Cuotas: cargado pero inactivo hasta que se defina
  { provider: "go_cuotas", label: "Go Cuotas", installments: 4, active: false },
].map((p, i) => ({
  id: uid(`promo:${p.provider}`),
  interestFree: true,
  minAmount: 0,
  logoUrl: null, // se carga desde el admin (logo oficial de cada tarjeta)
  showInTopbar: true,
  order: i,
  ...p,
}));

export const demoTopbarMessages = [
  { id: uid("topbar:envios"), text: "Envíos a todo el país con Andreani y Correo Argentino", link: null as string | null, order: 0, active: true },
];

export const demoSettings: Record<string, { value: unknown; isPublic: boolean }> = {
  whatsapp: { value: { number: "5492657000000", display: "2657 00-0000" }, isPublic: true },
  store: {
    value: {
      address: "Edison 15",
      city: "Villa Mercedes",
      province: "San Luis",
      hours: "Lunes a sábado",
      hoursDetail: "Lunes a sábado de 9 a 13 y de 17 a 21",
      instagram: "albertitocalzados",
      email: "hola@albertitocalzados.com.ar",
    },
    isPublic: true,
  },
  newsletter_popup: {
    value: {
      title: "Enterate antes que nadie",
      text: "Recibí ofertas y lanzamientos en tu mail",
      delaySeconds: 5,
      enabled: true,
    },
    isPublic: true,
  },
  // Precio sin impuestos nacionales = precio / tax_factor (IVA 21%). Ajustable desde el admin.
  tax: { value: { factor: 1.21, label: "Precio sin impuestos nacionales" }, isPublic: true },
  shipping: {
    value: { originCp: "5730", defaultBox: { weightG: 1000, l: 33, w: 20, h: 12 }, cacheHours: 6 },
    isPublic: false,
  },
};

export const demoFallbackRates = [
  { zone: "San Luis", cpFrom: 5700, cpTo: 5899, domicilio: 6900, sucursal: 4900, eta: 2 },
  { zone: "Cuyo y Córdoba", cpFrom: 5000, cpTo: 5699, domicilio: 8900, sucursal: 6500, eta: 4 },
  { zone: "AMBA", cpFrom: 1000, cpTo: 1999, domicilio: 10900, sucursal: 7900, eta: 5 },
  { zone: "Centro", cpFrom: 2000, cpTo: 3999, domicilio: 10900, sucursal: 7900, eta: 5 },
  { zone: "Norte", cpFrom: 4000, cpTo: 4999, domicilio: 12900, sucursal: 9500, eta: 7 },
  { zone: "Cuyo sur y Patagonia", cpFrom: 5900, cpTo: 9999, domicilio: 13900, sucursal: 9900, eta: 8 },
].flatMap((z) =>
  (["domicilio", "sucursal"] as const).map((service) => ({
    id: uid(`fallback:${z.zone}:${service}`),
    zone: z.zone,
    cpFrom: z.cpFrom,
    cpTo: z.cpTo,
    service,
    price: z[service],
    etaDays: z.eta,
  })),
);

export const demoSynonyms: [string, string[]][] = [
  ["zapas", ["zapatilla", "zapatillas"]],
  ["zapa", ["zapatilla"]],
  ["tenis", ["zapatilla"]],
  ["ojotas", ["ojota", "chinela"]],
  ["ojota", ["ojota", "chinela"]],
  ["bota", ["bota", "botita", "pantubota", "borcego"]],
  ["chancletas", ["ojota", "chinela"]],
  ["alpargata", ["alpargatas"]],
  ["guillermina", ["guillermina", "colegial"]],
  ["escolar", ["colegial"]],
  ["cole", ["colegial"]],
  ["borcegos", ["borcego"]],
  ["botas", ["bota", "botita", "pantubota", "borcego"]],
  ["nene", ["nino"]],
  ["nena", ["nino"]],
  ["chicos", ["nino"]],
  ["running", ["running", "deportivo"]],
];

// ---------------------------------------------------------------------------
// Home: banners y videos
// ---------------------------------------------------------------------------
export type DemoBanner = {
  id: string;
  imageDesktop: string;
  imageMobile: string;
  videoUrl: string | null;
  title: string;
  alt: string;
  link: string;
  order: number;
};

export const demoBanners: DemoBanner[] = [
  { key: "nuevos", title: "Llegaron los nuevos", alt: "Llegaron los nuevos. Zapatillas de temporada.", link: "/hombre/deportivo" },
  { key: "cuotas", title: "Hasta 5 cuotas sin interés", alt: "Hasta 5 cuotas sin interés con Naranja.", link: "/ofertas" },
  { key: "colegial", title: "Vuelta al cole", alt: "Vuelta al cole: tenemos tu talle.", link: "/ninos/colegial" },
].map((b, i) => ({
  id: uid(`banner:${b.key}`),
  imageDesktop: `/demo/banner-${b.key}-desktop.svg`,
  imageMobile: `/demo/banner-${b.key}-mobile.svg`,
  videoUrl: null,
  title: b.title,
  alt: b.alt,
  link: b.link,
  order: i,
}));

export type DemoVideo = {
  id: string;
  source: "upload" | "instagram";
  mediaUrl: string | null;
  instagramUrl: string | null;
  thumbnail: string;
  caption: string;
  productSlug: string;
  order: number;
};

export const demoVideos: DemoVideo[] = [
  ["zapatilla-running-trote-hombre", "Trote en la plaza"],
  ["zapatilla-urbana-luna-mujer", "Luna, todo el día"],
  ["alpargata-reforzada-clasica", "La clásica de siempre"],
  ["bota-cana-alta-pampa-mujer", "Pampa para el frío"],
  ["zapatilla-running-pique-nino", "Pique al recreo"],
  ["borcego-volcan-mujer", "Volcán con todo"],
].map(([slug, caption], i) => ({
  id: uid(`video:${slug}`),
  source: "upload",
  mediaUrl: null, // en demo no hay video: se muestra la portada
  instagramUrl: null,
  thumbnail: `/demo/reel-${i + 1}.svg`,
  caption,
  productSlug: slug,
  order: i,
}));

/** Cupones de prueba (también van al seed). */
export const demoCoupons = [{ code: "BIENVENIDA10", type: "percent" as const, value: 10, minAmount: 0 }];
