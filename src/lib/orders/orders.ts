import "server-only";
import { randomBytes, randomUUID } from "node:crypto";
import type { PaymentResult } from "@/lib/payments/types";
import { demoDb } from "@/lib/demo/db";
import { hasSupabase, serviceClient } from "@/lib/supabase/clients";
import { getLiveVariants, type LiveVariant } from "./live";

// ---------------------------------------------------------------------------
// Carrito
// ---------------------------------------------------------------------------
export type CartLineInput = { variantId: string; qty: number };

export type ValidatedLine = LiveVariant & {
  qty: number;
  /** Cantidad pedida antes de ajustar al stock */
  requestedQty: number;
  issue: "sin_stock" | "stock_ajustado" | "no_disponible" | null;
};

/** Revalida precio y stock de cada línea contra la base (al abrir el carrito y antes de pagar). */
export async function validateCart(items: CartLineInput[]): Promise<{ lines: ValidatedLine[]; missing: string[]; subtotal: number }> {
  const clean = items
    .filter((i) => typeof i?.variantId === "string" && Number.isFinite(i.qty))
    .map((i) => ({ variantId: i.variantId, qty: Math.max(1, Math.min(20, Math.floor(i.qty))) }))
    .slice(0, 30);
  const live = await getLiveVariants(clean.map((i) => i.variantId));
  const lines: ValidatedLine[] = [];
  const missing: string[] = [];
  for (const i of clean) {
    const v = live.get(i.variantId);
    if (!v) {
      missing.push(i.variantId);
      continue;
    }
    const issue = !v.available ? "no_disponible" : v.stock === 0 ? "sin_stock" : v.stock < i.qty ? "stock_ajustado" : null;
    lines.push({ ...v, requestedQty: i.qty, qty: issue === "stock_ajustado" ? v.stock : i.qty, issue });
  }
  const subtotal = lines.filter((l) => !l.issue || l.issue === "stock_ajustado").reduce((n, l) => n + l.price * l.qty, 0);
  return { lines, missing, subtotal };
}

// ---------------------------------------------------------------------------
// Cupones
// ---------------------------------------------------------------------------
type Coupon = { code: string; type: "percent" | "fixed"; value: number; minAmount: number };


export async function findCoupon(code: string, subtotal: number): Promise<{ coupon: Coupon; discount: number } | { error: string }> {
  const normalized = code.trim().toUpperCase().slice(0, 40);
  if (!normalized) return { error: "Ingresá un cupón." };
  let coupon: Coupon | undefined;
  if (!hasSupabase) {
    coupon = demoDb().coupons.find((c) => c.code === normalized);
  } else {
    const nowIso = new Date().toISOString();
    const { data } = await serviceClient()
      .from("coupons")
      .select("code, type, value, min_amount, max_uses, used_count, starts_at, ends_at")
      .eq("active", true)
      .ilike("code", normalized)
      .maybeSingle();
    if (
      data &&
      (!data.starts_at || data.starts_at <= nowIso) &&
      (!data.ends_at || data.ends_at > nowIso) &&
      (data.max_uses === null || data.used_count < data.max_uses)
    ) {
      coupon = { code: data.code, type: data.type, value: data.value, minAmount: data.min_amount };
    }
  }
  if (!coupon) return { error: "Ese cupón no existe o ya venció." };
  if (subtotal < coupon.minAmount) return { error: `El cupón es para compras desde $ ${coupon.minAmount.toLocaleString("es-AR")}.` };
  const discount = coupon.type === "percent" ? Math.round((subtotal * coupon.value) / 100) : Math.min(coupon.value, subtotal);
  return { coupon, discount };
}

// ---------------------------------------------------------------------------
// Pedidos
// ---------------------------------------------------------------------------
export type Customer = { email: string; firstName: string; lastName: string; dni: string; phone: string };

export type ShippingChoice = {
  method: "domicilio" | "sucursal" | "retiro";
  provider: string;
  service: string;
  label: string;
  cost: number;
  etaDays: number | null;
  postalCode: string | null;
  address: { street: string; number: string; floor?: string; city: string; province: string; cp: string } | null;
  branch: { id: string; name: string; address: string } | null;
};

export type OrderItemView = { name: string; colorName: string | null; size: string; sku: string; imageUrl: string | null; unitPrice: number; qty: number; slug?: string };

export type OrderView = {
  id: string;
  number: string;
  accessToken: string;
  customer: Customer;
  shipping: ShippingChoice;
  trackingCode: string | null;
  subtotal: number;
  discount: number;
  total: number;
  couponCode: string | null;
  status: "pendiente" | "pagado" | "enviado" | "entregado" | "cancelado";
  paymentStatus: "pendiente" | "aprobado" | "rechazado";
  createdAt: string;
  items: OrderItemView[];
  lastPayment: { installments: number; cardBrand: string | null; interestFree: boolean } | null;
};

