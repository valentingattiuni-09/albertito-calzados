/**
 * Política de URLs de fotos y videos. next/image solo acepta hosts configurados en next.config.ts:
 * una URL de otro host rompería la página. Por eso se valida al guardar (panel, API y CSV).
 *
 * Permitidos: rutas locales ("/uploads/…"), el Storage de Supabase y los hosts de IMAGE_HOSTS
 * (separados por coma, ej. "cdn.albertitocalzados.com.ar").
 */
export function allowedMediaHosts(): string[] {
  const hosts = (process.env.IMAGE_HOSTS ?? "")
    .split(",")
    .map((h) => h.trim().toLowerCase())
    .filter(Boolean);
  const sb = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (sb) hosts.push(new URL(sb).hostname.toLowerCase());
  return hosts;
}

export function isAllowedMediaUrl(url: string | null | undefined): boolean {
  if (!url) return true;
  if (url.startsWith("/") && !url.startsWith("//")) return true;
  try {
    const u = new URL(url);
    return u.protocol === "https:" && allowedMediaHosts().includes(u.hostname.toLowerCase());
  } catch {
    return false;
  }
}

export const MEDIA_URL_HINT = "Subí el archivo desde el panel o usá una URL de un host permitido (IMAGE_HOSTS).";

export const NO_PHOTO = "/demo/sin-foto.svg";

/** Para mostrar: si la URL no es de un host permitido, se usa un placeholder (nunca rompe la página). */
export function safeMediaUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  return isAllowedMediaUrl(url) ? url : NO_PHOTO;
}
