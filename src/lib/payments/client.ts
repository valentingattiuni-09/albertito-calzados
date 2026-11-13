"use client";

/**
 * Tokenización en el navegador. El número de tarjeta, vencimiento y código NUNCA se envían
 * a nuestro servidor: se convierten en un token de un solo uso y solo viaja ese token.
 *  - mock: token de prueba con los últimos 4 dígitos (para simular aprobado/rechazado).
 *  - payway: SDK JS de Payway con NEXT_PUBLIC_PAYWAY_PUBLIC_KEY (se conecta en la Fase 6).
 */
export type CardInput = {
  number: string;
  holderName: string;
  expMonth: string;
  expYear: string;
  cvv: string;
  holderDni: string;
};

export type CardToken = { token: string; bin: string; last4: string };

const PROVIDER = process.env.NEXT_PUBLIC_PAYMENT_PROVIDER ?? "mock";

export function luhn(num: string): boolean {
  const d = num.replace(/\D/g, "");
  if (d.length < 13 || d.length > 19) return false;
  let sum = 0;
  for (let i = 0; i < d.length; i++) {
    let n = Number(d[d.length - 1 - i]);
    if (i % 2 === 1) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    sum += n;
  }
  return sum % 10 === 0;
}

/** Marca probable según los primeros dígitos (la persona igual elige la tarjeta). */
export function detectBrand(num: string): "visa" | "master" | "naranja" | null {
  const d = num.replace(/\D/g, "");
  if (/^589562/.test(d)) return "naranja";
  if (/^4/.test(d)) return "visa";
  if (/^(5[1-5]|2[2-7])/.test(d)) return "master";
  return null;
}

export function validateCard(c: CardInput): string | null {
  const num = c.number.replace(/\D/g, "");
  // En modo prueba se aceptan números sin Luhn para poder usar 4111…0002 / 0003
  if (PROVIDER !== "mock" && !luhn(num)) return "Revisá el número de la tarjeta.";
  if (num.length < 13) return "Revisá el número de la tarjeta.";
  if (!c.holderName.trim()) return "Completá el nombre como figura en la tarjeta.";
  const m = Number(c.expMonth);
  const y = 2000 + Number(c.expYear);
  const now = new Date();
  if (!(m >= 1 && m <= 12) || y < now.getFullYear() || (y === now.getFullYear() && m < now.getMonth() + 1)) return "Revisá el vencimiento.";
  if (!/^\d{3,4}$/.test(c.cvv)) return "Revisá el código de seguridad.";
  if (!/^\d{7,8}$/.test(c.holderDni.replace(/\D/g, ""))) return "Revisá el DNI del titular.";
  return null;
}

export async function tokenizeCard(c: CardInput): Promise<CardToken> {
  const num = c.number.replace(/\D/g, "");
  const bin = num.slice(0, 6);
  const last4 = num.slice(-4);

  if (PROVIDER === "mock") {
    const rand = crypto.getRandomValues(new Uint32Array(2)).join("");
    return { token: `mock_${last4}_${rand}`, bin, last4 };
  }

  if (PROVIDER === "payway") {
    // TODO(Fase 6): cargar el SDK de Payway, crear el token con la clave pública y devolverlo.
    throw new Error("Payway todavía no está conectado. Usá el modo de prueba.");
  }

  throw new Error(`Proveedor de pago desconocido: ${PROVIDER}`);
}
