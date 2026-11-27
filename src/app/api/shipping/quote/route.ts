import { NextResponse, type NextRequest } from "next/server";
import { isBackoffice } from "@/lib/backoffice/source";
import { boQuote } from "@/lib/backoffice/checkout";
import { errorAction, toQuoteState } from "@/lib/backoffice/checkout-map";
import { getLiveVariants, getProductShippingData } from "@/lib/orders/live";
import { quoteShipping, type PackageInput } from "@/lib/shipping/service";
import { normalizeCp } from "@/lib/shipping/types";

/**
 * Cotizador de envío (ficha, carrito y checkout).
 * Body: { cp, items: [{ variantId, qty }] }  o  { cp, productId, qty } desde la ficha antes de elegir talle.
 */
export async function POST(req: NextRequest) {
  if (isBackoffice()) return quoteWithBackoffice(req);
  const body = (await req.json().catch(() => null)) as {
    cp?: string;
    items?: { variantId: string; qty: number }[];
    productId?: string;
    qty?: number;
  } | null;

  const cp = normalizeCp(String(body?.cp ?? ""));
  if (!cp) return NextResponse.json({ error: "Revisá el código postal: son 4 números." }, { status: 400 });

  let packages: PackageInput[] = [];
  if (Array.isArray(body?.items) && body.items.length > 0) {
    const live = await getLiveVariants(body.items.map((i) => i.variantId));
    packages = body.items
      .map((i) => {
        const v = live.get(i.variantId);
        return v ? { weightG: v.weightG, box: v.box, qty: Math.max(1, Math.min(20, Math.floor(i.qty))) } : null;
      })
      .filter((x): x is PackageInput => x !== null);
  } else if (body?.productId) {
    const p = await getProductShippingData(body.productId);
    if (p) packages = [{ ...p, qty: Math.max(1, Math.min(20, Math.floor(body.qty ?? 1))) }];
  }
  if (packages.length === 0) return NextResponse.json({ error: "No hay productos para cotizar." }, { status: 400 });

  const result = await quoteShipping(cp, packages);
  return NextResponse.json(result);
}

/** Con el back office: la API cotiza con las empresas (con caché, respaldo por zona y retiro). Necesita las variantes: en la ficha, con el talle elegido. */
async function quoteWithBackoffice(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as { cp?: string; items?: { variantId: string; qty: number }[] } | null;
  const cp = normalizeCp(String(body?.cp ?? ""));
  if (!cp) return NextResponse.json({ error: "Revisá el código postal: son 4 números." }, { status: 400 });
  if (!Array.isArray(body?.items) || body.items.length === 0) return NextResponse.json({ error: "Elegí tu talle para calcular el envío." }, { status: 400 });
  const res = await boQuote(cp, body.items);
  if (res.status !== 200) return NextResponse.json({ error: errorAction(res.body, res.status).message }, { status: res.status >= 500 ? 503 : res.status });
  return NextResponse.json(toQuoteState(res.body), { headers: { "Cache-Control": "no-store" } });
}
