/** Formato de moneda argentina: "$ 59.000" (punto de miles, sin decimales). El espacio no se corta de línea. */
export function formatPrice(value: number): string {
  const n = Math.round(value);
  return `$\u00a0${n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".")}`;
}

/** "Visa 3 cuotas sin interés" */
export function promoShortLabel(p: { label: string; installments: number; interestFree: boolean }): string {
  return `${p.label} ${p.installments} ${p.interestFree ? "cuotas sin interés" : "cuotas"}`;
}

/** Link de WhatsApp con mensaje precargado. */
export function whatsappLink(number: string, text?: string): string {
  const base = `https://wa.me/${number.replace(/\D/g, "")}`;
  return text ? `${base}?text=${encodeURIComponent(text)}` : base;
}
