import "server-only";
import { cookies } from "next/headers";
import { cookiesToDrop, orderCookieName, orderCookieOptions, orderCookieValue, parseOrderCookie } from "./checkout-map";

/**
 * Token del pedido del invitado en una cookie httpOnly por pedido (Secure en producción, SameSite=Lax, 30 días). El navegador nunca lo ve: lo lee el
 * servidor de la web para hablar con la API. Nunca va a la URL ni a la analítica. Se guardan como máximo los 5 pedidos más nuevos.
 */
const secure = () => process.env.NODE_ENV === "production";

export async function readOrderToken(number: string): Promise<string | null> {
  return parseOrderCookie((await cookies()).get(orderCookieName(number))?.value)?.token ?? null;
}

export async function saveOrderToken(number: string, token: string) {
  const jar = await cookies();
  jar.set(orderCookieName(number), orderCookieValue(token), orderCookieOptions(secure()));
  const all = jar.getAll().map((c) => ({ name: c.name, value: c.name === orderCookieName(number) ? orderCookieValue(token) : c.value }));
  for (const name of cookiesToDrop(all)) jar.delete(name);
}

/** IP del comprador para el tope del canje (la del proxy de la web; la API la valida y solo la cree con la clave de la tienda) */
export function clientIpOf(headers: Headers): string | null {
  const real = headers.get("x-real-ip")?.trim();
  if (real) return real;
  const first = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return first || null;
}
