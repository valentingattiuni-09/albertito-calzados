import "server-only";
import { NextResponse } from "next/server";
import { boCreateOrder, boPay, type BoPayPayload } from "./checkout";
import { errorAction, isOrderNumber, payOutcome, toOrderBody, type BoError, type CheckoutInput } from "./checkout-map";
import { BackofficeUnavailableError } from "./http";
import { readOrderToken, saveOrderToken } from "./order-cookie";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });

/** Error de la API → { ok:false, message, step, action, code } para el navegador (sin datos de la API más allá del código y, si aplica, el precio nuevo). */
export function fail(status: number, body: BoError | null) {
  const a = errorAction(body, status);
  return json({ ok: false, code: body?.code ?? null, ...a, ...(typeof body?.currentCents === "number" ? { currentPrice: Math.round(body.currentCents / 100) } : {}) }, status >= 500 ? 502 : status === 401 || status === 403 ? 503 : status);
}

export const unavailable = () => json({ ok: false, message: "Estamos actualizando la tienda. Probá de nuevo en unos minutos." }, 503);

/** Lo que manda el navegador para pagar. El token de la tarjeta lo generó el SDK en el navegador; la web solo lo reenvía. */
export type PaymentBody = { provider?: string; installments?: number; brand?: string; token?: string; bin?: string; attemptKey?: string };

function toPayload(p: PaymentBody): BoPayPayload | null {
  if (p.provider !== "PAYWAY" && p.provider !== "MERCADOPAGO") return null;
  const installments = Number.isInteger(p.installments) ? Number(p.installments) : 1;
  if (p.provider === "MERCADOPAGO") return { provider: "MERCADOPAGO", installments };
  return { provider: "PAYWAY", installments, cardBrand: p.brand, cardToken: p.token, ...(p.bin && /^\d{6,8}$/.test(p.bin) ? { bin: p.bin } : {}) };
}

/** Paga un pedido de este navegador (token en la cookie). */
export async function payWithCookie(number: string, payment: PaymentBody | undefined) {
  if (!isOrderNumber(number)) return json({ ok: false, message: "No encontramos el pedido." }, 404);
  const token = await readOrderToken(number);
  if (!token) return json({ ok: false, message: "No encontramos el pedido en este dispositivo. Seguilo con tu número y tu mail.", action: "new_order" }, 404);
  const payload = payment ? toPayload(payment) : null;
  if (!payload) return json({ ok: false, message: "Elegí cómo querés pagar.", step: 3 }, 400);
  if (!payment?.attemptKey || !UUID.test(payment.attemptKey)) return json({ ok: false, message: "Probá de nuevo." }, 400);
  try {
    const res = await boPay(number, token, payment.attemptKey, payload);
    if (res.status !== 200) return fail(res.status, res.body);
    const outcome = payOutcome(res.body);
    return json({
      ok: outcome !== "rechazado" && outcome !== "error",
      number,
      outcome,
      redirectUrl: outcome === "redirect" ? res.body.redirectUrl : undefined,
      attemptsLeft: res.body.attemptsLeft,
      message:
        outcome === "rechazado"
          ? res.body.attemptsLeft > 0
            ? "Tu pago no se aprobó. Probá con otra tarjeta o con Mercado Pago."
            : "Tu pago no se aprobó y llegaste al máximo de intentos. Armá el pedido de nuevo."
          : outcome === "error"
            ? "No pudimos iniciar el pago. Probá de nuevo en unos minutos."
            : undefined,
      action: outcome === "rechazado" && res.body.attemptsLeft === 0 ? "new_order" : undefined,
    });
  } catch (e) {
    if (e instanceof BackofficeUnavailableError) {
      // Sin respuesta: el pago puede estar en curso. La confirmación consulta el estado real.
      return json({ ok: true, number, outcome: "pendiente" });
    }
    throw e;
  }
}

/** Crea el pedido (o lo repite con la misma clave) y lo paga. */
export async function createAndPay(body: { input?: CheckoutInput; orderKey?: string; payment?: PaymentBody } | null) {
  if (!body?.input || !body.orderKey || !UUID.test(body.orderKey)) return json({ ok: false, message: "Pedido inválido." }, 400);
  const res = await boCreateOrder(toOrderBody(body.input), body.orderKey.toLowerCase());
  if ((res.status !== 200 && res.status !== 201) || !res.body.accessToken) return fail(res.status, res.body);
  await saveOrderToken(res.body.number, res.body.accessToken);
  return payWithCookie(res.body.number, body.payment);
}
