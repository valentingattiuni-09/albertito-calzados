"use client";

import { useSyncExternalStore } from "react";

/** Favoritos del navegador. En la Fase 4 se sincronizan con la tabla `favorites` al iniciar sesión. */
const KEY = "albertito:favs";
const EVENT = "albertito:favs-change";
const EMPTY: string[] = [];
let cache: { raw: string | null; ids: string[] } = { raw: null, ids: EMPTY };

function read(): string[] {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(KEY);
  } catch {
    return EMPTY;
  }
  if (raw === cache.raw) return cache.ids;
  let ids = EMPTY;
  try {
    const parsed = raw ? JSON.parse(raw) : [];
    if (Array.isArray(parsed)) ids = parsed.filter((x) => typeof x === "string");
  } catch {
    ids = EMPTY;
  }
  cache = { raw, ids };
  return ids;
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

export function useFavorites(): string[] {
  return useSyncExternalStore(subscribe, read, () => EMPTY);
}

export function toggleFavorite(productId: string) {
  const ids = read();
  const next = ids.includes(productId) ? ids.filter((i) => i !== productId) : [...ids, productId];
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* sin storage */
  }
  window.dispatchEvent(new Event(EVENT));
}
