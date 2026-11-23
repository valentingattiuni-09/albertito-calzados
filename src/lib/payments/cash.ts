import "server-only";
import { createHash } from "node:crypto";
import { CASH_DAYS } from "./cash-info";
import type { PaymentResult } from "./types";


export type CashVoucher = { code: string; expiresAt: string };

/**
 * Cupón para pagar en efectivo en Pago Fácil o Rapipago.
 * Por ahora es de prueba: genera un código y deja el pago pendiente.
 * TODO: conectar un proveedor real que emita el cupón y avise cuando se paga
 * (Mercado Pago con payment_method_id "pagofacil" / "rapipago", o Pagos360). Ese aviso
 * llega por /api/webhooks y pasa el pedido a "pagado"; mientras tanto se marca a mano en el panel.
 */
export function createCashVoucher(orderNumber: string, amount: number): PaymentResult & { voucher: CashVoucher } {
  const digits = BigInt(`0x${createHash("sha256").update(`${orderNumber}:${amount}:${Date.now()}`).digest("hex").slice(0, 15)}`)
    .toString()
    .padStart(14, "0")
    .slice(0, 14);
  const voucher: CashVoucher = {
    code: digits.replace(/(\d{4})(?=\d)/g, "$1 "),
    expiresAt: new Date(Date.now() + CASH_DAYS * 86_400_000).toISOString(),
  };
  return {
    status: "pendiente",
    providerPaymentId: `efectivo-${orderNumber}-${digits}`,
    message: "Pagá en Pago Fácil o Rapipago con el código del cupón.",
    raw: { cash: voucher },
    voucher,
  };
}
