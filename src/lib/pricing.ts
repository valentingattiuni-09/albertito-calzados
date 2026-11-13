import type { PaymentPromo } from "@/lib/data/types";

export type InstallmentOption = {
  promo: PaymentPromo;
  installments: number;
  amount: number; // valor de cada cuota (redondeado hacia arriba)
};

/** Opciones de cuotas sin interés que aplican a un precio (respeta montos mínimos). */
export function installmentOptions(price: number, promos: PaymentPromo[]): InstallmentOption[] {
  return promos
    .filter((p) => p.interestFree && p.installments > 1 && price >= p.minAmount)
    .map((p) => ({ promo: p, installments: p.installments, amount: Math.ceil(price / p.installments) }))
    .sort((a, b) => b.installments - a.installments);
}

/** Mejor cuota S/I para mostrar en la tarjeta: "5 S/I de $ 11.980". */
export function bestInstallment(price: number, promos: PaymentPromo[]): InstallmentOption | null {
  return installmentOptions(price, promos)[0] ?? null;
}

/** Precio sin impuestos nacionales (Régimen de Transparencia Fiscal al Consumidor). */
export function priceWithoutTaxes(price: number, factor: number): number {
  return Math.round(price / (factor || 1.21));
}
