import type { CreatePaymentInput, PaymentProvider, PaymentResult, PaymentStatus } from "./types";

/**
 * Payway (Banco Nación). API REST de pagos con token generado en el navegador por su SDK.
 * Variables: PAYWAY_PUBLIC_KEY (navegador), PAYWAY_PRIVATE_KEY (servidor), PAYWAY_SITE_ID, PAYWAY_ENV=sandbox|production.
 *
 * TODO(Fase 6) antes de producción, confirmar con la documentación y el comercio:
 *  - URL base de sandbox y producción, y el header de autenticación.
 *  - IDs de medio de pago de cada tarjeta (PAYMENT_METHOD_IDS).
 *  - Que los planes de cuotas S/I configurados en la cuenta coincidan con `payment_promos`.
 *  - Formato del importe (centavos) y de la notificación (webhook) y cómo se firma.
 */
const BASE_URL =
  process.env.PAYWAY_ENV === "production"
    ? (process.env.PAYWAY_API_URL ?? "https://live.decidir.com/api/v2")
    : (process.env.PAYWAY_API_URL ?? "https://developers.decidir.com/api/v2");

/** Medio de pago de Payway por marca. Confirmar con Payway (ver TODO). */
export const PAYMENT_METHOD_IDS: Record<string, number | undefined> = {
  visa: 1,
  master: 104,
  naranja: 24,
  visa_debito: 31,
};

function mapStatus(s: string | undefined): PaymentStatus {
  if (s === "approved") return "aprobado";
  if (s === "rejected" || s === "annulled") return "rechazado";
  return "pendiente";
}

async function call<T>(path: string, init: RequestInit): Promise<T> {
  const key = process.env.PAYWAY_PRIVATE_KEY;
  if (!key) throw new Error("Falta PAYWAY_PRIVATE_KEY");
  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", apikey: key, "Cache-Control": "no-cache", ...init.headers },
    signal: AbortSignal.timeout(30_000),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok && res.status !== 402) {
    throw new Error(`Payway ${res.status}: ${JSON.stringify(body).slice(0, 300)}`);
  }
  return body as T;
}

type PaywayPayment = { id?: number; status?: string; status_details?: { error?: { reason?: { description?: string } } } };

export const paywayProvider: PaymentProvider = {
  id: "payway",
  async createPayment(input: CreatePaymentInput): Promise<PaymentResult> {
    const methodId = PAYMENT_METHOD_IDS[input.cardBrand];
    if (!methodId) return { status: "rechazado", providerPaymentId: null, message: "Ese medio de pago no está disponible online." };

    const body = await call<PaywayPayment>("/payments", {
      method: "POST",
      body: JSON.stringify({
        site_transaction_id: `${input.orderNumber}-${Date.now()}`,
        token: input.token,
        payment_method_id: methodId,
        bin: input.bin,
        amount: input.amount * 100, // centavos
        currency: "ARS",
        installments: input.installments,
        description: `Pedido ${input.orderNumber}`,
        payment_type: "single",
        sub_payments: [],
        customer: { id: input.customer.dni, email: input.customer.email },
      }),
    });
    const status = mapStatus(body.status);
    return {
      status,
      providerPaymentId: body.id ? String(body.id) : null,
      message: status === "rechazado" ? (body.status_details?.error?.reason?.description ?? "El pago fue rechazado. Probá con otra tarjeta.") : undefined,
      raw: body,
    };
  },
  async getStatus(id: string): Promise<PaymentResult> {
    const body = await call<PaywayPayment>(`/payments/${encodeURIComponent(id)}`, { method: "GET" });
    return { status: mapStatus(body.status), providerPaymentId: id, raw: body };
  },
  async parseNotification(req: Request) {
    // TODO(Fase 6): validar origen/firma según Payway. Por las dudas, siempre se reconsulta el estado.
    const body = (await req.json().catch(() => null)) as { payment_id?: number | string; site_transaction_id?: string } | null;
    if (!body?.payment_id) return null;
    const fresh = await this.getStatus(String(body.payment_id));
    return {
      providerPaymentId: String(body.payment_id),
      orderNumber: body.site_transaction_id?.split("-").slice(0, 2).join("-") ?? null,
      status: fresh.status,
      raw: body,
    };
  },
};
