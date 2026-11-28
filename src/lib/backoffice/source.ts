/**
 * De dónde salen los datos de la tienda (variable DATA_SOURCE):
 *  - "demo" (o sin definir): como siempre. Sin Supabase, datos de demostración; con Supabase, Supabase.
 *  - "backoffice": catálogo, precios, stock, categorías y configuración salen de la API del back office de Albertito.
 *    Supabase no se usa en ningún lado (ver src/lib/supabase/clients.ts).
 */
export type DataSource = "demo" | "backoffice";

export function dataSource(env: Record<string, string | undefined> = process.env): DataSource {
  const v = (env.DATA_SOURCE ?? "").trim().toLowerCase();
  if (!v || v === "demo") return "demo";
  if (v === "backoffice") return "backoffice";
  throw new Error(`DATA_SOURCE inválido: «${env.DATA_SOURCE}». Usá «demo» o «backoffice».`);
}

export const isBackoffice = (env: Record<string, string | undefined> = process.env) => dataSource(env) === "backoffice";
