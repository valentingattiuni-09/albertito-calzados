import { NextResponse, type NextRequest } from "next/server";
import { isBackoffice } from "@/lib/backoffice/source";
import { COUPONS_CLOSED_MESSAGE } from "@/lib/backoffice/guard";
import { findCoupon, validateCart } from "@/lib/orders/orders";

/** Valida un cupón contra el subtotal real del carrito. */
export async function POST(req: NextRequest) {
  // Con el back office los cupones llegan en la fase C (el checkout no muestra el campo)
  if (isBackoffice()) return NextResponse.json({ ok: false, message: COUPONS_CLOSED_MESSAGE }, { status: 404 });
  const body = (await req.json().catch(() => null)) as { code?: string; items?: { variantId: string; qty: number }[] } | null;
  const { subtotal } = await validateCart(Array.isArray(body?.items) ? body.items : []);
  const res = await findCoupon(String(body?.code ?? ""), subtotal);
  if ("error" in res) return NextResponse.json({ ok: false, message: res.error });
  return NextResponse.json({ ok: true, code: res.coupon.code, discount: res.discount });
}
