/** Formas que devuelve la API de la tienda del back office (`/api/v1/store/*`). Montos en CENTAVOS. */
export type BoBanner = { desktop: string; mobile: string | null } | null;

export type BoNavSection = {
  id: string;
  name: string;
  slug: string;
  kind: "section" | "offers";
  href: string;
  sizeRange: string[];
  promo: { title: string; link: string; image: string | null } | null;
  banner: BoBanner;
  children: { id: string; name: string; slug: string; href: string; banner: BoBanner }[];
};

export type BoColor = { name: string; slug: string; hex: string | null };

export type BoCard = {
  id: string;
  name: string;
  slug: string;
  line: "diario" | "seleccion" | null;
  basePriceCents: number;
  priceCents: number;
  discountPct: number;
  onSale: boolean;
  isNew: boolean;
  isFeatured: boolean;
  soldCount: number;
  createdAt: string;
  images: string[];
  colors: BoColor[];
  sizesInStock: string[];
  categoryIds: string[];
  brand: { name: string; slug: string };
};

export type BoCatalogPage = { items: BoCard[]; nextCursor: string | null };

export type BoDetail = BoCard & {
  skuBase: string | null;
  description: string;
  specs: Record<string, string>;
  media: { url: string; alt: string; type: "image" | "video"; colorSlug: string | null }[];
  variants: { id: string; colorSlug: string; size: string; sizeSort: number; sku: string; stock: number; listPriceCents: number; priceCents: number }[];
  weightG: number | null;
};

export type BoLiveVariant = {
  id: string;
  productId: string;
  productSlug: string;
  productName: string;
  sku: string;
  size: string;
  color: BoColor;
  listPriceCents: number;
  priceCents: number;
  discountPct: number;
  onSale: boolean;
  stock: number;
  weightG: number | null;
  box: { lengthCm: number; widthCm: number; heightCm: number } | null;
  image: string | null;
};

export type BoLookup = { items: BoLiveVariant[]; missing: string[] };

export type BoSettings = {
  whatsapp: { number: string; display: string };
  store: { address: string; city: string; province: string; hours: string; hoursDetail: string; instagram: string; email: string };
  newsletterPopup: { title: string; text: string; delaySeconds: number; enabled: boolean };
  tax: { factor: number; label: string };
};
