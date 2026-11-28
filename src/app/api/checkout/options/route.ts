import { NextResponse, type NextRequest } from "next/server";
import { boPaymentOptions } from "@/lib/backoffice/checkout";
import { isBackoffice } from "@/lib/backoffice/source";

/** Medios de pago activos y planes de cuotas para un total en pesos (solo con el back office). Solo datos públicos (la clave PÚBLICA de Payway). */
export async function GET(req: NextRequest) {
  if (!isBackoffice()) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  const total = Number(req.nextUrl.searchParams.get("total"));
  if (!Number.isFinite(total) || total <= 0) return NextResponse.json({ error: "Total inválido" }, { status: 400 });
  const res = await boPaymentOptions(total * 100);
  if (res.status !== 200) return NextResponse.json({ error: "No pudimos cargar los medios de pago. Probá de nuevo." }, { status: 503 });
  return NextResponse.json(res.body, { headers: { "Cache-Control": "no-store" } });
}
