import "server-only";
import { getFallbackRates, getShippingConfig, type ShippingConfig } from "@/lib/orders/live";
import { hasSupabase, serviceClient } from "@/lib/supabase/clients";
import { andreaniProvider } from "./andreani";
import { correoProvider } from "./correo";
import { mockAndreani, mockCorreo } from "./mock";
import type { Package, ShippingOption, ShippingProvider } from "./types";

/** Proveedores activos según SHIPPING_PROVIDERS ("mock" o "andreani,correo"). */
function activeProviders(): ShippingProvider[] {
  const conf = (process.env.SHIPPING_PROVIDERS ?? "mock").split(",").map((s) => s.trim());
  if (conf.includes("mock")) return [mockAndreani, mockCorreo];
  const list: ShippingProvider[] = [];
  if (conf.includes("andreani")) list.push(andreaniProvider);
  if (conf.includes("correo")) list.push(correoProvider);
  return list;
}

export type PackageInput = { weightG: number | null; box: { l: number; w: number; h: number } | null; qty: number };

/** Un paquete por par (caja de zapatos). Si falta peso o medidas, se usa la caja estándar. */
export function buildPackages(items: PackageInput[], conf: ShippingConfig): Package[] {
  return items.flatMap((i) =>
    Array.from({ length: Math.min(i.qty, 20) }, () => ({
      weightG: i.weightG ?? conf.defaultBox.weightG,
      l: i.box?.l ?? conf.defaultBox.l,
      w: i.box?.w ?? conf.defaultBox.w,
      h: i.box?.h ?? conf.defaultBox.h,
    })),
  );
}

export const PICKUP_OPTION: ShippingOption = {
  id: "local:retiro",
  provider: "local",
  providerName: "Albertito Calzados",
  service: "retiro",
  label: "Retiro gratis en el local (Edison 15, Villa Mercedes)",
  price: 0,
  etaDays: null,
};

// Caché en memoria del servidor (además de la tabla shipping_quotes_cache con Supabase)
const g = globalThis as unknown as { __shipCache?: Map<string, { exp: number; options: ShippingOption[] }> };
const memCache = (g.__shipCache ??= new Map());

async function cachedQuote(provider: ShippingProvider, cp: string, packages: Package[], conf: ShippingConfig): Promise<ShippingOption[]> {
  const weight = packages.reduce((n, p) => n + p.weightG, 0);
  const key = `${provider.id}:${cp}:${weight}:${packages.length}`;
  const now = Date.now();
  const hit = memCache.get(key);
  if (hit && hit.exp > now) return hit.options;

  // Caché compartida entre instancias (Vercel): precios y plazos por CP + peso
  if (hasSupabase) {
    const { data } = await serviceClient()
      .from("shipping_quotes_cache")
      .select("service, price, eta_days")
      .eq("cp", cp)
      .eq("weight_g", weight)
      .eq("provider", provider.id)
      .gt("expires_at", new Date(now).toISOString());
    if (data && data.length > 0) {
      const options: ShippingOption[] = data.map((r) => ({
        id: `${provider.id}:${r.service}`,
        provider: provider.id,
        providerName: provider.name,
        service: r.service,
        label: `${provider.name} a ${r.service}`,
        price: r.price,
        etaDays: r.eta_days,
      }));
      memCache.set(key, { exp: now + 15 * 60_000, options });
      return options;
    }
  }

  const options = await provider.quote(cp, packages, conf.originCp);
  const exp = now + conf.cacheHours * 3600_000;
  memCache.set(key, { exp, options });
  if (hasSupabase) {
    await serviceClient()
      .from("shipping_quotes_cache")
      .upsert(
        options.map((o) => ({
          cp,
          weight_g: weight,
          provider: provider.id,
          service: o.service,
          price: o.price,
          eta_days: o.etaDays,
          expires_at: new Date(exp).toISOString(),
        })),
      )
      .then(
        () => undefined,
        () => undefined,
      );
  }
  return options;
}

/** Sucursales para el checkout (no se guardan en la caché de la base). */
export async function getBranches(providerId: string, cp: string, items: PackageInput[]) {
  const conf = await getShippingConfig();
  const provider = activeProviders().find((p) => p.id === providerId);
  if (!provider) return [];
  const opts = await provider.quote(cp, buildPackages(items, conf), conf.originCp).catch(() => []);
  return opts.find((o) => o.service === "sucursal")?.branches ?? [];
}

export type QuoteResult = { cp: string; options: ShippingOption[]; warnings: string[] };

/**
 * Cotiza con todas las empresas en paralelo, ordena por precio y suma el retiro en el local.
 * Si una falla, se muestra la otra con un aviso; si fallan todas, tarifa de respaldo por zona.
 */
export async function quoteShipping(cp: string, items: PackageInput[]): Promise<QuoteResult> {
  const conf = await getShippingConfig();
  const packages = buildPackages(items, conf);
  const providers = activeProviders();
  const results = await Promise.allSettled(providers.map((p) => cachedQuote(p, cp, packages, conf)));

  const options: ShippingOption[] = [];
  const warnings: string[] = [];
  results.forEach((r, i) => {
    if (r.status === "fulfilled") options.push(...r.value);
    else {
      console.warn(`[envios] ${providers[i].name}:`, r.reason);
      warnings.push(`${providers[i].name} no está cotizando en este momento.`);
    }
  });

  if (options.length === 0) {
    const cpNum = Number(cp);
    const zone = (await getFallbackRates()).filter((r) => cpNum >= r.cpFrom && cpNum <= r.cpTo);
    zone.forEach((r) =>
      options.push({
        id: `fallback:${r.service}`,
        provider: "fallback",
        providerName: "Envío estándar",
        service: r.service,
        label: r.service === "domicilio" ? "Envío a domicilio" : "Envío a sucursal",
        price: r.price,
        etaDays: r.etaDays,
      }),
    );
    if (zone.length > 0) warnings.splice(0, warnings.length, "Mostramos una tarifa estimada. Te confirmamos la empresa al despachar.");
  }

  options.sort((a, b) => a.price - b.price);
  return { cp, options: [...options, PICKUP_OPTION], warnings };
}
