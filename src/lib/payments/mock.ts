import type { CreatePaymentInput, PaymentProvider, PaymentResult } from "./types";

/**
 * Proveedor de prueba (PAYMENT_PROVIDER=mock). Simula a Payway:
 *  - tarjeta terminada en 0002 → rechazada (fondos insuficientes)
 *  - tarjeta terminada en 0003 → pendiente (queda esperando el webhook)
 *  - cualquier otra → aprobada
 * El "token" lo arma el navegador con el final de la tarjeta; el número completo nunca viaja.
 */
const g = globalThis as unknown as { __mockPayments?: Map<string, PaymentResult> };
const store = (g.__mockPayments ??= new Map());

export const mockPaymentProvider: PaymentProvider = {
  id: "mock",
  async createPayment(input: CreatePaymentInput): Promise<PaymentResult> {
    await new Promise((r) => setTimeout(r, 400)); // latencia realista
    const last4 = input.token.match(/^mock_(\d{4})_/)?.[1];
    if (!last4) return { status: "rechazado", providerPaymentId: null, message: "No pudimos leer la tarjeta. Probá de nuevo." };
    const id = `mock-${input.orderNumber}-${Date.now()}`;
    const result: PaymentResult =
      last4 === "0002"
        ? { status: "rechazado", providerPaymentId: id, message: "El pago fue rechazado por fondos insuficientes. Probá con otra tarjeta." }
        : last4 === "0003"
          ? { status: "pendiente", providerPaymentId: id, message: "Tu pago está en revisión. Te avisamos por mail." }
          : { status: "aprobado", providerPaymentId: id };
    store.set(id, { ...result, raw: { mock: true, installments: input.installments, brand: input.cardBrand } });
    return store.get(id)!;
  },
  async getStatus(id) {
    return store.get(id) ?? { status: "pendiente", providerPaymentId: id };
  },
  async parseNotification(req) {
    const body = (await req.json().catch(() => null)) as { id?: string; order?: string; status?: string } | null;
    if (!body?.id || !body.status) return null;
    const status = body.status === "approved" ? "aprobado" : body.status === "rejected" ? "rechazado" : "pendiente";
    return { providerPaymentId: body.id, orderNumber: body.order ?? null, status, raw: body };
  },
};
