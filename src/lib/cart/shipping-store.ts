"use client";

import { useSyncExternalStore } from "react";

/**
 * Código postal y opción de envío elegida, compartidos entre ficha, carrito y checkout
 * (se cargan una vez y se reutilizan).
 */
const KEY = "albertito:shipping";
const EVENT = "albertito:shipping-change";

export type ShippingPrefs = { cp: string; optionId: string | null };
const EMPTY: ShippingPrefs = { cp: "", optionId: null };
let cache: { raw: string | null; value: ShippingPrefs } = { raw: null, value: EMPTY };

function read(): ShippingPrefs {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(KEY);
  } catch {
    return EMPTY;
  }
  if (raw === cache.raw) return cache.value;
  let value = EMPTY;
  try {
    const p = raw ? JSON.parse(raw) : null;
    if (p && typeof p.cp === "string") value = { cp: p.cp, optionId: typeof p.optionId === "string" ? p.optionId : null };
  } catch {
    value = EMPTY;
  }
  cache = { raw, value };
  return value;
}

export function setShippingPrefs(next: Partial<ShippingPrefs>) {
  const value = { ...read(), ...next };
  try {
    localStorage.setItem(KEY, JSON.stringify(value));
  } catch {
    /* sin storage */
  }
  window.dispatchEvent(new Event(EVENT));
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

export function useShippingPrefs(): ShippingPrefs {
  return useSyncExternalStore(subscribe, read, () => EMPTY);
}
