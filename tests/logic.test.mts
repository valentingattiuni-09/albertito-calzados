/**
 * Tests de la lógica pura de la tienda (sin servidor ni base).
 *   npm test
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseCsv } from "../src/lib/admin/csv.ts";
import { applyFilters, buildFacets, parseFilters, sortProducts, toQuery } from "../src/lib/catalog/filters.ts";
import type { PaymentPromo, ProductCard } from "../src/lib/data/types.ts";
import { formatPrice } from "../src/lib/format.ts";
import { bestInstallment, installmentOptions, priceWithoutTaxes } from "../src/lib/pricing.ts";
import { editDistance, normalize, termScore, tokens } from "../src/lib/search/normalize.ts";
import { normalizeCp } from "../src/lib/shipping/types.ts";

const promo = (p: Partial<PaymentPromo>): PaymentPromo => ({
  id: p.label ?? "x",
  provider: "visa",
  label: "Visa",
  installments: 3,
  interestFree: true,
  minAmount: 0,
  logoUrl: null,
  showInTopbar: true,
  ...p,
});

const card = (p: Partial<ProductCard>): ProductCard => ({
  id: p.slug ?? "id",
  name: "Zapatilla",
  slug: "zapatilla",
  line: "diario",
  basePrice: 10000,
  price: 10000,
  discountPct: 0,
  onSale: false,
  isNew: false,
  isFeatured: false,
  soldCount: 0,
  createdAt: "2026-11-01T00:00:00.000Z",
  images: [],
  colors: [],
  sizesInStock: [],
  categoryIds: [],
  searchText: "zapatilla",
  ...p,
});

describe("formato de precios", () => {
  it("usa punto de miles y sin decimales", () => {
    // Espacio que no se corta (el "$" nunca queda separado del número)
    assert.equal(formatPrice(59000), "$\u00a059.000");
    assert.equal(formatPrice(1234567), "$\u00a01.234.567");
    assert.equal(formatPrice(999), "$\u00a0999");
    assert.equal(formatPrice(12345.6), "$\u00a012.346");
  });
});

describe("cuotas", () => {
  const promos = [
    promo({ label: "Visa", installments: 3 }),
    promo({ provider: "naranja", label: "Naranja", installments: 5, minAmount: 20000 }),
    promo({ provider: "master", label: "Master", installments: 6, interestFree: false }),
  ];
  it("elige la mejor cuota S/I que aplica al precio", () => {
    assert.equal(bestInstallment(30000, promos)?.installments, 5);
    assert.equal(bestInstallment(10000, promos)?.installments, 3, "Naranja no aplica por monto mínimo");
  });
  it("ignora planes con interés y redondea la cuota para arriba", () => {
    const opts = installmentOptions(10001, promos);
    assert.deepEqual(opts.map((o) => o.installments), [3]);
    assert.equal(opts[0].amount, 3334);
  });
  it("calcula el precio sin impuestos nacionales", () => {
    assert.equal(priceWithoutTaxes(12100, 1.21), 10000);
  });
});

describe("filtros y orden", () => {
  const items = [
    card({ slug: "a", price: 30000, sizesInStock: ["38"], colors: [{ name: "Negro", slug: "negro", hex: "#000" }], line: "seleccion", soldCount: 5 }),
    card({ slug: "b", price: 10000, sizesInStock: ["40"], colors: [{ name: "Rojo", slug: "rojo", hex: "#f00" }], onSale: true, discountPct: 20, soldCount: 50 }),
    card({ slug: "c", price: 20000, sizesInStock: ["38", "40"], colors: [{ name: "Negro", slug: "negro", hex: "#000" }], isNew: true }),
  ];
  it("lee los filtros de la URL y descarta valores inválidos", () => {
    const f = parseFilters({ talle: "38,40", color: "negro", min: "15.000", orden: "cualquiera", pagina: "999" });
    assert.deepEqual(f.sizes, ["38", "40"]);
    assert.equal(f.min, 15000);
    assert.equal(f.sort, null);
    assert.equal(f.page, 50);
  });
  it("filtra por talle, color, precio, línea y oferta", () => {
    const base = parseFilters({});
    assert.deepEqual(applyFilters(items, { ...base, sizes: ["38"] }).map((p) => p.slug), ["a", "c"]);
    assert.deepEqual(applyFilters(items, { ...base, colors: ["rojo"] }).map((p) => p.slug), ["b"]);
    assert.deepEqual(applyFilters(items, { ...base, min: 15000, max: 25000 }).map((p) => p.slug), ["c"]);
    assert.deepEqual(applyFilters(items, { ...base, line: "seleccion" }).map((p) => p.slug), ["a"]);
    assert.deepEqual(applyFilters(items, { ...base, onSale: true }).map((p) => p.slug), ["b"]);
  });
  it("ordena por precio, ventas, descuento y novedad", () => {
    assert.deepEqual(sortProducts(items, "menor-precio").map((p) => p.slug), ["b", "c", "a"]);
    assert.deepEqual(sortProducts(items, "mas-vendidos").map((p) => p.slug), ["b", "a", "c"]);
    assert.equal(sortProducts(items, "mayor-descuento")[0].slug, "b");
    assert.equal(sortProducts(items, "nuevos")[0].slug, "c");
  });
  it("arma la URL compartible sin valores por defecto", () => {
    assert.equal(toQuery({ sizes: ["38"], onSale: true, page: 1 }), "?talle=38&oferta=1");
    assert.equal(toQuery({}, { q: "zapas" }), "?q=zapas");
  });
  it("cuenta las opciones de cada filtro", () => {
    const f = buildFacets(items);
    assert.deepEqual(f.sizes, [{ value: "38", count: 2 }, { value: "40", count: 2 }]);
    assert.equal(f.priceMin, 10000);
    assert.equal(f.onSaleCount, 1);
  });
});

describe("búsqueda", () => {
  it("normaliza acentos, ñ y signos", () => {
    assert.equal(normalize("Niño  Zapatillas!"), "nino zapatillas");
    assert.deepEqual(tokens("Bota, cuero"), ["bota", "cuero"]);
  });
  it("tolera errores de tipeo según el largo de la palabra", () => {
    const words = ["zapatilla", "urbana", "ojota"];
    assert.equal(termScore("zapatilla", words), 3);
    assert.equal(termScore("zapa", words), 2);
    assert.equal(termScore("zapatila", words), 1);
    assert.equal(termScore("xyz", words), 0);
    assert.equal(editDistance("bota", "botas", 1), 1);
  });
});

describe("código postal", () => {
  it("acepta 4 dígitos o CPA y devuelve los 4 dígitos", () => {
    assert.equal(normalizeCp("5730"), "5730");
    assert.equal(normalizeCp("d5730abc"), "5730");
    assert.equal(normalizeCp(" 5730 "), "5730");
    assert.equal(normalizeCp("573"), null);
    assert.equal(normalizeCp("57300"), null);
  });
});

describe("CSV", () => {
  it("detecta ; o , y respeta comillas y saltos de línea", () => {
    assert.deepEqual(parseCsv('a;b\n"x;1";"di ""hola"""\n'), [["a", "b"], ["x;1", 'di "hola"']]);
    assert.deepEqual(parseCsv("a,b\r\n1,2"), [["a", "b"], ["1", "2"]]);
    assert.deepEqual(parseCsv('﻿n;d\n"línea 1\nlínea 2";x'), [["n", "d"], ["línea 1\nlínea 2", "x"]]);
  });
});
