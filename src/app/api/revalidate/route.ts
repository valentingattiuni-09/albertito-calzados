import { revalidateTag } from "next/cache";
import { NextResponse, type NextRequest } from "next/server";
import { secretMatches, TABLE_TAGS, TAGS } from "@/lib/data/tags";

/**
 * Aviso de cambios (el back office de Albertito o el webhook de Supabase) → invalida la caché de la tienda.
 * Configurar: POST https://<dominio>/api/revalidate con header `x-revalidate-secret` (comparado en tiempo constante).
 * Body (formato Supabase): { type, table, record, old_record }
 */
export async function POST(req: NextRequest) {
  if (!secretMatches(process.env.REVALIDATE_SECRET, req.headers.get("x-revalidate-secret"))) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = (await req.json().catch(() => null)) as {
    table?: string;
    record?: { slug?: string } | null;
    old_record?: { slug?: string } | null;
  } | null;
  if (!body?.table) return NextResponse.json({ error: "missing table" }, { status: 400 });

  const tags = new Set(TABLE_TAGS[body.table] ?? []);
  for (const slug of [body.record?.slug, body.old_record?.slug]) {
    if (body.table === "products" && slug) tags.add(TAGS.product(slug));
  }
  tags.forEach((t) => revalidateTag(t, "max"));

  return NextResponse.json({ revalidated: [...tags] });
}
