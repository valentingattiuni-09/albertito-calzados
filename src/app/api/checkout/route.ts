import { NextResponse, type NextRequest } from "next/server";
import { isBackoffice } from "@/lib/backoffice/source";
import { createAndPay } from "@/lib/backoffice/checkout-routes";
import { signReceipt } from "@/lib/orders/demo-receipt";
import { hasSupabase } from "@/lib/supabase/clients";
import { getLiveVariants } from "@/lib/orders/live";
import { createOrder, findCoupon, OrderError, validateCart, type ShippingChoice } from "@/lib/orders/orders";
import { allowedInstallments, CARD_BRANDS, payOrder, type PaymentInput } from "@/lib/orders/pay";
import { getBranches, PICKUP_OPTION, quoteShipping } from "@/lib/shipping/service";
import { normalizeCp } from "@/lib/shipping/types";

type Body = {
  customer?: { email?: string; firstName?: string; lastName?: string; dni?: string; phone?: string };
  items?: { variantId: string; qty: number }[];
  shipping?: {
    optionId?: string;
    cp?: string;
    branchId?: string;
    address?: { street?: string; number?: string; floor?: string; city?: string; province?: string };
  };
  coupon?: string;
  payment?: PaymentInput;
};

const txt = (v: unknown, max = 120) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const bad = (message: string, field?: string) => NextResponse.json({ ok: false, message, field }, { status: 400 });

/**
 * Crea el pedido y cobra. Todo se recalcula en el servidor: precios, stock, envío, cupón y cuotas.
 * Respuesta: { ok, number, accessToken, paymentStatus, message }
 */
