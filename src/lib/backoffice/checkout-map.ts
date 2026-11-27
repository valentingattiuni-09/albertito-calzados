/**
 * Checkout contra el back office (fase B): tipos de la API, mapeos y reglas PURAS (sin Next ni red), para testearlas con node --test.
 * Lo que habla con la API está en checkout.ts (solo servidor).
 */
import type { ShippingOption } from "@/lib/shipping/types";

// ---------- Tipos de la API de la tienda (/api/v1/store/*) ----------

export type BoQuoteOption = {
  id: string;
  method: "HOME" | "BRANCH" | "PICKUP";
  provider: string;
  providerName: string;
  label: string;
  priceCents: number;
  eta: { min: number; max: number } | null;
  requiresBranch: boolean;
};
export type BoQuote = { postalCode: string; options: BoQuoteOption[]; warnings: string[] };
export type BoBranch = { id: string; name: string; address: string; city: string; province: string; postalCode: string; hours: string | null };
export type BoStoreStatus = "pendiente" | "pagado" | "en_revision" | "enviado" | "entregado" | "cancelado";
export type BoPaymentView = { method: "MERCADOPAGO" | "PAYWAY"; status: "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED" | "REFUNDED"; installments: number | null; cardBrand: string | null; last4: string | null };
export type BoOrderView = {
  id: string;
  number: string;
  status: string;
  storeStatus: BoStoreStatus;
  createdAt: string;
  expiresAt: string;
  paidAt: string | null;
  customer: { email: string; firstName: string; lastName: string; phone: string };
  delivery: {
    method: "HOME" | "BRANCH" | "PICKUP";
    label: string;
    etaDays: number | null;
    eta: { min: number; max: number } | null;
    address: { street: string; number: string; apartment: string | null; city: string; province: string; postalCode: string; notes: string | null } | null;
    branch: BoBranch | null;
  };
  items: { variantId: string; brandName: string; productName: string; sku: string; size: string; color: string; quantity: number; listUnitPriceCents: number; unitPriceCents: number; lineTotalCents: number }[];
  subtotalCents: number;
  shippingCents: number;
  totalCents: number;
  payment: BoPaymentView | null;
  attemptsLeft: number;
  shipment: { status: string; carrier: string | null; trackingCode: string | null } | null;
};
export type BoPaymentOptions = {
  providers: { id: "MERCADOPAGO" | "PAYWAY"; mode: "REDIRECT" | "DIRECT"; publicKey: string | null }[];
  oneInstallmentAlways: boolean;
  plans: { provider: "MERCADOPAGO" | "PAYWAY"; cardBrand: string | null; installments: number; interestFree: boolean; minAmountCents: number; endsAt: string | null }[];
  brands: { credit: string[]; debit: string[] };
  maxAttempts: number;
};
export type BoPayResult = {
  attemptId: string;
  provider: "MERCADOPAGO" | "PAYWAY";
  mode: "REDIRECT" | "DIRECT";
  status: "STARTED" | "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED" | "REFUNDED" | "SUPERSEDED" | "ERROR" | "EXPIRED";
  installments: number;
  cardBrand: string | null;
  redirectUrl: string | null;
  errorCode: string | null;
  attemptsLeft: number;
  order: { number: string; status: string; storeStatus: BoStoreStatus; expiresAt: string };
};
export type BoTrackView = {
  number: string;
  storeStatus: BoStoreStatus;
  createdAt: string;
  paidAt: string | null;
  items: { brandName: string; productName: string; size: string; color: string; quantity: number }[];
  totalCents: number;
  delivery: { method: string; label: string; etaDays: number | null; eta: { min: number; max: number } | null };
  shipment: { status: string; carrier: string | null; trackingCode: string | null } | null;
};
/** Error de la API: { statusCode, message, code, ... } */
export type BoError = { statusCode?: number; message?: string | string[]; code?: string; [k: string]: unknown };

