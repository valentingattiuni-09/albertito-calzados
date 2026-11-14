import { NextResponse, type NextRequest } from "next/server";
import { searchProducts } from "@/lib/data/catalog";
import { getNavigation, getPaymentPromos } from "@/lib/data/layout";
import { formatPrice } from "@/lib/format";
import { bestInstallment } from "@/lib/pricing";
import { normalize, termScore, tokens } from "@/lib/search/normalize";

export type Suggestion = {
  products: {
    name: string;
    href: string;
    image: string | null;
    price: string;
    basePrice: string | null;
    installments: string | null;
  }[];
  categories: { name: string; href: string }[];
  total: number;
};

/** Autocompletado del buscador: productos (foto, precio, cuotas) y categorías que coinciden. */
export async function GET(req: NextRequest) {
  const q = (req.nextUrl.searchParams.get("q") ?? "").slice(0, 80);
  if (normalize(q).length < 2) return NextResponse.json({ products: [], categories: [], total: 0 } satisfies Suggestion);

  const [results, nav, promos] = await Promise.all([searchProducts(q, 60), getNavigation(), getPaymentPromos()]);

  const terms = tokens(q);
  const categories: Suggestion["categories"] = [];
  for (const s of nav) {
    const candidates = [{ name: s.name, href: s.href }, ...s.children.map((c) => ({ name: `${s.name} · ${c.name}`, href: c.href }))];
    for (const c of candidates) {
      const words = tokens(c.name);
      if (terms.every((t) => termScore(t, words) >= 2)) categories.push(c);
    }
  }

  const body: Suggestion = {
    total: results.length,
    categories: categories.slice(0, 4),
    products: results.slice(0, 6).map((p) => {
      const cuota = bestInstallment(p.price, promos);
      return {
        name: p.name,
        href: `/producto/${p.slug}`,
        image: p.images[0] ?? null,
        price: formatPrice(p.price),
        basePrice: p.onSale ? formatPrice(p.basePrice) : null,
        installments: cuota ? `${cuota.installments} cuotas sin interés de ${formatPrice(cuota.amount)}` : null,
      };
    }),
  };
  return NextResponse.json(body, { headers: { "Cache-Control": "public, max-age=60" } });
}
