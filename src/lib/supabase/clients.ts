import "server-only";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { isBackoffice } from "@/lib/backoffice/source";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

/** true cuando hay un proyecto Supabase configurado; si no, la tienda corre en modo demo. Con DATA_SOURCE=backoffice, siempre false. */
export const hasSupabase = Boolean(url && anonKey) && !isBackoffice();

/** Con DATA_SOURCE=backoffice ningún camino puede usar Supabase: los clientes cortan antes de conectarse. */
function assertNotBackoffice() {
  if (isBackoffice()) throw new Error("Supabase no se usa con DATA_SOURCE=backoffice");
}

/**
 * Cliente anónimo sin sesión: para lecturas públicas cacheadas (catálogo, promos, home).
 * No toca cookies, así puede usarse dentro de funciones con "use cache".
 */
export function publicClient() {
  assertNotBackoffice();
  if (!url || !anonKey) throw new Error("Supabase no está configurado");
  return createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
}

/** Cliente con la sesión del usuario (cookies). Para cuenta, carrito y /admin. */
export async function sessionClient() {
  assertNotBackoffice();
  if (!url || !anonKey) throw new Error("Supabase no está configurado");
  const store = await cookies();
  return createServerClient(url, anonKey, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (list) => {
        try {
          list.forEach(({ name, value, options }) => store.set(name, value, options));
        } catch {
          // Llamado desde un Server Component: el proxy refresca la sesión.
        }
      },
    },
  });
}

/** Service role: saltea RLS. Solo en el servidor (pedidos, pagos, webhooks, API del back office). */
export function serviceClient() {
  assertNotBackoffice();
  if (!url || !serviceKey) throw new Error("Falta SUPABASE_SERVICE_ROLE_KEY");
  return createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
}
