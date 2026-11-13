import "server-only";
import { mockPaymentProvider } from "./mock";
import { goCuotasProvider, mercadoPagoProvider } from "./others";
import { paywayProvider } from "./payway";
import type { PaymentProvider } from "./types";

const providers: Record<string, PaymentProvider> = {
  mock: mockPaymentProvider,
  payway: paywayProvider,
  mercadopago: mercadoPagoProvider,
  gocuotas: goCuotasProvider,
};

/** Proveedor de tarjetas activo (PAYMENT_PROVIDER=mock|payway). */
export function cardProvider(): PaymentProvider {
  return providers[process.env.PAYMENT_PROVIDER ?? "mock"] ?? mockPaymentProvider;
}

export function providerById(id: string): PaymentProvider | null {
  return providers[id] ?? null;
}
