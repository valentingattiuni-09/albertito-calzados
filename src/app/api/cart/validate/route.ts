import { NextResponse, type NextRequest } from "next/server";
import { validateCart } from "@/lib/orders/orders";

/** Revalida precio y stock del carrito (al abrir el carrito y antes de pagar). */
export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as { items?: { variantId: string; qty: number }[] } | null;
  const result = await validateCart(Array.isArray(body?.items) ? body.items : []);
  return NextResponse.json({
    subtotal: result.subtotal,
    missing: result.missing,
    lines: result.lines.map((l) => ({
      variantId: l.id,
      productId: l.productId,
      slug: l.slug,
      name: l.name,
      colorName: l.colorName,
      colorSlug: l.colorSlug,
      size: l.size,
      price: l.price,
      image: l.image,
      qty: l.qty,
      stock: l.stock,
      issue: l.issue,
    })),
  });
}
