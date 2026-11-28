import "server-only";
import { backoffice } from "./client";
import type { BoBranch, BoError, BoOrderView, BoPaymentOptions, BoPayResult, BoQuote, BoTrackView } from "./checkout-map";

/**
 * Checkout contra la API de la tienda del back office (SOLO SERVIDOR: la X-Store-Key nunca llega al navegador).
 * Cada función devuelve { status, body } tal cual: los 4xx traen el código de error que traduce errorAction (checkout-map.ts).
 */
type R<T> = Promise<{ status: number; body: T & BoError }>;
// Cobrar con Payway puede tardar (la API espera hasta 15 s a Payway y después consulta el pago)
const PAY_TIMEOUT_MS = 25_000;
const api = () => backoffice();

export const boQuote = (postalCode: string, items: { variantId: string; qty: number }[]): R<BoQuote> =>
  api().send("POST", "/store/shipping/quote", { postalCode, items: items.map((i) => ({ variantId: i.variantId, quantity: Math.max(1, Math.min(10, Math.floor(i.qty))) })) });

export const boBranches = (provider: "andreani" | "micorreo", postalCode: string, province?: string): R<{ provider: string; postalCode: string; branches: BoBranch[] }> =>
  api().send("GET", `/store/shipping/branches?provider=${provider}&postalCode=${encodeURIComponent(postalCode)}${province ? `&province=${encodeURIComponent(province)}` : ""}`);

export const boPaymentOptions = (totalCents: number): R<BoPaymentOptions> => api().send("GET", `/store/payment-options?totalCents=${Math.max(1, Math.round(totalCents))}`);

/** Crea el pedido. Misma Idempotency-Key y mismo contenido = el mismo pedido (con token nuevo). */
export const boCreateOrder = (body: unknown, idempotencyKey: string): R<BoOrderView & { accessToken?: string }> => api().send("POST", "/store/orders", body, { "Idempotency-Key": idempotencyKey });

export type BoPayPayload = { provider: "PAYWAY" | "MERCADOPAGO"; installments: number; cardBrand?: string; cardToken?: string; bin?: string; deviceId?: string };
/** Un intento de pago. Misma clave = el mismo intento (nunca otro cobro). El token del pedido va en X-Order-Token, nunca en la URL. */
export const boPay = (number: string, token: string, attemptKey: string, payload: BoPayPayload): R<BoPayResult> =>
  api().send("POST", `/store/orders/${encodeURIComponent(number)}/pay`, payload, { "X-Order-Token": token, "Idempotency-Key": attemptKey }, PAY_TIMEOUT_MS);

export const boOrder = (number: string, token: string): R<BoOrderView> => api().send("GET", `/store/orders/${encodeURIComponent(number)}`, undefined, { "X-Order-Token": token });

/** Canje del link del mail de pago rechazado. La IP del comprador va en X-Client-Ip (la API solo la cree con la clave de la tienda). */
export const boResume = (number: string, signature: string, clientIp: string | null): R<BoOrderView & { accessToken?: string }> =>
  api().send("POST", `/store/orders/${encodeURIComponent(number)}/resume`, { signature }, clientIp ? { "X-Client-Ip": clientIp } : {});

export const boTrack = (number: string, email: string): R<BoTrackView> => api().send("POST", "/store/orders/track", { number, email });

export const boWithdraw = (data: { firstName: string; lastName: string; dni: string; email: string; phone?: string | null; orderNumber?: string | null; reason?: string | null }): R<{ code: string; createdAt: string }> => {
  const body: Record<string, string> = { firstName: data.firstName, lastName: data.lastName, dni: data.dni, email: data.email };
  if (data.phone) body.phone = data.phone;
  if (data.orderNumber) body.orderNumber = data.orderNumber;
  if (data.reason) body.reason = data.reason;
  return api().send("POST", "/store/withdrawals", body);
};