// ---------- Envío ----------

const PROVIDER_ID: Record<string, ShippingOption["provider"]> = { andreani: "andreani", micorreo: "correo_argentino", local: "local", respaldo: "fallback" };
const SERVICE: Record<BoQuoteOption["method"], ShippingOption["service"]> = { HOME: "domicilio", BRANCH: "sucursal", PICKUP: "retiro" };

/** Cotización de la API → la forma que ya usa la tienda (precios en pesos; el plazo largo en etaDays y el rango en eta). */
export function toQuoteState(q: BoQuote): { cp: string; options: (ShippingOption & { eta?: { min: number; max: number } | null; boProvider: string })[]; warnings: string[] } {
  return {
    cp: q.postalCode,
    warnings: q.warnings,
    options: q.options.map((o) => ({
      id: o.id,
      provider: PROVIDER_ID[o.provider] ?? "fallback",
      boProvider: o.provider,
      providerName: o.providerName,
      service: SERVICE[o.method],
      label: o.label,
      price: Math.round(o.priceCents / 100),
      etaDays: o.eta ? o.eta.max : null,
      eta: o.eta,
    })),
  };
}

/** Las sucursales que muestra el selector: nombre y dirección con la localidad */
export const toBranches = (list: BoBranch[]) => list.map((b) => ({ id: b.id, name: b.name, address: [b.address, b.city].filter(Boolean).join(", ") }));

/** Para listar sucursales: la empresa en el id de la API y si necesita la provincia (Correo Argentino busca por provincia) */
export function branchProviderOf(optionId: string): { provider: "andreani" | "micorreo"; needsProvince: boolean } | null {
  const [provider, service] = optionId.split(":");
  if (service !== "sucursal") return null;
  if (provider === "andreani") return { provider, needsProvince: false };
  if (provider === "micorreo") return { provider, needsProvince: true };
  return null;
}

// ---------- Pedido ----------

export type CheckoutInput = {
  customer: { email: string; firstName: string; lastName: string; dni: string; phone: string };
  items: { variantId: string; qty: number }[];
  shipping: { optionId: string; cp: string; price: number; branchId?: string; province?: string; address?: { street: string; number: string; floor?: string; city: string; province: string } };
};

/** El cuerpo de POST /store/orders. El precio del envío va en centavos y solo se COMPARA: la API recotiza. */
export function toOrderBody(input: CheckoutInput) {
  const s = input.shipping;
  const method: BoQuoteOption["method"] = s.optionId === "local:retiro" ? "PICKUP" : s.optionId.endsWith(":sucursal") ? "BRANCH" : "HOME";
  return {
    customer: { email: input.customer.email.trim().toLowerCase(), firstName: input.customer.firstName.trim(), lastName: input.customer.lastName.trim(), phone: input.customer.phone.trim(), dni: input.customer.dni.replace(/\D/g, "") },
    items: input.items.map((i) => ({ variantId: i.variantId, quantity: Math.max(1, Math.min(10, Math.floor(i.qty))) })),
    delivery: {
      method,
      optionId: s.optionId,
      quotedCents: Math.round(s.price * 100),
      postalCode: s.cp,
      ...(method === "HOME" && s.address
        ? { address: { street: s.address.street.trim(), number: s.address.number.trim(), ...(s.address.floor?.trim() ? { apartment: s.address.floor.trim() } : {}), city: s.address.city.trim(), province: s.address.province } }
        : {}),
      ...(method === "BRANCH" ? { branchId: s.branchId ?? "", ...(s.province ? { province: s.province } : {}) } : {}),
    },
  };
}

// ---------- Pago ----------

