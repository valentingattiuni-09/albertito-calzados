import { NextResponse, type NextRequest } from "next/server";
import { signReceipt } from "@/lib/orders/demo-receipt";
import { hasSupabase } from "@/lib/supabase/clients";
import { getOrder } from "@/lib/orders/orders";
import { payOrder, type PaymentInput } from "@/lib/orders/pay";

/** Reintento de pago de un pedido rechazado (mismo pedido, otra tarjeta). */
export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as { number?: string; accessToken?: string; payment?: PaymentInput } | null;
  const order = body?.number && body.accessToken ? await getOrder(body.number, body.accessToken) : null;
  if (!order) return NextResponse.json({ ok: false, message: "No encontramos el pedido." }, { status: 404 });
  if (order.status === "cancelado") return NextResponse.json({ ok: false, message: "Este pedido fue cancelado." }, { status: 409 });
  if (!body?.payment) return NextResponse.json({ ok: false, message: "Falta el pago." }, { status: 400 });

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? req.nextUrl.origin;
  const { order: paid, message } = await payOrder(order, body.payment, siteUrl);
  return NextResponse.json({
    ok: paid.paymentStatus !== "rechazado",
    number: paid.number,
    accessToken: paid.accessToken,
    total: paid.total,
    paymentStatus: paid.paymentStatus,
    message,
    receipt: !hasSupabase && paid.paymentStatus !== "rechazado" ? signReceipt(paid) : undefined,
  });
}
