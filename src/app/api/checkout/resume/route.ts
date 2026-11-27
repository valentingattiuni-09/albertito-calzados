import { NextResponse, type NextRequest } from "next/server";
import { boResume } from "@/lib/backoffice/checkout";
import { errorAction, isOrderNumber } from "@/lib/backoffice/checkout-map";
import { clientIpOf, saveOrderToken } from "@/lib/backoffice/order-cookie";
import { isBackoffice } from "@/lib/backoffice/source";

/**
 * Canje del link «Probar de nuevo» del mail (la firma que venía después de #r=). La API da un token nuevo del pedido: se guarda en la cookie y el
 * navegador nunca lo ve. Body: { number, signature }
 */
export async function POST(req: NextRequest) {
  if (!isBackoffice()) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  const body = (await req.json().catch(() => null)) as { number?: string; signature?: string } | null;
  const number = String(body?.number ?? "").toUpperCase();
  const signature = String(body?.signature ?? "");
  if (!isOrderNumber(number) || !/^\d{9,11}\.[A-Za-z0-9_-]{43}$/.test(signature)) return NextResponse.json({ ok: false, message: "No encontramos ese pedido." }, { status: 404 });
  const res = await boResume(number, signature, clientIpOf(req.headers));
  if (res.status !== 200 || !res.body.accessToken) {
    const a = errorAction(res.body, res.status);
    return NextResponse.json({ ok: false, code: res.body.code ?? null, message: a.message, action: a.action }, { status: res.status === 410 ? 410 : res.status === 429 ? 429 : res.status === 409 ? 409 : 404 });
  }
  await saveOrderToken(number, res.body.accessToken);
  return NextResponse.json({ ok: true, storeStatus: res.body.storeStatus }, { headers: { "Cache-Control": "no-store" } });
}
