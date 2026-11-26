/**
 * Adaptador del back office (DATA_SOURCE=backoffice): mapeo a los tipos de la tienda, cambio de fuente,
 * cliente HTTP (timeout, reintentos solo en lecturas, respaldo en memoria) y checkout bloqueado en la fase A.
 *   npm test
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { BoCard, BoDetail, BoLiveVariant, BoNavSection, BoSettings } from "../src/lib/backoffice/dto.ts";
import { CHECKOUT_CLOSED_MESSAGE, checkoutClosedResponse, checkoutEnabled } from "../src/lib/backoffice/guard.ts";
import { BackofficeNotFoundError, BackofficeUnavailableError, createBackofficeHttp } from "../src/lib/backoffice/http.ts";
import { categoryNames, NO_HEX, pesos, toCard, toDetail, toLiveVariant, toNavigation, toSettings } from "../src/lib/backoffice/map.ts";
import { dataSource, isBackoffice } from "../src/lib/backoffice/source.ts";
import { normalize, termScore, tokens } from "../src/lib/search/normalize.ts";

const media = (u: string | null | undefined) => (u ? (u.startsWith("https://media.albertito.test/") ? u : "/demo/sin-foto.svg") : null);
const deps = { normalize, media };

const NAV: BoNavSection[] = [
  {
    id: "h", name: "Hombre", slug: "hombre", kind: "section", href: "/hombre", sizeRange: ["39", "40"],
    promo: { title: "Botas -30 %", link: "", image: "https://media.albertito.test/img/p.webp" },
    banner: { desktop: "https://media.albertito.test/img/d-banner.webp", mobile: null },
    children: [{ id: "z", name: "Zapatillas", slug: "zapatillas", href: "/hombre/zapatillas", banner: null }],
  },
  { id: "o", name: "Ofertas", slug: "ofertas", kind: "offers", href: "/ofertas", sizeRange: [], promo: null, banner: null, children: [] },
];

const CARD: BoCard = {
  id: "p1", name: "Runner Pro", slug: "runner-pro", line: null, basePriceCents: 9_999_999, priceCents: 6_699_900, discountPct: 33, onSale: true,
  isNew: true, isFeatured: false, soldCount: 4, createdAt: "2026-11-01T10:00:00.000Z",
  images: ["https://media.albertito.test/img/a-medium.webp", "https://otro.host/x.webp"],
  colors: [{ name: "Negro", slug: "negro", hex: "#000000" }, { name: "Lila", slug: "lila", hex: null }],
  sizesInStock: ["42", "39", "40,5"], categoryIds: ["z"], brand: { name: "Retro", slug: "retro" },
};

describe("cambio de fuente (DATA_SOURCE)", () => {
  it("sin variable o «demo»: modo demo de siempre; «backoffice»: back office; otro valor corta con un mensaje claro", () => {
    assert.equal(dataSource({}), "demo");
    assert.equal(dataSource({ DATA_SOURCE: "demo" }), "demo");
    assert.equal(dataSource({ DATA_SOURCE: " BackOffice " }), "backoffice");
    assert.equal(isBackoffice({ DATA_SOURCE: "backoffice" }), true);
    assert.equal(isBackoffice({}), false);
    assert.throws(() => dataSource({ DATA_SOURCE: "supabase" }), /DATA_SOURCE inválido: «supabase»/);
  });
});

describe("mapeo a los tipos de la tienda", () => {
  it("navegación: igual forma; link de promo vacío → la sección; imágenes por la política de hosts", () => {
    const nav = toNavigation(NAV, deps);
    assert.deepEqual(nav[0], {
      id: "h", name: "Hombre", slug: "hombre", kind: "section", href: "/hombre", sizeRange: ["39", "40"],
      promo: { title: "Botas -30 %", link: "/hombre", image: "https://media.albertito.test/img/p.webp" },
      banner: { desktop: "https://media.albertito.test/img/d-banner.webp", mobile: null },
      children: [{ id: "z", name: "Zapatillas", slug: "zapatillas", href: "/hombre/zapatillas", banner: null }],
    });
    assert.equal(nav[1].kind, "offers");
  });

  it("tarjeta: centavos → pesos, línea nula → diario, hex nulo → gris, talles ordenados, host no permitido → placeholder, texto de búsqueda", () => {
    const card = toCard(CARD, categoryNames(toNavigation(NAV, deps)), deps);
    assert.equal(card.basePrice, 99_999.99);
    assert.equal(card.price, 66_999);
    assert.equal(card.discountPct, 33);
    assert.equal(card.onSale, true);
    assert.equal(card.line, "diario");
    assert.deepEqual(card.colors, [{ name: "Negro", slug: "negro", hex: "#000000" }, { name: "Lila", slug: "lila", hex: NO_HEX }]);
    assert.deepEqual(card.sizesInStock, ["39", "40,5", "42"]);
    assert.deepEqual(card.images, ["https://media.albertito.test/img/a-medium.webp", "/demo/sin-foto.svg"]);
    assert.equal(card.searchText, "runner pro zapatillas");
    assert.equal("brand" in card, false); // lo que su tipo no tiene no se agrega
  });

  it("ficha: descripción, ficha técnica, medios con color y variantes sin precio (su tipo no lo tiene)", () => {
    const d: BoDetail = {
      ...CARD, skuBase: "RUN", description: "", specs: { Suela: "Goma" }, weightG: 850,
      media: [{ url: "https://media.albertito.test/img/a-large.webp", alt: "Lateral", type: "image", colorSlug: "negro" }],
      variants: [{ id: "v1", colorSlug: "negro", size: "40", sizeSort: 40, sku: "RUN-40", stock: 3, listPriceCents: 9_999_999, priceCents: 6_699_900 }],
    };
    const detail = toDetail(d, new Map(), deps);
    assert.equal(detail.skuBase, "RUN");
    assert.deepEqual(detail.specs, { Suela: "Goma" });
    assert.equal(detail.weightG, 850);
    assert.deepEqual(detail.media, [{ url: "https://media.albertito.test/img/a-large.webp", alt: "Lateral", type: "image", colorSlug: "negro" }]);
    assert.deepEqual(detail.variants, [{ id: "v1", colorSlug: "negro", size: "40", sizeSort: 40, sku: "RUN-40", stock: 3 }]);
  });

  it("variante en vivo (carrito): precio vigente en pesos, caja con sus nombres, disponible", () => {
    const v: BoLiveVariant = {
      id: "v1", productId: "p1", productSlug: "runner-pro", productName: "Runner Pro", sku: "RUN-40", size: "40",
      color: { name: "Negro", slug: "negro", hex: "#000000" }, listPriceCents: 10_000_000, priceCents: 9_000_000, discountPct: 10, onSale: true,
      stock: 10, weightG: 900, box: { lengthCm: 33, widthCm: 21, heightCm: 12 }, image: "https://media.albertito.test/img/a-thumb.webp",
    };
    assert.deepEqual(toLiveVariant(v, deps), {
      id: "v1", productId: "p1", slug: "runner-pro", name: "Runner Pro", colorName: "Negro", colorSlug: "negro", size: "40", sku: "RUN-40",
      stock: 10, price: 90_000, image: "https://media.albertito.test/img/a-thumb.webp", weightG: 900, box: { l: 33, w: 21, h: 12 }, available: true,
    });
  });

  it("configuración: misma forma", () => {
    const s: BoSettings = {
      whatsapp: { number: "5492657000000", display: "2657 00-0000" },
      store: { address: "Edison 15", city: "Villa Mercedes", province: "San Luis", hours: "", hoursDetail: "", instagram: "", email: "" },
      newsletterPopup: { title: "", text: "", delaySeconds: 8, enabled: false },
      tax: { factor: 1.21, label: "Precio sin impuestos nacionales" },
    };
    assert.deepEqual(toSettings(s), s);
  });

  it("pesos: 1999950 centavos → 19999.5", () => {
    assert.equal(pesos(1_999_950), 19_999.5);
  });

  it("el texto de búsqueda sirve para la búsqueda en memoria de siempre (con errores de tipeo)", () => {
    const card = toCard(CARD, categoryNames(toNavigation(NAV, deps)), deps);
    const words = card.searchText.split(" ");
    assert.ok(tokens("zapatilas runer").every((t) => termScore(t, words) > 0));
  });
});

// ---------- Cliente HTTP ----------

type Call = { url: string; method: string; key: string | null };
function fakeFetch(responses: ((url: string, init: RequestInit) => Response | Promise<Response>)[]) {
  const calls: Call[] = [];
  let i = 0;
  const fn = (async (url: string, init: RequestInit) => {
    calls.push({ url, method: String(init.method), key: new Headers(init.headers).get("X-Store-Key") });
    const r = responses[Math.min(i++, responses.length - 1)];
    return r(url, init);
  }) as unknown as typeof fetch;
  return { fn, calls };
}
const ok = (body: unknown) => () => new Response(JSON.stringify(body), { status: 200, headers: { "Content-Type": "application/json" } });
const status = (s: number) => () => new Response("{}", { status: s });
const down = () => () => Promise.reject(new TypeError("fetch failed"));
const http = (fetch: typeof globalThis.fetch, over: Partial<Parameters<typeof createBackofficeHttp>[0]> = {}) =>
  createBackofficeHttp({ baseUrl: "http://api/api/v1/", apiKey: "clave", timeoutMs: 200, retries: 2, fetch, sleep: async () => undefined, log: () => undefined, ...over });

describe("cliente del back office", () => {
  it("manda la clave en X-Store-Key y arma la URL", async () => {
    const f = fakeFetch([ok({ a: 1 })]);
    assert.deepEqual(await http(f.fn).get("/store/settings"), { a: 1 });
    assert.deepEqual(f.calls, [{ url: "http://api/api/v1/store/settings", method: "GET", key: "clave" }]);
  });

  it("lecturas: reintenta ante corte o 5xx (hasta 2 veces) y no ante 401/404", async () => {
    const a = fakeFetch([down(), status(502), ok({ v: 1 })]);
    assert.deepEqual(await http(a.fn).get("/store/navigation"), { v: 1 });
    assert.equal(a.calls.length, 3);
    const b = fakeFetch([status(401)]);
    await assert.rejects(http(b.fn).get("/store/navigation"), BackofficeUnavailableError);
    assert.equal(b.calls.length, 1);
    const c = fakeFetch([status(404)]);
    await assert.rejects(http(c.fn).get("/store/products/x"), BackofficeNotFoundError);
    assert.equal(c.calls.length, 1);
  });

  it("POST (variantes en vivo): un solo intento y sin respaldo", async () => {
    const f = fakeFetch([ok({ items: [], missing: [] }), down()]);
    const h = http(f.fn);
    await h.post("/store/variants/lookup", { ids: ["x"] });
    await assert.rejects(h.post("/store/variants/lookup", { ids: ["x"] }), BackofficeUnavailableError);
    assert.equal(f.calls.length, 2);
  });

  it("respaldo en memoria: si la API se cae, devuelve la última copia buena de esa lectura", async () => {
    const f = fakeFetch([ok({ items: [1] }), down()]);
    const logs: string[] = [];
    const h = http(f.fn, { log: (m) => logs.push(m) });
    assert.deepEqual(await h.get("/store/catalog"), { items: [1] });
    assert.deepEqual(await h.get("/store/catalog"), { items: [1] });
    assert.match(logs[0], /última copia buena/);
    // otra lectura sin copia: error (la tienda muestra la página amable)
    await assert.rejects(h.get("/store/settings"), BackofficeUnavailableError);
  });

  it("tiempo máximo de espera: una API que no responde corta y cuenta como caída", async () => {
    const hang = (_u: string, init: RequestInit) =>
      new Promise<Response>((_r, reject) => init.signal!.addEventListener("abort", () => reject(Object.assign(new Error("abort"), { name: "TimeoutError" }))));
    const f = fakeFetch([hang]);
    const started = Date.now();
    await assert.rejects(http(f.fn, { timeoutMs: 50, retries: 0 }).get("/store/catalog"), /sin respuesta en 50 ms/);
    assert.ok(Date.now() - started < 1000);
  });
});

describe("checkout bloqueado en la fase A", () => {
  it("503 con el mensaje, sin caché", async () => {
    const res = checkoutClosedResponse();
    assert.equal(res.status, 503);
    assert.equal(res.headers.get("Cache-Control"), "no-store");
    assert.deepEqual(await res.json(), { ok: false, code: "CHECKOUT_CLOSED", message: CHECKOUT_CLOSED_MESSAGE });
    assert.equal(checkoutEnabled(true), false);
    assert.equal(checkoutEnabled(false), true);
  });
});
