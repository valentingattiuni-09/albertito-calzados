import "server-only";

/**
 * Integración preparada con la API de Instagram (cuenta profesional, "Instagram API with Instagram Login").
 * Con INSTAGRAM_ACCESS_TOKEN (token de larga duración) el panel puede traer los últimos posts y reels
 * para elegir cuáles mostrar en "Mirá cómo quedan".
 *
 * TODO(Fase 6): obtener el token desde la app de Meta de la cuenta @albertitocalzados y renovarlo
 * antes de que venza (60 días) con el endpoint de refresh.
 */
export type InstagramMedia = {
  id: string;
  caption: string | null;
  mediaType: "IMAGE" | "VIDEO" | "CAROUSEL_ALBUM";
  mediaUrl: string | null;
  thumbnailUrl: string | null;
  permalink: string;
  timestamp: string;
};

export const instagramConfigured = () => Boolean(process.env.INSTAGRAM_ACCESS_TOKEN);

export async function fetchRecentMedia(limit = 12): Promise<InstagramMedia[]> {
  const token = process.env.INSTAGRAM_ACCESS_TOKEN;
  if (!token) return [];
  const url = new URL("https://graph.instagram.com/me/media");
  url.searchParams.set("fields", "id,caption,media_type,media_url,thumbnail_url,permalink,timestamp");
  url.searchParams.set("limit", String(limit));
  url.searchParams.set("access_token", token);
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(10_000) });
    if (!res.ok) {
      console.warn("[instagram]", res.status, await res.text().catch(() => ""));
      return [];
    }
    const body = (await res.json()) as {
      data?: { id: string; caption?: string; media_type: InstagramMedia["mediaType"]; media_url?: string; thumbnail_url?: string; permalink: string; timestamp: string }[];
    };
    return (body.data ?? []).map((m) => ({
      id: m.id,
      caption: m.caption ?? null,
      mediaType: m.media_type,
      mediaUrl: m.media_url ?? null,
      thumbnailUrl: m.thumbnail_url ?? (m.media_type === "IMAGE" ? (m.media_url ?? null) : null),
      permalink: m.permalink,
      timestamp: m.timestamp,
    }));
  } catch (e) {
    console.warn("[instagram]", e);
    return [];
  }
}
