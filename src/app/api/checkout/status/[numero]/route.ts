import { NextResponse, type NextRequest } from "next/server";
import { boOrder } from "@/lib/backoffice/checkout";
import { isOrderNumber } from "@/lib/backoffice/checkout-map";
import { readOrderToken } from "@/lib/backoffice/order-cookie";
import { isBackoffice } from "@/lib/backoffice/source";

/** Estado del pedido para la consulta periódica de la confirmación (token en la cookie). Sin datos personales. */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ numero: string }> }) {
  if (!isBackoffice()) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  const { numero } = await params;
  const token = isOrderNumber(numero) ? await readOrderToken(numero) : null;
  if (!token) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  const res = await boOrder(numero, token);
  if (res.status !== 200) return NextResponse.json({ error: "No encontrado" }, { status: res.status === 404 ? 404 : 503 });
  return NextResponse.json({ storeStatus: res.body.storeStatus, payment: res.body.payment ? { status: res.body.payment.status } : null }, { headers: { "Cache-Control": "no-store" } });
}
