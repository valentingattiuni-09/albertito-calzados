export type CategoryBanner = { desktop: string; mobile: string | null } | null;

export type NavSubsection = {
  id: string;
  name: string;
  slug: string;
  href: string;
  banner: CategoryBanner;
};

export type NavSection = {
  id: string;
  name: string;
  slug: string;
  kind: "section" | "offers";
  href: string;
  sizeRange: string[];
  promo: { title: string; link: string; image: string | null } | null;
  banner: CategoryBanner;
  children: NavSubsection[];
};

export type PaymentPromo = {
  id: string;
  provider: string;
  label: string;
  installments: number;
  interestFree: boolean;
  minAmount: number;
  logoUrl: string | null;
  showInTopbar: boolean;
};

export type TopbarMessage = { id: string; text: string; link: string | null };

export type ProductLine = "diario" | "seleccion";
export type ColorSummary = { name: string; slug: string; hex: string };

/** Lo que necesita una tarjeta de producto y los filtros del listado. */
export type ProductCard = {
  id: string;
  name: string;
  slug: string;
  line: ProductLine;
  basePrice: number;
  price: number;
  discountPct: number;
  onSale: boolean;
  isNew: boolean;
  isFeatured: boolean;
  soldCount: number;
  createdAt: string;
  images: string[]; // 1ª y 2ª foto (hover)
  colors: ColorSummary[];
  sizesInStock: string[];
  categoryIds: string[];
  /** Texto para búsqueda en modo demo: nombre + categorías. */
  searchText: string;
};

export type ProductVariant = { id: string; colorSlug: string; size: string; sizeSort: number; sku: string; stock: number };
export type ProductMedia = { url: string; alt: string; type: "image" | "video"; colorSlug: string | null };

export type ProductDetail = ProductCard & {
  skuBase: string | null;
  description: string;
  specs: Record<string, string>;
  media: ProductMedia[];
  variants: ProductVariant[];
  weightG: number | null;
};

export type StoreSettings = {
  whatsapp: { number: string; display: string };
  store: {
    address: string;
    city: string;
    province: string;
    hours: string;
    hoursDetail: string;
    instagram: string;
    email: string;
  };
  newsletterPopup: { title: string; text: string; delaySeconds: number; enabled: boolean };
  tax: { factor: number; label: string };
};