export async function POST(req: NextRequest) {
  // Con el back office: el pedido y el pago los hace la API de la tienda (precios, envío, cuotas y cobro se calculan allá)
  if (isBackoffice()) return createAndPay(await req.json().catch(() => null));
  const body = (await req.json().catch(() => null)) as Body | null;
  if (!body) return bad("Pedido inválido.");

  // 1. Datos
  const c = body.customer ?? {};
  const customer = {
    email: txt(c.email).toLowerCase(),
    firstName: txt(c.firstName, 60),
    lastName: txt(c.lastName, 60),
    dni: txt(c.dni, 12).replace(/\D/g, ""),
    phone: txt(c.phone, 30).replace(/[^\d+]/g, ""),
  };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(customer.email)) return bad("Revisá tu mail.", "email");
  if (!customer.firstName || !customer.lastName) return bad("Completá nombre y apellido.", "firstName");
  if (!/^\d{7,8}$/.test(customer.dni)) return bad("Revisá el DNI: 7 u 8 números.", "dni");
  if (customer.phone.replace(/\D/g, "").length < 8) return bad("Revisá el teléfono.", "phone");

  // 2. Carrito (precio y stock en vivo)
  const items = Array.isArray(body.items) ? body.items : [];
  const cart = await validateCart(items);
  if (cart.lines.length === 0) return bad("Tu carrito está vacío.");
  const problem = cart.lines.find((l) => l.issue) ?? (cart.missing.length ? { name: "Un producto", size: "", issue: "no_disponible" } : null);
  if (problem) {
    return NextResponse.json(
      { ok: false, code: "CART_CHANGED", message: `${problem.name}${problem.size ? ` talle ${problem.size}` : ""} cambió de stock. Revisá tu carrito.` },
      { status: 409 },
    );
  }

  // 3. Envío (se vuelve a cotizar acá; no se confía en el precio del navegador)
  const s = body.shipping ?? {};
  let shipping: ShippingChoice;
  if (s.optionId === PICKUP_OPTION.id) {
    shipping = { method: "retiro", provider: "local", service: "retiro", label: PICKUP_OPTION.label, cost: 0, etaDays: null, postalCode: null, address: null, branch: null };
  } else {
    const cp = normalizeCp(txt(s.cp, 10));
    if (!cp) return bad("Revisá el código postal.", "cp");
    const live = await getLiveVariants(cart.lines.map((l) => l.id));
    const pkgs = cart.lines.map((l) => ({ weightG: live.get(l.id)?.weightG ?? null, box: live.get(l.id)?.box ?? null, qty: l.qty }));
    const quote = await quoteShipping(cp, pkgs);
    const option = quote.options.find((o) => o.id === s.optionId);
    if (!option || option.service === "retiro") return bad("Elegí cómo te llega el pedido.", "shipping");

    let address: ShippingChoice["address"] = null;
    let branch: ShippingChoice["branch"] = null;
    if (option.service === "domicilio") {
      const a = s.address ?? {};
      address = {
        street: txt(a.street, 80),
        number: txt(a.number, 10),
        floor: txt(a.floor, 20) || undefined,
        city: txt(a.city, 60),
        province: txt(a.province, 40),
        cp,
      };
      if (!address.street || !address.number || !address.city || !address.province) return bad("Completá la dirección de entrega.", "address");
    } else {
      const branches = option.provider === "fallback" ? [] : await getBranches(option.provider, cp, pkgs);
      if (branches.length > 0) {
        const b = branches.find((x) => x.id === s.branchId);
        if (!b) return bad("Elegí la sucursal.", "branch");
        branch = b;
      }
    }
    shipping = {
      method: option.service as "domicilio" | "sucursal",
      provider: option.provider,
      service: option.service,
      label: option.label,
      cost: option.price,
      etaDays: option.etaDays,
      postalCode: cp,
      address,
      branch,
    };
  }

  // 4. Cupón
  let couponCode: string | null = null;
  if (body.coupon) {
    const res = await findCoupon(body.coupon, cart.subtotal);
    if ("error" in res) return bad(res.error, "coupon");
    couponCode = res.coupon.code;
  }

  // 5. Validar el pago antes de crear el pedido (tarjeta y cuotas permitidas para este total)
  const pay = body.payment;
  if (!pay) return bad("Elegí cómo pagar.", "payment");
  const cash = pay.method === "efectivo";
  if (!cash && (typeof pay.token !== "string" || !pay.token)) return bad("Completá los datos de la tarjeta.", "payment");
  if (!cash && !(CARD_BRANDS as readonly string[]).includes(pay.brand)) return bad("Elegí la tarjeta.", "payment");
  let discount = 0;
  if (couponCode) {
    const res = await findCoupon(couponCode, cart.subtotal);
    if (!("error" in res)) discount = res.discount;
  }
  const expectedTotal = cart.subtotal - discount + shipping.cost;
  const plans = cash ? [{ installments: 1 }] : await allowedInstallments(pay.brand, expectedTotal);
  if (!cash && !plans.some((p) => p.installments === pay.installments)) return bad("Esa cantidad de cuotas no está disponible para esta tarjeta.", "installments");

  // 6. Pedido + pago
  try {
    const order = await createOrder({
      customer,
      items: cart.lines.map((l) => ({ variantId: l.id, qty: l.qty })),
      shipping,
      couponCode,
      userId: null, // TODO(Fase 5): asociar al cliente logueado
    });
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? req.nextUrl.origin;
    const { order: paid, message } = await payOrder(order, pay, siteUrl);
    return NextResponse.json({
      ok: paid.paymentStatus !== "rechazado",
      number: paid.number,
      accessToken: paid.accessToken,
      total: paid.total,
      paymentStatus: paid.paymentStatus,
      message,
      // Modo demo: comprobante firmado para la página de confirmación (ver demo-receipt.ts)
      receipt: !hasSupabase && paid.paymentStatus !== "rechazado" ? signReceipt(paid) : undefined,
    });
  } catch (e) {
    if (e instanceof OrderError) return NextResponse.json({ ok: false, code: e.code, message: e.message }, { status: 409 });
    console.error("[checkout]", e);
    return NextResponse.json({ ok: false, message: "No pudimos crear tu pedido. Probá de nuevo." }, { status: 500 });
  }
}
