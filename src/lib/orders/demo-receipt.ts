import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import type { OrderView } from "./orders";

/**
 * Solo modo demo (sin Supabase): en Vercel cada función tiene su propia memoria, así que la
 * página de confirmación puede no encontrar el pedido que creó la API. El checkout devuelve
 * un comprobante firmado con los datos del pedido y la confirmación lo usa como respaldo.
 * Con Supabase no se usa: el pedido se lee siempre de la base.
 */
const secret = () => process.env.ADMIN_SESSION_SECRET || process.env.REVALIDATE_SECRET || "albertito-demo-receipt";

export function signReceipt(order: OrderView): string {
  const { accessToken: _t, ...data } = order;
  void _t;
  const payload = Buffer.from(JSON.stringify(data)).toString("base64url");
  const mac = createHmac("sha256", secret()).update(payload).digest("base64url");
  return `${payload}.${mac}`;
}

export function readReceipt(token: string, number: string): OrderView | null {
  const [payload, mac] = token.split(".");
  if (!payload || !mac || token.length > 20_000) return null;
  const expected = createHmac("sha256", secret()).update(payload).digest("base64url");
  const a = Buffer.from(mac);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString()) as Omit<OrderView, "accessToken">;
    return data.number === number ? { ...data, accessToken: "" } : null;
  } catch {
    return null;
  }
}
