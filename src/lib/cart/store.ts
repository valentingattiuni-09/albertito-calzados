"use client";

import { useSyncExternalStore } from "react";

/**
 * Carrito del navegador (invitados). En la Fase 4 se suma: drawer, validación de stock,
 * sincronización con la tabla `carts` al iniciar sesión y cotizador de envío.
 */
/** Copia de los datos para mostrar el carrito sin consultar; precio y stock se revalidan al abrirlo y al pagar. */
export type CartItem = {
  variantId: string;
  productId: string;
  slug: string;
  name: string;
  colorName: string;
  colorSlug: string;
  size: string;
  price: number;
  image: string | null;
  qty: number;
};

const KEY = "albertito:cart";
const EVENT = "albertito:cart-change";
const EMPTY: CartItem[] = [];

let cache: { raw: string | null; items: CartItem[] } = { raw: null, items: EMPTY };

function read(): CartItem[] {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(KEY);
  } catch {
    return EMPTY;
  }
  if (raw === cache.raw) return cache.items;
  let items: CartItem[] = EMPTY;
  try {
    const parsed = raw ? JSON.parse(raw) : [];
    if (Array.isArray(parsed)) items = parsed;
  } catch {
    items = EMPTY;
  }
  cache = { raw, items };
  return items;
}

export function writeCart(items: CartItem[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(items));
  } catch {
    // modo privado sin storage: el carrito vive solo en esta pestaña
  }
  window.dispatchEvent(new Event(EVENT));
}

/** Suma un par al carrito (si ya estaba, suma la cantidad) y abre el carrito lateral. */
export function addToCart(item: CartItem, maxQty: number) {
  const items = read();
  const existing = items.find((i) => i.variantId === item.variantId);
  const next = existing
    ? items.map((i) => (i.variantId === item.variantId ? { ...i, qty: Math.min(i.qty + item.qty, maxQty) } : i))
    : [...items, { ...item, qty: Math.min(item.qty, maxQty) }];
  writeCart(next);
  window.dispatchEvent(new Event("albertito:open-cart"));
}

function subscribe(cb: () => void) {
  const onStorage = (e: StorageEvent) => e.key === KEY && cb();
  window.addEventListener(EVENT, cb);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(EVENT, cb);
    window.removeEventListener("storage", onStorage);
  };
}

export function useCartItems(): CartItem[] {
  return useSyncExternalStore(subscribe, read, () => EMPTY);
}

export function useCartCount(): number {
  return useCartItems().reduce((n, i) => n + i.qty, 0);
}
