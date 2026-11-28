import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { demoDb, withinDates } from "@/lib/demo/db";
import { safeMediaUrl } from "@/lib/media";
import { hasSupabase, publicClient } from "@/lib/supabase/clients";
import { isBackoffice } from "@/lib/backoffice/source";
import { orEmptyDuringBuild } from "@/lib/backoffice/build";
import { boHomeBanners } from "@/lib/backoffice/store";
import { getCatalog } from "./catalog";
import { TAGS } from "./tags";
import type { ProductCard } from "./types";

export type HomeBanner = {
  id: string;
  imageDesktop: string | null;
  imageMobile: string | null;
  videoUrl: string | null;
  title: string;
  alt: string;
  link: string | null;
};

export type HomeVideo = {
  id: string;
  source: "upload" | "instagram";
  mediaUrl: string | null;
  instagramUrl: string | null;
  thumbnail: string | null;
  caption: string | null;
  product: Pick<ProductCard, "name" | "slug" | "price" | "basePrice" | "onSale"> | null;
};

/** Banners vigentes del hero, en orden (RLS filtra activos y fechas). */
export async function getHomeBanners(): Promise<HomeBanner[]> {
  "use cache";
  cacheTag(TAGS.home);
  cacheLife("minutes");

  // Back office (fase C): los banners vigentes de la API
  if (isBackoffice()) return orEmptyDuringBuild(boHomeBanners, [], "banners");
  if (!hasSupabase) {
    return demoDb()
      .banners.filter((b) => b.active && withinDates(b.startsAt, b.endsAt))
      .sort((a, b) => a.order - b.order)
      .map((b) => ({
      id: b.id,
      imageDesktop: safeMediaUrl(b.imageDesktop),
      imageMobile: safeMediaUrl(b.imageMobile),
      videoUrl: b.videoUrl && safeMediaUrl(b.videoUrl) === b.videoUrl ? b.videoUrl : null,
      title: b.title,
      alt: b.alt,
      link: b.link,
    }));
  }

  const { data, error } = await publicClient()
    .from("home_banners")
    .select("id, image_desktop, image_mobile, video_url, title, alt, link")
    .order("order");
  if (error) throw error;
  return data.map((b) => ({
    id: b.id,
    imageDesktop: safeMediaUrl(b.image_desktop),
    imageMobile: safeMediaUrl(b.image_mobile),
    videoUrl: b.video_url && safeMediaUrl(b.video_url) === b.video_url ? b.video_url : null,
    title: b.title,
    alt: b.alt || b.title,
    link: b.link,
  }));
}

/** Videos "Mirá cómo quedan", con el producto vinculado (solo si está activo). */
export async function getHomeVideos(): Promise<HomeVideo[]> {
  "use cache";
  cacheTag(TAGS.home, TAGS.products);
  cacheLife("minutes");

  // Back office: videos del home en la fase C
  if (isBackoffice()) return [];
  const catalog = await getCatalog();
  const pick = (p: ProductCard | undefined) =>
    p ? { name: p.name, slug: p.slug, price: p.price, basePrice: p.basePrice, onSale: p.onSale } : null;

  if (!hasSupabase) {
    return demoDb()
      .videos.filter((v) => v.active)
      .sort((a, b) => a.order - b.order)
      .map((v) => ({
        id: v.id,
        source: v.source,
        mediaUrl: v.mediaUrl && safeMediaUrl(v.mediaUrl) === v.mediaUrl ? v.mediaUrl : null,
        instagramUrl: v.instagramUrl,
        thumbnail: safeMediaUrl(v.thumbnail),
        caption: v.caption,
        product: pick(catalog.find((p) => p.id === v.productId)),
      }));
  }

  const { data, error } = await publicClient()
    .from("home_videos")
    .select("id, source, media_url, instagram_url, thumbnail, caption, product_id")
    .order("order");
  if (error) throw error;
  const byId = new Map(catalog.map((p) => [p.id, p]));
  return data.map((v) => ({
    id: v.id,
    source: v.source,
    mediaUrl: v.media_url && safeMediaUrl(v.media_url) === v.media_url ? v.media_url : null,
    instagramUrl: v.instagram_url,
    thumbnail: safeMediaUrl(v.thumbnail),
    caption: v.caption,
    product: pick(v.product_id ? byId.get(v.product_id) : undefined),
  }));
}
