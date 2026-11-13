import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { NextResponse, type NextRequest } from "next/server";
import { getAdmin } from "@/lib/admin/auth";
import { hasSupabase, serviceClient } from "@/lib/supabase/clients";

const IMAGE_TYPES: Record<string, string> = { "image/webp": "webp", "image/jpeg": "jpg", "image/png": "png", "image/avif": "avif" };
const VIDEO_TYPES: Record<string, string> = { "video/mp4": "mp4", "video/webm": "webm", "video/quicktime": "mov" };
const MAX_IMAGE = 8 * 1024 * 1024;
const MAX_VIDEO = 80 * 1024 * 1024;

/**
 * Subida de fotos y videos del panel. Las fotos llegan ya comprimidas a WebP desde el navegador.
 * Con Supabase → bucket público "media"; en modo demo → public/uploads (solo desarrollo local).
 */
export async function POST(req: NextRequest) {
  if (!(await getAdmin())) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "Falta el archivo." }, { status: 400 });

  const ext = IMAGE_TYPES[file.type] ?? VIDEO_TYPES[file.type];
  if (!ext) return NextResponse.json({ error: "Formato no permitido. Subí JPG, PNG, WebP, MP4 o WebM." }, { status: 400 });
  const isVideo = file.type in VIDEO_TYPES;
  if (file.size > (isVideo ? MAX_VIDEO : MAX_IMAGE)) {
    return NextResponse.json({ error: isVideo ? "El video supera los 80 MB." : "La foto supera los 8 MB." }, { status: 400 });
  }

  const folder = (String(form?.get("folder") ?? "general").replace(/[^a-z0-9-]/g, "") || "general").slice(0, 30);
  const name = `${folder}/${new Date().toISOString().slice(0, 7)}/${randomUUID()}.${ext}`;
  const bytes = Buffer.from(await file.arrayBuffer());

  if (hasSupabase) {
    const storage = serviceClient().storage.from("media");
    const { error } = await storage.upload(name, bytes, { contentType: file.type, cacheControl: "31536000", upsert: false });
    if (error) return NextResponse.json({ error: "No se pudo subir el archivo." }, { status: 500 });
    return NextResponse.json({ url: storage.getPublicUrl(name).data.publicUrl, type: isVideo ? "video" : "image" });
  }

  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Configurá Supabase para subir archivos en producción." }, { status: 503 });
  }
  const dest = join(process.cwd(), "public", "uploads", name);
  await mkdir(join(dest, ".."), { recursive: true });
  await writeFile(dest, bytes);
  return NextResponse.json({ url: `/uploads/${name}`, type: isVideo ? "video" : "image" });
}
