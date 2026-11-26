import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { hasSupabase, publicClient } from "@/lib/supabase/clients";
import { isBackoffice } from "@/lib/backoffice/source";
import { boNavigation, boSettings } from "@/lib/backoffice/store";
import { orEmptyDuringBuild } from "@/lib/backoffice/build";
import { TAGS } from "./tags";
import type { NavSection, PaymentPromo, StoreSettings, TopbarMessage } from "./types";
import { demoSettings } from "@/lib/demo/catalog";
import { demoDb, withinDates } from "@/lib/demo/db";
import { safeMediaUrl } from "@/lib/media";

type CategoryRow = {
  id: string;
  parent_id: string | null;
  name: string;
  slug: string;
  kind: "section" | "subsection" | "offers";
  order: number;
  size_range: string[];
  menu_promo_title: string | null;
  menu_promo_link: string | null;
  menu_promo_image: string | null;
  banner_url?: string | null;
  banner_mobile_url?: string | null;
};

const banner = (r: CategoryRow) => (r.banner_url ? { desktop: safeMediaUrl(r.banner_url)!, mobile: safeMediaUrl(r.banner_mobile_url) } : null);

function buildNav(rows: CategoryRow[]): NavSection[] {
  const byOrder = (a: CategoryRow, b: CategoryRow) => a.order - b.order;
  return rows
    .filter((r) => r.parent_id === null)
    .sort(byOrder)
    .map((s) => ({
      id: s.id,
      name: s.name,
      slug: s.slug,
      kind: s.kind === "offers" ? "offers" : "section",
      href: `/${s.slug}`,
      sizeRange: s.size_range ?? [],
      promo: s.menu_promo_title
        ? { title: s.menu_promo_title, link: s.menu_promo_link ?? `/${s.slug}`, image: safeMediaUrl(s.menu_promo_image) }
        : null,
      banner: banner(s),
      children: rows
        .filter((c) => c.parent_id === s.id)
        .sort(byOrder)
        .map((c) => ({ id: c.id, name: c.name, slug: c.slug, href: `/${s.slug}/${c.slug}`, banner: banner(c) })),
    }));
}

/** Secciones y subsecciones activas, en orden (header, mega menú, menú mobile, footer). */
export async function getNavigation(): Promise<NavSection[]> {
  "use cache";
  cacheTag(TAGS.categories);
  cacheLife("hours");

  if (isBackoffice()) return orEmptyDuringBuild(boNavigation, [], "menú");
  if (!hasSupabase) {
    return buildNav(
      demoDb().categories.filter((c) => c.active).map((c) => ({
        id: c.id,
        parent_id: c.parentId,
        name: c.name,
        slug: c.slug,
        kind: c.kind,
        order: c.order,
        size_range: c.sizeRange,
        menu_promo_title: c.menuPromoTitle,
        menu_promo_link: c.menuPromoLink,
        menu_promo_image: c.menuPromoImage,
        banner_url: c.bannerUrl,
        banner_mobile_url: c.bannerMobileUrl,
      })),
    );
  }

  const { data, error } = await publicClient()
    .from("categories")
    .select("id, parent_id, name, slug, kind, order, size_range, menu_promo_title, menu_promo_link, menu_promo_image, banner_url, banner_mobile_url")
    .eq("active", true);
  if (error) throw error;
  return buildNav(data as CategoryRow[]);
}

/** Promos de cuotas vigentes (barra superior, tarjetas, ficha, checkout). */
export async function getPaymentPromos(): Promise<PaymentPromo[]> {
  "use cache";
  cacheTag(TAGS.promos);
  cacheLife("minutes");

  // Back office: las promos de cuotas llegan en la fase C
  if (isBackoffice()) return [];
  if (!hasSupabase) {
    return demoDb()
      .promos.filter((p) => p.active && withinDates(p.startsAt, p.endsAt))
      .sort((a, b) => a.order - b.order)
      .map((p) => ({
        id: p.id,
        provider: p.provider,
        label: p.label,
        installments: p.installments,
        interestFree: p.interestFree,
        minAmount: p.minAmount,
        logoUrl: p.logoUrl,
        showInTopbar: p.showInTopbar,
      }));
  }

  // RLS ya filtra activas y dentro de fechas
  const { data, error } = await publicClient()
    .from("payment_promos")
    .select("id, provider, label, installments, interest_free, min_amount, logo_url, show_in_topbar")
    .order("order");
  if (error) throw error;
  return data.map((p) => ({
    id: p.id,
    provider: p.provider,
    label: p.label,
    installments: p.installments,
    interestFree: p.interest_free,
    minAmount: p.min_amount,
    logoUrl: safeMediaUrl(p.logo_url),
    showInTopbar: p.show_in_topbar,
  }));
}

export async function getTopbarMessages(): Promise<TopbarMessage[]> {
  "use cache";
  cacheTag(TAGS.promos);
  cacheLife("minutes");

  // Back office: los mensajes de la barra superior llegan en la fase C
  if (isBackoffice()) return [];
  if (!hasSupabase) {
    return demoDb()
      .topbar.filter((m) => m.active)
      .sort((a, b) => a.order - b.order)
      .map(({ id, text, link }) => ({ id, text, link }));
  }
  const { data, error } = await publicClient().from("topbar_messages").select("id, text, link").order("order");
  if (error) throw error;
  return data;
}

const DEFAULT_SETTINGS: StoreSettings = {
  whatsapp: demoSettings.whatsapp.value as StoreSettings["whatsapp"],
  store: demoSettings.store.value as StoreSettings["store"],
  newsletterPopup: demoSettings.newsletter_popup.value as StoreSettings["newsletterPopup"],
  tax: demoSettings.tax.value as StoreSettings["tax"],
};

/** Configuración pública (WhatsApp, local, popup, impuestos). */
export async function getSettings(): Promise<StoreSettings> {
  "use cache";
  cacheTag(TAGS.settings);
  cacheLife("hours");

  if (isBackoffice()) {
    const blank: StoreSettings = {
      whatsapp: { number: "", display: "" },
      store: { address: "", city: "", province: "", hours: "", hoursDetail: "", instagram: "", email: "" },
      newsletterPopup: { ...DEFAULT_SETTINGS.newsletterPopup, enabled: false },
      tax: DEFAULT_SETTINGS.tax,
    };
    return orEmptyDuringBuild(boSettings, blank, "configuración");
  }
  if (!hasSupabase) {
    const st = demoDb().settings;
    return {
      whatsapp: { ...DEFAULT_SETTINGS.whatsapp, ...(st.whatsapp?.value as object) },
      store: { ...DEFAULT_SETTINGS.store, ...(st.store?.value as object) },
      newsletterPopup: { ...DEFAULT_SETTINGS.newsletterPopup, ...(st.newsletter_popup?.value as object) },
      tax: { ...DEFAULT_SETTINGS.tax, ...(st.tax?.value as object) },
    };
  }

  const { data, error } = await publicClient().from("settings").select("key, value");
  if (error) throw error;
  const map = Object.fromEntries(data.map((r) => [r.key, r.value]));
  return {
    whatsapp: { ...DEFAULT_SETTINGS.whatsapp, ...map.whatsapp },
    store: { ...DEFAULT_SETTINGS.store, ...map.store },
    newsletterPopup: { ...DEFAULT_SETTINGS.newsletterPopup, ...map.newsletter_popup },
    tax: { ...DEFAULT_SETTINGS.tax, ...map.tax },
  };
}
