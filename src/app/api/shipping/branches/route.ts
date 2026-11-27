import { NextResponse, type NextRequest } from "next/server";
import { boBranches } from "@/lib/backoffice/checkout";
import { branchProviderOf, errorAction, toBranches } from "@/lib/backoffice/checkout-map";
import { isBackoffice } from "@/lib/backoffice/source";
import { normalizeCp } from "@/lib/shipping/types";

/** Sucursales de la opción elegida (solo con el back office). Correo Argentino necesita la provincia. Body: { optionId, cp, province? } */
export async function POST(req: NextRequest) {
  if (!isBackoffice()) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  const body = (await req.json().catch(() => null)) as { optionId?: string; cp?: string; province?: string } | null;
  const which = branchProviderOf(String(body?.optionId ?? ""));
  const cp = normalizeCp(String(body?.cp ?? ""));
  if (!which || !cp) return NextResponse.json({ error: "Elegí el envío a sucursal y tu código postal." }, { status: 400 });
  if (which.needsProvince && !body?.province) return NextResponse.json({ error: "Elegí la provincia para ver las sucursales.", needsProvince: true }, { status: 400 });
  const res = await boBranches(which.provider, cp, body?.province || undefined);
  if (res.status !== 200) return NextResponse.json({ error: errorAction(res.body, res.status).message }, { status: res.status >= 500 ? 503 : res.status });
  return NextResponse.json({ branches: toBranches(res.body.branches ?? []), needsProvince: which.needsProvince }, { headers: { "Cache-Control": "no-store" } });
}