export class OrderError extends Error {
  constructor(
    public code: "EMPTY_CART" | "OUT_OF_STOCK" | "VARIANT_UNAVAILABLE" | "INVALID_COUPON" | "NOT_FOUND",
    message: string,
  ) {
    super(message);
  }
}

// Pedidos del modo demo (memoria del servidor)
const g = globalThis as unknown as { __demoOrders?: Map<string, OrderView>; __demoSeq?: number };
const demoOrders = (g.__demoOrders ??= new Map());

/** Crea el pedido con precios tomados de la base y stock validado. No descuenta stock: eso pasa al aprobar el pago. */
export async function createOrder(input: {
  customer: Customer;
  items: CartLineInput[];
  shipping: ShippingChoice;
  couponCode: string | null;
  userId: string | null;
}): Promise<OrderView> {
  if (hasSupabase) {
    const { data, error } = await serviceClient().rpc("place_order", {
      p_customer: {
        email: input.customer.email,
        first_name: input.customer.firstName,
        last_name: input.customer.lastName,
        dni: input.customer.dni,
        phone: input.customer.phone,
      },
      p_items: input.items.map((i) => ({ variant_id: i.variantId, qty: i.qty })),
      p_shipping: {
        method: input.shipping.method,
        provider: input.shipping.provider,
        service: input.shipping.service,
        cost: input.shipping.cost,
        eta_days: input.shipping.etaDays,
        address: input.shipping.address,
        branch: input.shipping.branch,
        postal_code: input.shipping.postalCode,
      },
      p_coupon: input.couponCode,
      p_user_id: input.userId,
    });
    if (error) {
      const m = error.message;
      if (m.includes("OUT_OF_STOCK")) throw new OrderError("OUT_OF_STOCK", "Uno de los pares se quedó sin stock. Revisá tu carrito.");
      if (m.includes("VARIANT_UNAVAILABLE")) throw new OrderError("VARIANT_UNAVAILABLE", "Uno de los pares ya no está disponible.");
      if (m.includes("INVALID_COUPON")) throw new OrderError("INVALID_COUPON", "El cupón no es válido.");
      if (m.includes("EMPTY_CART")) throw new OrderError("EMPTY_CART", "Tu carrito está vacío.");
      throw error;
    }
    const row = (data as { order_number: string; order_access_token: string }[])[0];
    return (await getOrder(row.order_number, row.order_access_token))!;
  }

  // ---- demo ----
  const { lines } = await validateCart(input.items);
  if (lines.length === 0) throw new OrderError("EMPTY_CART", "Tu carrito está vacío.");
  const bad = lines.find((l) => l.issue);
  if (bad) {
    throw new OrderError(
      bad.issue === "no_disponible" ? "VARIANT_UNAVAILABLE" : "OUT_OF_STOCK",
      `${bad.name} talle ${bad.size} ya no tiene el stock que pediste. Revisá tu carrito.`,
    );
  }
  const subtotal = lines.reduce((n, l) => n + l.price * l.qty, 0);
  let discount = 0;
  if (input.couponCode) {
    const c = await findCoupon(input.couponCode, subtotal);
    if ("error" in c) throw new OrderError("INVALID_COUPON", c.error);
    discount = c.discount;
  }
  g.__demoSeq = (g.__demoSeq ?? 1000) + 1;
  const order: OrderView = {
    id: randomUUID(),
    number: `ALB-${String(g.__demoSeq).padStart(6, "0")}`,
    accessToken: randomBytes(24).toString("hex"),
    customer: input.customer,
    shipping: input.shipping,
    trackingCode: null,
    subtotal,
    discount,
    total: subtotal - discount + input.shipping.cost,
    couponCode: input.couponCode?.toUpperCase() ?? null,
    status: "pendiente",
    paymentStatus: "pendiente",
    createdAt: new Date().toISOString(),
    items: lines.map((l) => ({
      name: l.name,
      colorName: l.colorName,
      size: l.size,
      sku: l.sku,
      imageUrl: l.image,
      unitPrice: l.price,
      qty: l.qty,
      slug: l.slug,
      variantId: l.id,
    })),
    lastPayment: null,
  };
  demoOrders.set(order.id, order);
  console.info(`[pedido:demo] ${order.number} creado · total ${order.total}`);
  return order;
}

