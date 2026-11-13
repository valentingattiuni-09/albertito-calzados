/**
 * Contrato común para cobrar. La tienda solo habla con esta interfaz; Payway, Mercado Pago o
 * Go Cuotas se enchufan sin tocar el checkout. Los datos de la tarjeta NUNCA llegan al servidor:
 * el navegador los tokeniza con el SDK del proveedor y acá solo viaja el token.
 */
export type PaymentStatus = "aprobado" | "rechazado" | "pendiente";

export type CreatePaymentInput = {
  orderId: string;
  orderNumber: string;
  /** Total en pesos (sin centavos) */
  amount: number;
  installments: number;
  interestFree: boolean;
  /** visa, master, naranja, tarjeta_verde, debito… */
  cardBrand: string;
  /** Token de un solo uso generado en el navegador */
  token: string;
  /** Primeros 6 dígitos (los pide Payway para validar el medio) */
  bin?: string;
  customer: { email: string; dni: string; name: string };
};

export type PaymentResult = {
  status: PaymentStatus;
  providerPaymentId: string | null;
  /** Mensaje para mostrarle a la persona si se rechaza */
  message?: string;
  raw?: unknown;
};

export type PaymentNotification = {
  providerPaymentId: string;
  orderNumber: string | null;
  status: PaymentStatus;
  raw: unknown;
};

export interface PaymentProvider {
  readonly id: "payway" | "mercadopago" | "gocuotas" | "mock";
  createPayment(input: CreatePaymentInput): Promise<PaymentResult>;
  getStatus(providerPaymentId: string): Promise<PaymentResult>;
  /** Valida y traduce la notificación (webhook) del proveedor. null = no es válida. */
  parseNotification(req: Request): Promise<PaymentNotification | null>;
}