/** Marcas de la web → las de la API */
const BRAND_TO_API: Record<string, string> = { visa: "visa", master: "mastercard", naranja: "naranja", amex: "amex", cabal: "cabal", visa_debito: "visa_debito", master_debito: "mastercard_debito", maestro: "maestro" };
export const brandToApi = (b: string) => BRAND_TO_API[b] ?? b;
const BRAND_LABEL: Record<string, string> = {
  visa: "Visa",
  mastercard: "Mastercard",
  amex: "American Express",
  naranja: "Naranja",
  cabal: "Cabal",
  visa_debito: "Visa Débito",
  mastercard_debito: "Mastercard Débito",
  maestro: "Maestro",
  cabal_debito: "Cabal Débito",
};
export const brandLabel = (b: string | null) => (b ? (BRAND_LABEL[b] ?? "Tarjeta") : "Tarjeta");

/**
 * Cuotas que se ofrecen: «1 pago» siempre; débito, solo 1. Payway: los planes de esa marca o de cualquier marca. Mercado Pago: los suyos (es el máximo
 * que se ofrece en su sitio). La API vuelve a validarlas antes de cobrar.
 */
export function installmentsFor(opts: BoPaymentOptions, provider: "PAYWAY" | "MERCADOPAGO", webBrand: string | null): number[] {
  const brand = webBrand ? brandToApi(webBrand) : null;
  if (provider === "PAYWAY" && (!brand || opts.brands.debit.includes(brand))) return [1];
  const plans = opts.plans.filter((p) => p.provider === provider && p.interestFree && (provider === "MERCADOPAGO" || p.cardBrand === null || p.cardBrand === brand));
  return [...new Set([1, ...plans.map((p) => p.installments)])].sort((a, b) => a - b);
}

/**
 * Tarjetas de prueba con Payway SIMULADO (el back con PAYWAY_PROVIDER=mock): terminada en 0002 = rechazada, 0003 = pendiente, cualquier otra = aprobada.
 * Devuelve el token que entiende el simulado del back.
 */
export function mockPaywayToken(cardNumber: string, random: string): string {
  const last4 = cardNumber.replace(/\D/g, "").slice(-4);
  const outcome = last4 === "0002" ? "rechazado" : last4 === "0003" ? "pendiente" : "aprobado";
  return `tok_${outcome}_${random}`;
}

/** Lo que la web le devuelve al navegador después de pagar */
export type PayOutcome = "redirect" | "aprobado" | "pendiente" | "revision" | "rechazado" | "error";
export function payOutcome(r: BoPayResult): PayOutcome {
  if (r.redirectUrl && r.status === "STARTED") return "redirect";
  if (r.order.storeStatus === "en_revision") return "revision";
  if (r.status === "APPROVED" || ["pagado", "enviado", "entregado"].includes(r.order.storeStatus)) return "aprobado";
  if (r.status === "PENDING" || r.status === "STARTED") return "pendiente";
  if (r.status === "ERROR") return "error";
  return "rechazado";
}

// ---------- Errores de la API → mensajes (voseo) ----------

export type ErrorAction = {
  message: string;
  /** A qué paso del checkout volver */
  step?: 1 | 2 | 3;
  /** Qué tiene que hacer la web además de mostrar el mensaje */
  action?: "sync_cart" | "requote" | "reload_installments" | "go_confirmation" | "new_order" | "retry_new_key";
};

const pesosAR = (cents: number) => `$${new Intl.NumberFormat("es-AR", { maximumFractionDigits: 0 }).format(Math.round(cents / 100))}`;

