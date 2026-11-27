/**
 * Checkout con el back office (fase B): mapeos, cuotas, tokens del simulado, mensajes de error, cookie del token, analítica, link del mail y
 * la escritura del cliente HTTP (cabeceras, claves de idempotencia, token fuera de la URL).
 *   npm test
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  branchProviderOf,
  brandToApi,
  cookiesToDrop,
  errorAction,
  installmentsFor,
  isOrderNumber,
  mockPaywayToken,
  orderCookieName,
  orderCookieOptions,
  orderCookieValue,
  parseOrderCookie,
  parseResumeHash,
  payOutcome,
  POLL_DELAYS_S,
  purchaseKey,
  purchaseStatus,
  RESUME_CAPTURE_SCRIPT,
  toBranches,
  toOrderBody,
  toQuoteState,
  type BoPaymentOptions,
  type BoPayResult,
} from "../src/lib/backoffice/checkout-map.ts";
import { BackofficeUnavailableError, createBackofficeHttp } from "../src/lib/backoffice/http.ts";

const SIG = `1767225600.${"a".repeat(43)}`;

describe("envío", () => {
  it("la cotización de la API se ve como la de la tienda (pesos, servicio, plazo)", () => {
    const q = toQuoteState({
      postalCode: "5730",
      warnings: ["Andreani no está cotizando en este momento."],
      options: [
        { id: "micorreo:sucursal", method: "BRANCH", provider: "micorreo", providerName: "Correo Argentino", label: "Correo Argentino a sucursal", priceCents: 450050, eta: { min: 3, max: 6 }, requiresBranch: true },
        { id: "respaldo:domicilio", method: "HOME", provider: "respaldo", providerName: "Envío", label: "Envío a domicilio (tarifa estimada)", priceCents: 650000, eta: null, requiresBranch: false },
        { id: "local:retiro", method: "PICKUP", provider: "local", providerName: "Local", label: "Retiro en el local", priceCents: 0, eta: null, requiresBranch: false },
      ],
    });
    assert.equal(q.cp, "5730");
    assert.deepEqual(q.warnings, ["Andreani no está cotizando en este momento."]);
    assert.deepEqual(
      q.options.map((o) => [o.id, o.service, o.provider, o.price, o.etaDays]),
      [
        ["micorreo:sucursal", "sucursal", "correo_argentino", 4501, 6],
        ["respaldo:domicilio", "domicilio", "fallback", 6500, null],
        ["local:retiro", "retiro", "local", 0, null],
      ],
    );
  });

  it("sucursales: qué empresa y si hace falta la provincia (Correo Argentino)", () => {
    assert.deepEqual(branchProviderOf("micorreo:sucursal"), { provider: "micorreo", needsProvince: true });
    assert.deepEqual(branchProviderOf("andreani:sucursal"), { provider: "andreani", needsProvince: false });
    assert.equal(branchProviderOf("andreani:domicilio"), null);
    assert.equal(branchProviderOf("local:retiro"), null);
    assert.deepEqual(toBranches([{ id: "b1", name: "Centro", address: "Pringles 1", city: "Villa Mercedes", province: "San Luis", postalCode: "5730", hours: null }]), [{ id: "b1", name: "Centro", address: "Pringles 1, Villa Mercedes" }]);
  });
});

describe("cuerpo del pedido", () => {
  const customer = { email: " Ana@Mail.Test ", firstName: " Ana ", lastName: "Pérez", dni: "30.123.456", phone: "2657 000000" };
  const items = [{ variantId: "v1", qty: 2 }];
  it("domicilio: dirección con piso como apartment, precio en centavos solo para comparar", () => {
    const b = toOrderBody({ customer, items, shipping: { optionId: "andreani:domicilio", cp: "5730", price: 6500, address: { street: "Mitre", number: "123", floor: "2B", city: "Villa Mercedes", province: "San Luis" } } });
    assert.deepEqual(b.customer, { email: "ana@mail.test", firstName: "Ana", lastName: "Pérez", phone: "2657 000000", dni: "30123456" });
    assert.deepEqual(b.items, [{ variantId: "v1", quantity: 2 }]);
    assert.deepEqual(b.delivery, { method: "HOME", optionId: "andreani:domicilio", quotedCents: 650000, postalCode: "5730", address: { street: "Mitre", number: "123", apartment: "2B", city: "Villa Mercedes", province: "San Luis" } });
  });
  it("sucursal de Correo: branchId y provincia; retiro: sin dirección", () => {
    assert.deepEqual(toOrderBody({ customer, items, shipping: { optionId: "micorreo:sucursal", cp: "5730", price: 4500, branchId: "b1", province: "San Luis" } }).delivery, { method: "BRANCH", optionId: "micorreo:sucursal", quotedCents: 450000, postalCode: "5730", branchId: "b1", province: "San Luis" });
    assert.deepEqual(toOrderBody({ customer, items, shipping: { optionId: "local:retiro", cp: "5730", price: 0 } }).delivery, { method: "PICKUP", optionId: "local:retiro", quotedCents: 0, postalCode: "5730" });
  });
});

describe("pago", () => {
  const opts: BoPaymentOptions = {
    providers: [{ id: "PAYWAY", mode: "DIRECT", publicKey: "pub" }, { id: "MERCADOPAGO", mode: "REDIRECT", publicKey: null }],
    oneInstallmentAlways: true,
    plans: [
      { provider: "PAYWAY", cardBrand: "visa", installments: 3, interestFree: true, minAmountCents: 0, endsAt: null },
      { provider: "PAYWAY", cardBrand: null, installments: 6, interestFree: true, minAmountCents: 0, endsAt: null },
      { provider: "MERCADOPAGO", cardBrand: null, installments: 12, interestFree: true, minAmountCents: 0, endsAt: null },
    ],
    brands: { credit: ["visa", "mastercard", "amex", "naranja", "cabal"], debit: ["visa_debito", "mastercard_debito", "maestro", "cabal_debito"] },
    maxAttempts: 5,
  };
  it("cuotas: «1 pago» siempre; por marca o cualquier marca; débito solo 1; Mercado Pago los suyos", () => {
    assert.deepEqual(installmentsFor(opts, "PAYWAY", "visa"), [1, 3, 6]);
    assert.deepEqual(installmentsFor(opts, "PAYWAY", "master"), [1, 6]);
    assert.deepEqual(installmentsFor(opts, "PAYWAY", "visa_debito"), [1]);
    assert.deepEqual(installmentsFor(opts, "PAYWAY", null), [1]);
    assert.deepEqual(installmentsFor(opts, "MERCADOPAGO", null), [1, 12]);
  });
  it("marcas de la web → las de la API", () => {
    assert.equal(brandToApi("master"), "mastercard");
    assert.equal(brandToApi("master_debito"), "mastercard_debito");
    assert.equal(brandToApi("visa"), "visa");
  });
  it("tarjetas de prueba con Payway simulado: 0002 rechazada, 0003 pendiente, otra aprobada", () => {
    assert.equal(mockPaywayToken("4111 1111 1111 0002", "x"), "tok_rechazado_x");
    assert.equal(mockPaywayToken("4111111111110003", "x"), "tok_pendiente_x");
    assert.equal(mockPaywayToken("4507990000004905", "x"), "tok_aprobado_x");
  });
  it("resultado del pago para el navegador", () => {
    const base: BoPayResult = { attemptId: "a", provider: "PAYWAY", mode: "DIRECT", status: "APPROVED", installments: 1, cardBrand: "visa", redirectUrl: null, errorCode: null, attemptsLeft: 4, order: { number: "ALB-001300", status: "PAID", storeStatus: "pagado", expiresAt: "" } };
    assert.equal(payOutcome(base), "aprobado");
    assert.equal(payOutcome({ ...base, status: "REJECTED", order: { ...base.order, storeStatus: "pendiente" } }), "rechazado");
    assert.equal(payOutcome({ ...base, status: "PENDING", order: { ...base.order, storeStatus: "pendiente" } }), "pendiente");
    assert.equal(payOutcome({ ...base, order: { ...base.order, storeStatus: "en_revision" } }), "revision");
    assert.equal(payOutcome({ ...base, provider: "MERCADOPAGO", mode: "REDIRECT", status: "STARTED", redirectUrl: "https://mp.test/x", order: { ...base.order, storeStatus: "pendiente" } }), "redirect");
    assert.equal(payOutcome({ ...base, status: "ERROR", order: { ...base.order, storeStatus: "pendiente" } }), "error");
  });
});

describe("errores de la API → mensajes en voseo", () => {
  it("cada código tiene su mensaje y su acción", () => {
    const cases: [Record<string, unknown>, string, string | undefined, number | undefined][] = [
      [{ code: "OUT_OF_STOCK" }, "Se agotó alguno de los productos mientras comprabas. Revisá tu carrito.", "sync_cart", undefined],
      [{ code: "VARIANT_UNAVAILABLE" }, "Alguno de los productos ya no está disponible. Revisá tu carrito.", "sync_cart", undefined],
      [{ code: "SHIPPING_CHANGED", currentCents: 720000 }, "El envío cambió: ahora sale $7.200. Revisalo y confirmá de nuevo.", "requote", 2],
      [{ code: "SHIPPING_CHANGED", currentCents: null }, "Esa forma de envío ya no está disponible. Elegí otra.", "requote", 2],
      [{ code: "BRANCH_UNAVAILABLE" }, "Esa sucursal ya no está disponible. Elegí otra.", "requote", 2],
      [{ code: "DELIVERY_UNAVAILABLE" }, "Esa forma de entrega no está disponible. Elegí otra.", "requote", 2],
      [{ code: "EMAIL_RESERVED" }, "No podemos usar ese mail. Probá con otro.", undefined, 1],
      [{ code: "INSTALLMENTS_NOT_ALLOWED", allowed: [1] }, "Esas cuotas ya no están disponibles para este pago. Elegí otra opción.", "reload_installments", 3],
      [{ code: "PAYMENT_IN_PROGRESS" }, "Ya hay un pago de este pedido en proceso. Esperá unos minutos antes de intentar de nuevo.", undefined, 3],
      [{ code: "PAYMENT_ATTEMPTS_EXCEEDED" }, "Llegaste al máximo de intentos de pago para este pedido. Armá el pedido de nuevo.", "new_order", undefined],
      [{ code: "ALREADY_PAID" }, "Este pedido ya está pago.", "go_confirmation", undefined],
      [{ code: "ORDER_IN_REVIEW" }, "Recibimos tu pago y estamos revisando el pedido. Te escribimos dentro de las 24 h hábiles.", "go_confirmation", undefined],
      [{ code: "ORDER_EXPIRED" }, "Tu reserva venció. Armá el pedido de nuevo: tu carrito sigue acá.", "new_order", undefined],
      [{ code: "ORDER_CANCELLED" }, "Este pedido se canceló. Armá el pedido de nuevo: tu carrito sigue acá.", "new_order", undefined],
      [{ code: "PROVIDER_UNAVAILABLE" }, "Este medio de pago no está disponible ahora. Probá con otro.", "reload_installments", 3],
      [{ code: "PAYMENT_PROVIDER_ERROR" }, "No pudimos iniciar el pago. Probá de nuevo en unos minutos.", undefined, 3],
      [{ code: "IDEMPOTENCY_MISMATCH" }, "Cambiaste el pedido: lo armamos de nuevo.", "retry_new_key", undefined],
      [{ code: "RESUME_EXPIRED" }, "El link venció. Armá el pedido de nuevo en la tienda.", "new_order", undefined],
      [{ code: "RESUME_LIMIT_REACHED" }, "Este link ya se usó demasiadas veces. Escribinos y te ayudamos.", undefined, undefined],
    ];
    for (const [body, message, action, step] of cases) {
      const a = errorAction(body);
      assert.equal(a.message, message, String(body.code));
      assert.equal(a.action, action, String(body.code));
      assert.equal(a.step, step, String(body.code));
    }
    assert.equal(errorAction({}, 401).message, "Estamos actualizando la tienda. Probá de nuevo en unos minutos.");
    assert.equal(errorAction(null, 500).message, "No pudimos completar la operación. Probá de nuevo en unos minutos.");
  });
});

describe("cookie del token del pedido", () => {
  it("httpOnly, Secure en producción, SameSite=Lax (para volver de Mercado Pago), 30 días, una por pedido", () => {
    assert.equal(orderCookieName("ALB-001300"), "alb_pedido_ALB-001300");
    assert.deepEqual(orderCookieOptions(true), { httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: 30 * 24 * 3600 });
    assert.equal(orderCookieOptions(false).secure, false);
    const v = orderCookieValue("tok-abcdefghijklmnopqrstuvwxyz", 1_767_225_600_000);
    assert.deepEqual(parseOrderCookie(v), { issuedAt: 1_767_225_600, token: "tok-abcdefghijklmnopqrstuvwxyz" });
    assert.equal(parseOrderCookie("cualquier cosa"), null);
    assert.equal(parseOrderCookie(undefined), null);
  });
  it("con más de 5 pedidos se borran los más viejos (y nada que no sea una cookie de pedido)", () => {
    const entries = [1, 2, 3, 4, 5, 6, 7].map((n) => ({ name: orderCookieName(`ALB-00000${n}`), value: orderCookieValue(`token-de-prueba-numero-${n}`, 1_767_000_000_000 + n * 60_000) }));
    assert.deepEqual(cookiesToDrop([...entries, { name: "otra", value: "x" }]).sort(), [orderCookieName("ALB-000001"), orderCookieName("ALB-000002")]);
  });
});

describe("confirmación, analítica y link del mail", () => {
  it("consulta periódica mientras esté pendiente: 2, 4, 8, 15 y 30 s", () => assert.deepEqual(POLL_DELAYS_S, [2, 4, 8, 15, 30]));
  it("purchase solo con el pedido pagado (no en revisión, pendiente ni cancelado)", () => {
    assert.deepEqual((["pendiente", "pagado", "en_revision", "enviado", "entregado", "cancelado"] as const).filter(purchaseStatus), ["pagado", "enviado", "entregado"]);
    assert.equal(purchaseKey("ALB-001300"), "albertito:purchase:ALB-001300");
  });
  it("#r= del mail: solo la forma esperada", () => {
    assert.equal(parseResumeHash(`#r=${SIG}`), SIG);
    assert.equal(parseResumeHash(`#r=${SIG}x`), null);
    assert.equal(parseResumeHash("#r=<script>"), null);
    assert.equal(parseResumeHash(""), null);
    assert.ok(isOrderNumber("ALB-001300") && !isOrderNumber("ALB-1300"));
  });
  it("el script del <head> guarda la firma y la saca de la barra antes de la analítica", () => {
    const store = new Map<string, string>();
    let replaced: string | null = null;
    const location = { hash: `#r=${SIG}`, pathname: "/checkout/confirmacion/ALB-001300", search: "" };
    const sessionStorage = { setItem: (k: string, v: string) => store.set(k, v) };
    const history = { replaceState: (_s: unknown, _t: string, url: string) => (replaced = url) };
    new Function("location", "sessionStorage", "history", RESUME_CAPTURE_SCRIPT)(location, sessionStorage, history);
    assert.equal(store.get("albertito:reintento:/checkout/confirmacion/ALB-001300"), SIG);
    assert.equal(replaced, "/checkout/confirmacion/ALB-001300");
    // Sin #r= no toca nada
    replaced = null;
    new Function("location", "sessionStorage", "history", RESUME_CAPTURE_SCRIPT)({ ...location, hash: "#arriba" }, sessionStorage, history);
    assert.equal(replaced, null);
  });
});

describe("cliente HTTP: escrituras del checkout", () => {
  it("manda la clave de la tienda, Idempotency-Key y el token del pedido en cabeceras (nunca en la URL); devuelve el 4xx con su código", async () => {
    const calls: { url: string; init: RequestInit }[] = [];
    const fetchFn = (async (url: string, init: RequestInit) => {
      calls.push({ url, init });
      return new Response(JSON.stringify({ statusCode: 409, code: "INSTALLMENTS_NOT_ALLOWED", allowed: [1] }), { status: 409 });
    }) as unknown as typeof fetch;
    const http = createBackofficeHttp({ baseUrl: "http://api.test/api/v1/", apiKey: "clave-de-la-tienda", timeoutMs: 1000, retries: 2, fetch: fetchFn, log: () => {} });
    const token = "token-secreto-del-pedido";
    const r = await http.send("POST", "/store/orders/ALB-001300/pay", { provider: "PAYWAY" }, { "X-Order-Token": token, "Idempotency-Key": "k-1" });
    assert.deepEqual(r, { status: 409, body: { statusCode: 409, code: "INSTALLMENTS_NOT_ALLOWED", allowed: [1] } });
    assert.equal(calls.length, 1); // las escrituras no se reintentan
    assert.equal(calls[0].url, "http://api.test/api/v1/store/orders/ALB-001300/pay");
    assert.ok(!calls[0].url.includes(token));
    const h = calls[0].init.headers as Record<string, string>;
    assert.equal(h["X-Store-Key"], "clave-de-la-tienda");
    assert.equal(h["X-Order-Token"], token);
    assert.equal(h["Idempotency-Key"], "k-1");
  });
  it("sin respuesta: BackofficeUnavailableError sin la query en el mensaje", async () => {
    const fetchFn = (async () => {
      throw new TypeError("fetch failed");
    }) as unknown as typeof fetch;
    const http = createBackofficeHttp({ baseUrl: "http://api.test", apiKey: "k", timeoutMs: 1000, retries: 0, fetch: fetchFn, log: () => {} });
    await assert.rejects(http.send("GET", "/store/shipping/branches?provider=micorreo&postalCode=5730"), (e: Error) => e instanceof BackofficeUnavailableError && !e.message.includes("postalCode"));
  });
});
