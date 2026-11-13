import "server-only";
import { AsyncLocalStorage } from "node:async_hooks";
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { hasSupabase, serviceClient, sessionClient } from "@/lib/supabase/clients";

/**
 * Acceso al panel del propietario.
 *  - Con Supabase: login con email y contraseña (Supabase Auth) y rol `admin` en `profiles`.
 *  - Modo demo (sin Supabase): un único usuario de prueba definido en ADMIN_DEMO_EMAIL / ADMIN_DEMO_PASSWORD,
 *    con una cookie firmada. Solo existe mientras no haya Supabase configurado.
 */
export type Admin = { id: string; email: string; mode: "supabase" | "demo" };

const DEMO_COOKIE = "alb_admin";
const DEMO_TTL_S = 60 * 60 * 12;

function demoSecret(): string | null {
  const s = process.env.ADMIN_SESSION_SECRET ?? process.env.ADMIN_DEMO_PASSWORD;
  return s && s.length >= 8 ? s : null;
}

function sign(payload: string, secret: string) {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

function safeEqual(a: string, b: string) {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

// Contexto del back office: solo lo activa la API /api/admin/v1 después de validar el token
const backoffice = new AsyncLocalStorage<true>();

/** Ejecuta `fn` como el back office (token ya validado por el llamador). */
export function runAsBackoffice<T>(fn: () => Promise<T>): Promise<T> {
  return backoffice.run(true, fn);
}

/** Valida el token del back office (Authorization: Bearer …) en tiempo constante. */
export function isBackofficeToken(header: string | null): boolean {
  const expected = process.env.BACKOFFICE_API_TOKEN;
  if (!expected || expected.length < 32 || !header?.startsWith("Bearer ")) return false;
  return safeEqual(header.slice(7).trim(), expected);
}

export async function getAdmin(): Promise<Admin | null> {
  if (backoffice.getStore()) return { id: "backoffice", email: "back-office", mode: hasSupabase ? "supabase" : "demo" };
  // Siempre en tiempo de pedido (sesión y hora actuales), nunca prerenderizado
  await connection();
  if (hasSupabase) {
    const supabase = await sessionClient();
    const { data } = await supabase.auth.getUser();
    if (!data.user) return null;
    const { data: profile } = await serviceClient().from("profiles").select("role").eq("id", data.user.id).maybeSingle();
    return profile?.role === "admin" ? { id: data.user.id, email: data.user.email ?? "", mode: "supabase" } : null;
  }

  const secret = demoSecret();
  if (!secret) return null;
  const raw = (await cookies()).get(DEMO_COOKIE)?.value;
  if (!raw) return null;
  const [payload, mac] = raw.split(".");
  if (!payload || !mac || !safeEqual(sign(payload, secret), mac)) return null;
  const [email, exp] = Buffer.from(payload, "base64url").toString().split("|");
  if (!email || Number(exp) < Date.now() / 1000) return null;
  return { id: "demo-admin", email, mode: "demo" };
}

/** Para páginas y acciones del panel: si no es admin, al login. */
export async function requireAdmin(): Promise<Admin> {
  const admin = await getAdmin();
  if (!admin) redirect("/admin/ingresar");
  return admin;
}

/** Devuelve un mensaje de error o null si entró. */
export async function signIn(email: string, password: string): Promise<string | null> {
  const normalized = email.trim().toLowerCase();
  if (hasSupabase) {
    const supabase = await sessionClient();
    const { data, error } = await supabase.auth.signInWithPassword({ email: normalized, password });
    if (error || !data.user) return "Mail o contraseña incorrectos.";
    const { data: profile } = await serviceClient().from("profiles").select("role").eq("id", data.user.id).maybeSingle();
    if (profile?.role !== "admin") {
      await supabase.auth.signOut();
      return "Esta cuenta no tiene acceso al panel.";
    }
    return null;
  }

  const demoEmail = process.env.ADMIN_DEMO_EMAIL?.trim().toLowerCase();
  const demoPassword = process.env.ADMIN_DEMO_PASSWORD;
  const secret = demoSecret();
  if (!demoEmail || !demoPassword || !secret) {
    return "El panel de prueba no está configurado (falta ADMIN_DEMO_EMAIL / ADMIN_DEMO_PASSWORD en .env.local).";
  }
  if (normalized !== demoEmail || !safeEqual(password, demoPassword)) return "Mail o contraseña incorrectos.";

  const payload = Buffer.from(`${normalized}|${Math.floor(Date.now() / 1000) + DEMO_TTL_S}`).toString("base64url");
  (await cookies()).set(DEMO_COOKIE, `${payload}.${sign(payload, secret)}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: DEMO_TTL_S,
  });
  return null;
}

export async function signOut() {
  if (hasSupabase) {
    const supabase = await sessionClient();
    await supabase.auth.signOut();
  }
  (await cookies()).delete(DEMO_COOKIE);
}
