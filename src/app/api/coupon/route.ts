import { NextResponse, type NextRequest } from "next/server";
import { findCoupon, validateCart } from "@/lib/orders/orders";

/** Valida un cupón contra el subtotal real del carrito. */
export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as { code?: string; items?: { variantId: string; qty: number }[] } | null;
  const { subtotal } = await validateCart(Array.isArray(body?.items) ? body.items : []);
  const res = await findCoupon(String(body?.code ?? ""), subtotal);
  if ("error" in res) return NextResponse.json({ ok: false, message: res.error });
  return NextResponse.json({ ok: true, code: res.coupon.code, discount: res.discount });
}
