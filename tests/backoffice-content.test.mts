/**
 * Contenido de la tienda con el back office (fase C): banners, barra superior, promos de cuotas y el aviso de cambios (/api/revalidate).
 *   npm test
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { safeLink, toHomeBanners, toPaymentPromos, toTopbar } from "../src/lib/backoffice/map.ts";
import { secretMatches, TABLE_TAGS, TAGS } from "../src/lib/data/tags.ts";

// Como safeMediaUrl: un host no permitido se cambia por la imagen genérica
const media = (u: string | null | undefined) => (u ? (u.startsWith("https://media.albertito.test/") ? u : "/demo/sin-foto.svg") : null);

describe("banners del home", () => {
  it("fotos por el filtro de hosts, alt con el título de respaldo, sin video; uno con una foto de otro host (cambiada por la genérica) no se muestra", () => {
    const out = toHomeBanners(
      [
        { id: "b1", title: "Botas -30 %", alt: "", link: "/hombre/botas", imageDesktop: "https://media.albertito.test/img/a-banner.webp", imageMobile: "https://media.albertito.test/img/a-large.webp" },
        { id: "b2", title: "Otro host", alt: "x", link: null, imageDesktop: "https://otro.host/x.webp", imageMobile: "https://media.albertito.test/img/b-large.webp" },
      ],
      { media },
    );
    assert.deepEqual(out, [{ id: "b1", imageDesktop: "https://media.albertito.test/img/a-banner.webp", imageMobile: "https://media.albertito.test/img/a-large.webp", videoUrl: null, title: "Botas -30 %", alt: "Botas -30 %", link: "/hombre/botas" }]);
  });

  it("links: internos o https; nada de javascript:, data:, http ni //", () => {
    for (const ok of ["/ofertas", "/hombre/zapatillas?talle=40", "https://instagram.com/albertito"]) assert.equal(safeLink(ok), ok);
    for (const bad of ["javascript:alert(1)", "data:text/html,x", "http://otro.sitio", "//evil.test", "hombre", ""]) assert.equal(safeLink(bad), null);
  });
});

describe("barra superior y promos", () => {
  it("mensajes con su link filtrado", () => {
    assert.deepEqual(toTopbar([{ id: "t1", text: "Envío gratis", link: "/envios" }, { id: "t2", text: "Malo", link: "javascript:x" }]), [
      { id: "t1", text: "Envío gratis", link: "/envios" },
      { id: "t2", text: "Malo", link: null },
    ]);
  });
  it("promos: la forma de la tienda tal cual (salen de los planes de cuotas del back office)", () => {
    const p = { id: "p1", provider: "visa", label: "Visa", installments: 6, interestFree: true, minAmount: 50001, logoUrl: null, showInTopbar: true };
    assert.deepEqual(toPaymentPromos([p]), [p]);
  });
});

describe("aviso de cambios (/api/revalidate)", () => {
  it("el secreto se compara en tiempo constante; sin secreto configurado o sin cabecera, nada pasa", () => {
    const s = "secreto-del-aviso-de-prueba-0123456789-abcdef";
    assert.equal(secretMatches(s, s), true);
    assert.equal(secretMatches(s, `${s}x`), false);
    assert.equal(secretMatches(s, s.slice(0, -1)), false);
    assert.equal(secretMatches(s, null), false);
    assert.equal(secretMatches(undefined, s), false);
    assert.equal(secretMatches("", ""), false);
  });
  it("las tablas que avisa el back office invalidan su caché (payment_plans → promos)", () => {
    assert.deepEqual(TABLE_TAGS.payment_plans, [TAGS.promos]);
    assert.deepEqual(TABLE_TAGS.home_banners, [TAGS.home]);
    assert.deepEqual(TABLE_TAGS.topbar_messages, [TAGS.promos]);
    assert.ok(TABLE_TAGS.products.includes(TAGS.products));
    assert.ok(TABLE_TAGS.product_variants.includes(TAGS.products));
    assert.ok(TABLE_TAGS.categories.includes(TAGS.categories));
    assert.ok(TABLE_TAGS.settings.includes(TAGS.settings));
  });
});
