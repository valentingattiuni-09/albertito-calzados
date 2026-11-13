import type { PaymentProvider } from "./types";

const pending = (name: string) => async () => {
  throw new Error(`${name}: integración pendiente. Se activa cuando se sume el medio de pago.`);
};

/**
 * Mercado Pago (Checkout API con tarjeta tokenizada por su SDK JS, o Checkout Pro con redirección).
 * Variables previstas: MERCADOPAGO_ACCESS_TOKEN, NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY, MERCADOPAGO_WEBHOOK_SECRET.
 */
export const mercadoPagoProvider: PaymentProvider = {
  id: "mercadopago",
  createPayment: pending("Mercado Pago"),
  getStatus: pending("Mercado Pago"),
  parseNotification: pending("Mercado Pago"),
};

/**
 * Go Cuotas (cuotas con débito; el cliente completa el pago en su sitio y vuelve).
 * Variables previstas: GOCUOTAS_API_KEY, GOCUOTAS_ENV. Se muestra solo cuando la promo `go_cuotas` está activa.
 */
export const goCuotasProvider: PaymentProvider = {
  id: "gocuotas",
  createPayment: pending("Go Cuotas"),
  getStatus: pending("Go Cuotas"),
  parseNotification: pending("Go Cuotas"),
};
