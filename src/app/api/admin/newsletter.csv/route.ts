import { NextResponse } from "next/server";
import { getAdmin } from "@/lib/admin/auth";
import { listSubscribers } from "@/lib/admin/repo";

/** Exporta los suscriptores (solo admin). CSV con separador ";" para que Excel en español lo abra bien. */
export async function GET() {
  if (!(await getAdmin())) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const subs = await listSubscribers();
  // Evita que Excel interprete celdas que empiezan con = + - @ como fórmulas
  const cell = (v: string | null) => {
    const s = (v ?? "").replace(/"/g, '""');
    return `"${/^[=+\-@]/.test(s) ? `'${s}` : s}"`;
  };
  const rows = [
    ["email", "para_quien", "cumpleanos", "origen", "fecha"].join(";"),
    ...subs.map((s) => [cell(s.email), cell(s.preference), cell(s.birthDate), cell(s.source), cell(s.createdAt.slice(0, 10))].join(";")),
  ];
  return new NextResponse(`﻿${rows.join("\r\n")}`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="newsletter-albertito-${new Date().toISOString().slice(0, 10)}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
