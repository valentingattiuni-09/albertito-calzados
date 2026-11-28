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

// ---------- Con el back office (DATA_SOURCE=backoffice) ----------

type DecidirSdk = {
  setPublishableKey(key: string): void;
  setTimeout(ms: number): void;
  createToken(form: HTMLFormElement, cb: (status: number, response: { id?: string; bin?: string; error?: unknown }) => void): void;
};
declare global {
  interface Window {
    Decidir?: new (url: string, inhabilitarCS?: boolean) => DecidirSdk;
  }
}

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[data-payway-sdk="${src}"]`)) return resolve();
    const s = document.createElement("script");
    s.src = src;
    s.async = true;
    s.dataset.paywaySdk = src;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("No pudimos cargar el formulario de pago. Revisá tu conexión."));
    document.head.appendChild(s);
  });
}

/**
 * Tokeniza la tarjeta para el back office. El número, el vencimiento y el código NUNCA salen del navegador: se convierten en un token de un solo uso.
 *  - mock (NEXT_PUBLIC_PAYMENT_PROVIDER=mock, con el back en PAYWAY_PROVIDER=mock): token del simulado del back
 *    (tarjeta terminada en 0002 = rechazada, 0003 = pendiente, otra = aprobada).
 *  - payway: SDK de Payway (ex Decidir) con la clave PÚBLICA que da la API. A CONFIRMAR con la documentación del contrato: la URL del SDK
 *    (NEXT_PUBLIC_PAYWAY_SDK_URL), la del entorno (NEXT_PUBLIC_PAYWAY_API_URL), los nombres de los campos `data-decidir` y si hace falta la huella del dispositivo.
 */
export async function tokenizeForBackoffice(c: CardInput, publicKey: string | null): Promise<CardToken> {
  const num = c.number.replace(/\D/g, "");
  const bin = num.slice(0, 6);
  const last4 = num.slice(-4);
  if (PROVIDER === "mock") {
    const { mockPaywayToken } = await import("@/lib/backoffice/checkout-map");
    return { token: mockPaywayToken(num, crypto.randomUUID()), bin, last4 };
  }
  if (PROVIDER !== "payway") throw new Error(`Proveedor de pago desconocido: ${PROVIDER}`);
  const sdkUrl = process.env.NEXT_PUBLIC_PAYWAY_SDK_URL;
  const apiUrl = process.env.NEXT_PUBLIC_PAYWAY_API_URL;
  if (!sdkUrl || !apiUrl || !publicKey) throw new Error("El pago con tarjeta no está disponible ahora. Probá con Mercado Pago.");
  await loadScript(sdkUrl);
  if (!window.Decidir) throw new Error("No pudimos cargar el formulario de pago. Probá de nuevo.");
  const sdk = new window.Decidir(apiUrl, true);
  sdk.setPublishableKey(publicKey);
  sdk.setTimeout(15_000);
  // Formulario efímero con los atributos que lee el SDK: se arma, se tokeniza y se borra (nunca se envía)
  const form = document.createElement("form");
  form.hidden = true;
  const field = (name: string, value: string) => {
    const i = document.createElement("input");
    i.setAttribute("data-decidir", name);
    i.value = value;
    form.appendChild(i);
  };
  field("card_number", num);
  field("security_code", c.cvv);
  field("card_expiration_month", c.expMonth.padStart(2, "0"));
  field("card_expiration_year", c.expYear.slice(-2));
  field("card_holder_name", c.holderName.trim());
  field("card_holder_doc_type", "dni");
  field("card_holder_doc_number", c.holderDni.replace(/\D/g, ""));
  document.body.appendChild(form);
  try {
    return await new Promise<CardToken>((resolve, reject) =>
      sdk.createToken(form, (status, res) => (status === 200 || status === 201) && res.id ? resolve({ token: res.id, bin: res.bin ?? bin, last4 }) : reject(new Error("Revisá los datos de la tarjeta."))),
    );
  } finally {
    form.remove();
  }
}
