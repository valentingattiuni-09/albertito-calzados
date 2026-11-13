import { revalidateTag } from "next/cache";
import { NextResponse, type NextRequest } from "next/server";
import { TABLE_TAGS, TAGS } from "@/lib/data/tags";

/**
 * Webhook de Supabase (Database → Webhooks) → invalida la caché de la tienda.
 * Configurar: POST https://<dominio>/api/revalidate con header `x-revalidate-secret`.
 * Body (formato Supabase): { type, table, record, old_record }
 */
export async function POST(req: NextRequest) {
  const secret = process.env.REVALIDATE_SECRET;
  if (!secret || req.headers.get("x-revalidate-secret") !== secret) {
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