/** Registra un intento de pago. Si se aprueba: descuenta stock y el pedido pasa a "pagado". */
export async function recordPayment(
  order: OrderView,
  providerId: string,
  result: PaymentResult,
  meta: { amount: number; installments: number; interestFree: boolean; cardBrand: string },
): Promise<OrderView> {
  if (hasSupabase) {
    const { error } = await serviceClient().rpc("confirm_payment", {
      p_order_id: order.id,
      p_provider: providerId,
      p_provider_payment_id: result.providerPaymentId,
      p_status: result.status,
      p_amount: meta.amount,
      p_installments: meta.installments,
      p_interest_free: meta.interestFree,
      p_card_brand: meta.cardBrand,
      p_raw: (result.raw ?? null) as object | null,
    });
    if (error) throw error;
    return (await getOrder(order.number, order.accessToken))!;
  }

  const current = demoOrders.get(order.id)!;
  if (current.paymentStatus === "aprobado") return current;
  if (result.status === "aprobado") {
    const variants = new Map(demoDb().products.flatMap((p) => p.variants.map((v) => [v.id, v] as const)));
    for (const it of current.items as (OrderItemView & { variantId?: string })[]) {
      const v = it.variantId ? variants.get(it.variantId) : undefined;
      if (v) v.stock = Math.max(0, v.stock - it.qty);
    }
  }
  const updated: OrderView = {
    ...current,
    paymentStatus: result.status,
    status: result.status === "aprobado" ? "pagado" : current.status,
    lastPayment: { installments: meta.installments, cardBrand: meta.cardBrand, interestFree: meta.interestFree },
  };
  demoOrders.set(order.id, updated);
  console.info(`[pedido:demo] ${order.number} pago ${result.status}`);
  return updated;
}

type OrderRow = {
  id: string;
  number: string;
  access_token: string;
  email: string;
  first_name: string;
  last_name: string;
  dni: string;
  phone: string;
  shipping_method: ShippingChoice["method"];
  shipping_provider: string | null;
  shipping_service: string | null;
  shipping_cost: number;
  shipping_eta_days: number | null;
  shipping_address: ShippingChoice["address"];
  shipping_branch: ShippingChoice["branch"];
  postal_code: string | null;
  tracking_code: string | null;
  subtotal: number;
  discount: number;
  total: number;
  coupon_code: string | null;
  status: OrderView["status"];
  payment_status: OrderView["paymentStatus"];
  created_at: string;
  order_items: { product_name: string; color_name: string | null; size: string; sku: string; image_url: string | null; unit_price: number; qty: number }[];
  payments: { installments: number; card_brand: string | null; interest_free: boolean; created_at: string }[];
};

export function shippingLabel(provider: string | null, service: string | null): string {
  if (service === "retiro") return "Retiro gratis en el local";
  const name = provider === "andreani" ? "Andreani" : provider === "correo_argentino" ? "Correo Argentino" : "Envío";
  return `${name} a ${service ?? "domicilio"}`;
}

function rowToView(r: OrderRow): OrderView {
  const last = [...(r.payments ?? [])].sort((a, b) => b.created_at.localeCompare(a.created_at))[0];
  return {
    id: r.id,
    number: r.number,
    accessToken: r.access_token,
    customer: { email: r.email, firstName: r.first_name, lastName: r.last_name, dni: r.dni, phone: r.phone },
    shipping: {
      method: r.shipping_method,
      provider: r.shipping_provider ?? "local",
      service: r.shipping_service ?? r.shipping_method,
      label: shippingLabel(r.shipping_provider, r.shipping_service),
      cost: r.shipping_cost,
      etaDays: r.shipping_eta_days,
      postalCode: r.postal_code,
      address: r.shipping_address,
      branch: r.shipping_branch,
    },
    trackingCode: r.tracking_code,
    subtotal: r.subtotal,
    discount: r.discount,
    total: r.total,
    couponCode: r.coupon_code,
    status: r.status,
    paymentStatus: r.payment_status,
    createdAt: r.created_at,
    items: r.order_items.map((i) => ({
      name: i.product_name,
      colorName: i.color_name,
      size: i.size,
      sku: i.sku,
      imageUrl: i.image_url,
      unitPrice: i.unit_price,
      qty: i.qty,
    })),
    lastPayment: last ? { installments: last.installments, cardBrand: last.card_brand, interestFree: last.interest_free } : null,
  };
}

/** Pedido por número + token de acceso (así un invitado puede ver solo el suyo). */
export async function getOrder(number: string, accessToken: string): Promise<OrderView | null> {
  if (!/^ALB-\d{6}$/.test(number) || !/^[0-9a-f]{48}$/.test(accessToken)) return null;
  if (!hasSupabase) {
    const o = [...demoOrders.values()].find((x) => x.number === number);
    return o && o.accessToken === accessToken ? o : null;
  }
  const { data } = await serviceClient()
    .from("orders")
    .select("*, order_items(product_name, color_name, size, sku, image_url, unit_price, qty), payments(installments, card_brand, interest_free, created_at)")
    .eq("number", number)
    .eq("access_token", accessToken)
    .maybeSingle();
  return data ? rowToView(data as OrderRow) : null;
}

/** Pedido por número (sin token): solo para webhooks del proveedor de pago. */
export async function getOrderByNumberUnsafe(number: string): Promise<OrderView | null> {
  if (!hasSupabase) return [...demoOrders.values()].find((x) => x.number === number) ?? null;
  const { data } = await serviceClient()
    .from("orders")
    .select("*, order_items(product_name, color_name, size, sku, image_url, unit_price, qty), payments(installments, card_brand, interest_free, created_at)")
    .eq("number", number)
    .maybeSingle();
  return data ? rowToView(data as OrderRow) : null;
}
