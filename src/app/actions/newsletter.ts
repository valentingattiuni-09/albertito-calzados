"use server";

import { randomUUID } from "node:crypto";
import { demoDb } from "@/lib/demo/db";
import { hasSupabase, publicClient } from "@/lib/supabase/clients";

export type NewsletterState = { ok: boolean; message: string } | null;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PREFERENCES = ["hombre", "mujer", "nino", "familia"];

/** Guarda una suscripción en newsletter_subscribers (popup, footer o home). */
export async function subscribeNewsletter(_prev: NewsletterState, form: FormData): Promise<NewsletterState> {
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const preference = String(form.get("preference") ?? "") || null;
  const birthDate = String(form.get("birth_date") ?? "") || null;
  const source = String(form.get("source") ?? "footer");
  const accepted = form.get("terms") === "on";

  if (!EMAIL_RE.test(email)) return { ok: false, message: "Revisá tu mail." };
  if (!accepted) return { ok: false, message: "Aceptá los términos para suscribirte." };
  if (preference && !PREFERENCES.includes(preference)) return { ok: false, message: "Elegí para quién comprás." };
  if (birthDate && !/^\d{4}-\d{2}-\d{2}$/.test(birthDate)) return { ok: false, message: "Revisá la fecha de nacimiento." };

  if (!hasSupabase) {
    console.info("[newsletter:demo]", { email, preference, birthDate, source });
    const subs = demoDb().subscribers;
    if (!subs.some((x) => x.email === email)) {
      subs.unshift({ id: randomUUID(), email, preference, birthDate, source, createdAt: new Date().toISOString() });
    }
    return { ok: true, message: "¡Listo! Ya estás adentro." };
  }

  const { error } = await publicClient()
    .from("newsletter_subscribers")
    .insert({ email, preference, birth_date: birthDate, source, accepted_terms_at: new Date().toISOString() });

  // 23505 = ya estaba suscripto: para la persona es lo mismo
  if (error && error.code !== "23505") {
    console.error("[newsletter]", error);
    return { ok: false, message: "No pudimos suscribirte. Probá de nuevo." };
  }
  return { ok: true, message: "¡Listo! Ya estás adentro." };
}
