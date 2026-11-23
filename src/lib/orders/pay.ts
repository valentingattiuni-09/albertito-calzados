import "server-only";
import { revalidateTag } from "next/cache";
import { TAGS } from "@/lib/data/tags";
import { getPaymentPromos } from "@/lib/data/layout";
import { sendOrderConfirmation } from "@/lib/email";
import { cardProvider } from "@/lib/payments";
import { createCashVoucher } from "@/lib/payments/cash";
import { recordPayment, type OrderView } from "./orders";

/** method "efectivo": cupón para Pago Fácil o Rapipago (sin tarjeta). */
export type PaymentInput = { method?: "tarjeta" | "efectivo"; token: string; brand: string; installments: number; bin?: string };

export const CARD_BRANDS = ["visa", "master", "naranja", "tarjeta_verde", "visa_debito", "master_debito"] as const;

/** Cuotas permitidas para una marca y un total: 1 pago siempre, más las promos S/I vigentes que apliquen. */
export async function allowedInstallments(brand: string, total: number): Promise<{ installments: number; interestFree: boolean }[]> {
  const promos = await getPaymentPromos();
  const options = [{ installments: 1, interestFree: true }];
  if (brand.endsWith("_debito")) return options;
  promos
    .filter((p) => p.provider === brand && p.interestFree && p.installments > 1 && total >= p.minAmount)
    .forEach((p) => options.push({ installments: p.installments, interestFree: true }));
  return options;
}

export type PayOutcome = { order: OrderView; message?: string };

/** Cobra un pedido con el proveedor activo y registra el resultado. */
export async function payOrder(order: OrderView, payment: PaymentInput, siteUrl: string): Promise<PayOutcome> {
  if (order.paymentStatus === "aprobado") return { order };

  // Efectivo: se genera el cupón y el pedido queda pendiente hasta que se pague
  if (payment.method === "efectivo") {
    const cash = createCashVoucher(order.number, order.total);
    const updated = await recordPayment(order, "efectivo", cash, {
      amount: order.total,
      installments: 1,
      interestFree: true,
      cardBrand: "efectivo",
      voucher: cash.voucher,
    });
    return { order: updated };
  }
  if (!(CARD_BRANDS as readonly string[]).includes(payment.brand)) return { order, message: "Elegí la tarjeta." };
  if (typeof payment.token !== "string" || payment.token.length < 6 || payment.token.length > 200) {
    return { order, message: "No pudimos leer la tarjeta. Probá de nuevo." };
  }
  const plan = (await allowedInstallments(payment.brand, order.total)).find((o) => o.installments === payment.installments);
  if (!plan) return { order, message: "Esa cantidad de cuotas no está disponible para esta tarjeta." };

  const provider = cardProvider();
  let result;
  try {
    result = await provider.createPayment({
      orderId: order.id,
      orderNumber: order.number,
      amount: order.total,
      installments: plan.installments,
      interestFree: plan.interestFree,
      cardBrand: payment.brand,
      token: payment.token,
      bin: payment.bin?.replace(/\D/g, "").slice(0, 8),
      customer: { email: order.customer.email, dni: order.customer.dni, name: `${order.customer.firstName} ${order.customer.lastName}` },
    });
  } catch (e) {
    console.error("[pago]", e);
    return { order, message: "No pudimos comunicarnos con el medio de pago. Probá en unos minutos." };
  }

  const updated = await recordPayment(order, provider.id, result, {
    amount: order.total,
    installments: plan.installments,
    interestFree: plan.interestFree,
    cardBrand: payment.brand,
  });
  if (updated.paymentStatus === "aprobado") {
    // El stock cambió: que listados y fichas lo reflejen ya
    revalidateTag(TAGS.products, { expire: 0 });
    await sendOrderConfirmation(updated, siteUrl).catch((e) => console.error("[mail]", e));
  }
  return { order: updated, message: result.message };
}
