/** Logos de las tarjetas (PNG sin fondo en /public/logos). Si la promo tiene un logo cargado desde el panel, se usa ese. */
type Logo = { src: string; width: number; height: number };

/** Versión para tamaños chicos (solo el símbolo, sin el texto que no se llega a leer). */
const COMPACT: Record<string, Logo> = {
  master: { src: "/logos/mastercard-simbolo.png", width: 201, height: 122 },
};

const LOGOS: Record<string, Logo> = {
  visa: { src: "/logos/visa.png", width: 484, height: 160 },
  master: { src: "/logos/mastercard.png", width: 201, height: 160 },
  naranja: { src: "/logos/naranja.png", width: 458, height: 160 },
};

/** "visa_debito" usa el logo de Visa, "master_debito" el de Mastercard. */
export function paymentLogo(provider: string, logoUrl?: string | null, compact = false): Logo | null {
  if (logoUrl) return { src: logoUrl, width: 120, height: 40 };
  const key = provider.replace(/_debito$/, "");
  return (compact ? COMPACT[key] : undefined) ?? LOGOS[key] ?? null;
}