export function errorAction(e: BoError | null | undefined, status?: number): ErrorAction {
  const code = e?.code ?? "";
  switch (code) {
    case "OUT_OF_STOCK":
      return { message: "Se agotó alguno de los productos mientras comprabas. Revisá tu carrito.", action: "sync_cart" };
    case "VARIANT_UNAVAILABLE":
      return { message: "Alguno de los productos ya no está disponible. Revisá tu carrito.", action: "sync_cart" };
    case "SHIPPING_CHANGED":
      return typeof e?.currentCents === "number"
        ? { message: `El envío cambió: ahora sale ${pesosAR(e.currentCents)}. Revisalo y confirmá de nuevo.`, step: 2, action: "requote" }
        : { message: "Esa forma de envío ya no está disponible. Elegí otra.", step: 2, action: "requote" };
    case "BRANCH_UNAVAILABLE":
      return { message: "Esa sucursal ya no está disponible. Elegí otra.", step: 2, action: "requote" };
    case "DELIVERY_UNAVAILABLE":
      return { message: "Esa forma de entrega no está disponible. Elegí otra.", step: 2, action: "requote" };
    case "PROVINCE_REQUIRED":
    case "PROVINCE_UNKNOWN":
      return { message: "Elegí la provincia para ver las sucursales.", step: 2 };
    case "SHIPPING_PROVIDER_UNAVAILABLE":
      return { message: "La empresa de envíos no está respondiendo. Probá en un rato o elegí otra forma de envío.", step: 2 };
    case "EMAIL_RESERVED":
      return { message: "No podemos usar ese mail. Probá con otro.", step: 1 };
    case "BILLING_DOC_REQUIRED":
    case "BILLING_INVALID":
      return { message: "Revisá tu DNI: lo necesitamos para la factura.", step: 1 };
    case "IDEMPOTENCY_MISMATCH":
      return { message: "Cambiaste el pedido: lo armamos de nuevo.", action: "retry_new_key" };
    case "INSTALLMENTS_NOT_ALLOWED":
      return { message: "Esas cuotas ya no están disponibles para este pago. Elegí otra opción.", step: 3, action: "reload_installments" };
    case "PAYMENT_IN_PROGRESS":
      return { message: "Ya hay un pago de este pedido en proceso. Esperá unos minutos antes de intentar de nuevo.", step: 3 };
    case "PAYMENT_ATTEMPTS_EXCEEDED":
      return { message: "Llegaste al máximo de intentos de pago para este pedido. Armá el pedido de nuevo.", action: "new_order" };
    case "ALREADY_PAID":
      return { message: "Este pedido ya está pago.", action: "go_confirmation" };
    case "ORDER_IN_REVIEW":
      return { message: "Recibimos tu pago y estamos revisando el pedido. Te escribimos dentro de las 24 h hábiles.", action: "go_confirmation" };
    case "ORDER_EXPIRED":
      return { message: "Tu reserva venció. Armá el pedido de nuevo: tu carrito sigue acá.", action: "new_order" };
    case "ORDER_CANCELLED":
      return { message: "Este pedido se canceló. Armá el pedido de nuevo: tu carrito sigue acá.", action: "new_order" };
    case "CARD_TOKEN_REQUIRED":
      return { message: "Revisá los datos de la tarjeta.", step: 3 };
    case "CARD_TOKEN_NOT_EXPECTED":
      return { message: "Con este medio cargás la tarjeta en el sitio de pago.", step: 3 };
    case "PROVIDER_UNAVAILABLE":
      return { message: "Este medio de pago no está disponible ahora. Probá con otro.", step: 3, action: "reload_installments" };
    case "PAYMENT_PROVIDER_ERROR":
      return { message: "No pudimos iniciar el pago. Probá de nuevo en unos minutos.", step: 3 };
    case "RESUME_EXPIRED":
      return { message: "El link venció. Armá el pedido de nuevo en la tienda.", action: "new_order" };
    case "RESUME_RATE_LIMIT":
    case "TRACK_RATE_LIMIT":
      return { message: "Hiciste muchos intentos seguidos. Esperá un minuto y probá de nuevo." };
    case "RESUME_LIMIT_REACHED":
      return { message: "Este link ya se usó demasiadas veces. Escribinos y te ayudamos." };
    case "WITHDRAWAL_RATE_LIMIT":
      return { message: "Ya recibimos tu solicitud. Si necesitás mandar otra, esperá un minuto." };
    case "ORDER_NOT_FOUND":
      return { message: "No encontramos ese pedido." };
  }
  if (status === 401 || status === 403) return { message: "Estamos actualizando la tienda. Probá de nuevo en unos minutos." };
  if (status === 400) return { message: "Revisá los datos e intentá de nuevo." };
  return { message: "No pudimos completar la operación. Probá de nuevo en unos minutos." };
}

// ---------- Cookie del token del pedido ----------

/** Una cookie por pedido. El token NUNCA va a la URL, al JavaScript del navegador ni a la analítica. */
export const ORDER_COOKIE_PREFIX = "alb_pedido_";
export const ORDER_COOKIE_DAYS = 30;
export const ORDER_COOKIE_MAX = 5;
export const orderCookieName = (number: string) => `${ORDER_COOKIE_PREFIX}${number}`;
export function orderCookieOptions(secure: boolean) {
  // Lax y no Strict: al volver de Mercado Pago (navegación desde otro sitio) la cookie tiene que viajar
  return { httpOnly: true, secure, sameSite: "lax" as const, path: "/", maxAge: ORDER_COOKIE_DAYS * 24 * 3600 };
}
/** El valor guarda cuándo se emitió para poder borrar las más viejas: `<segundos>.<token>` */
export const orderCookieValue = (token: string, now = Date.now()) => `${Math.floor(now / 1000)}.${token}`;
export function parseOrderCookie(value: string | undefined): { issuedAt: number; token: string } | null {
  const m = /^(\d{9,11})\.([A-Za-z0-9_-]{20,200})$/.exec(value ?? "");
  return m ? { issuedAt: Number(m[1]), token: m[2] } : null;
}
/** Con más de ORDER_COOKIE_MAX pedidos guardados, cuáles borrar (los más viejos) */
export function cookiesToDrop(entries: { name: string; value: string }[], keep = ORDER_COOKIE_MAX): string[] {
  const parsed = entries.filter((e) => e.name.startsWith(ORDER_COOKIE_PREFIX)).map((e) => ({ name: e.name, at: parseOrderCookie(e.value)?.issuedAt ?? 0 }));
  return parsed
    .sort((a, b) => b.at - a.at)
    .slice(keep)
    .map((e) => e.name);
}

// ---------- Confirmación ----------

/** Consultas mientras el pedido esté pendiente (segundos desde que se abre la página). Después, botón «Actualizar». */
export const POLL_DELAYS_S = [2, 4, 8, 15, 30];

/** El evento purchase de analítica: solo con el pedido pagado (no en revisión) y una sola vez por pedido. */
export const purchaseStatus = (s: BoStoreStatus) => s === "pagado" || s === "enviado" || s === "entregado";
export const purchaseKey = (number: string) => `albertito:purchase:${number}`;

/** El `#r=` del mail de pago rechazado: la firma, o null si no tiene la forma esperada */
export function parseResumeHash(hash: string): string | null {
  const m = /^#r=(\d{9,11}\.[A-Za-z0-9_-]{43})$/.exec(hash);
  return m ? m[1] : null;
}
export const resumeStorageKey = (pathname: string) => `albertito:reintento:${pathname}`;
/**
 * Script inline del <head> (corre ANTES que GA4 y el Pixel, que mandan la URL completa con lo que va después del #): guarda la firma en sessionStorage y la
 * saca de la barra. El patrón es el mismo de parseResumeHash.
 */
export const RESUME_CAPTURE_SCRIPT =
  "(function(){try{var m=/^#r=(\\d{9,11}\\.[A-Za-z0-9_-]{43})$/.exec(location.hash);if(m){sessionStorage.setItem('albertito:reintento:'+location.pathname,m[1]);history.replaceState(null,'',location.pathname+location.search);}}catch(e){}})();";

/** Número de pedido de la tienda */
export const isOrderNumber = (s: string) => /^ALB-\d{6}$/.test(s);
