"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { PaymentLogo } from "@/components/ui/PaymentLogo";
import { ShippingQuoter, type QuoteState } from "@/components/shipping/ShippingQuoter";
import { CloseIcon, MinusIcon, PlusIcon } from "@/components/ui/icons";
import { useShippingPrefs } from "@/lib/cart/shipping-store";
import { useCartItems, writeCart, type CartItem } from "@/lib/cart/store";
import type { PaymentPromo } from "@/lib/data/types";
import { formatPrice } from "@/lib/format";
import { bestInstallment } from "@/lib/pricing";

type ValidatedLine = { variantId: string; price: number; qty: number; stock: number; issue: "sin_stock" | "stock_ajustado" | "no_disponible" | null };

/** Revalida el carrito contra la base y corrige precios/cantidades. Devuelve avisos para mostrar. */
export async function syncCart(items: CartItem[]): Promise<{ notices: string[]; stock: Record<string, number> }> {
  if (items.length === 0) return { notices: [], stock: {} };
  const res = await fetch("/api/cart/validate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ items: items.map((i) => ({ variantId: i.variantId, qty: i.qty })) }),
  });
  if (!res.ok) return { notices: [], stock: {} };
  const data = (await res.json()) as { lines: ValidatedLine[]; missing: string[] };
  const byId = new Map(data.lines.map((l) => [l.variantId, l]));
  const notices: string[] = [];
  const next: CartItem[] = [];
  for (const it of items) {
    const l = byId.get(it.variantId);
    if (!l || l.issue === "no_disponible" || l.issue === "sin_stock") {
      notices.push(`${it.name} talle ${it.size} se quedó sin stock y lo sacamos del carrito.`);
      continue;
    }
    if (l.issue === "stock_ajustado") notices.push(`De ${it.name} talle ${it.size} quedan ${l.stock}. Ajustamos la cantidad.`);
    if (l.price !== it.price) notices.push(`${it.name} cambió de precio: ahora ${formatPrice(l.price)}.`);
    next.push({ ...it, price: l.price, qty: l.qty });
  }
  if (JSON.stringify(next) !== JSON.stringify(items)) writeCart(next);
  return { notices, stock: Object.fromEntries(data.lines.map((l) => [l.variantId, l.stock])) };
}

/**
 * Carrito lateral: se abre al agregar un par (o tocando el ícono), sin salir de la página.
 * Valida stock al abrirse, cotiza el envío y muestra total y cuotas sin interés.
 */
export function CartDrawer({ promos }: { promos: PaymentPromo[] }) {
  const ref = useRef<HTMLDialogElement>(null);
  const items = useCartItems();
  const prefs = useShippingPrefs();
  const [notices, setNotices] = useState<string[]>([]);
  const [stock, setStock] = useState<Record<string, number>>({});
  const [quote, setQuote] = useState<QuoteState>(null);

  const open = useCallback(() => {
    if (!ref.current?.open) ref.current?.showModal();
    // Leer el carrito actual desde storage (el evento puede llegar antes del re-render)
    let current: CartItem[] = [];
    try {
      current = JSON.parse(localStorage.getItem("albertito:cart") ?? "[]");
    } catch {
      current = [];
    }
    void syncCart(current).then((r) => {
      setNotices(r.notices);
      setStock(r.stock);
    });
  }, []);

  useEffect(() => {
    window.addEventListener("albertito:open-cart", open);
    return () => window.removeEventListener("albertito:open-cart", open);
  }, [open]);


  const close = () => ref.current?.close();
  const setQty = (variantId: string, qty: number) =>
    writeCart(items.map((i) => (i.variantId === variantId ? { ...i, qty: Math.max(1, Math.min(qty, stock[variantId] ?? 10, 10)) } : i)));
  const remove = (variantId: string) => writeCart(items.filter((i) => i.variantId !== variantId));

  const subtotal = items.reduce((n, i) => n + i.price * i.qty, 0);
  const option = quote?.options.find((o) => o.id === prefs.optionId) ?? null;
  const total = subtotal + (option?.price ?? 0);
  const cuota = bestInstallment(total, promos);
  const count = items.reduce((n, i) => n + i.qty, 0);

  return (
    <dialog
      ref={ref}
      aria-labelledby="cart-title"
      // Cerrar al tocar afuera o al ir a otra página (ej. "Iniciar compra")
      onClick={(e) => (e.target === ref.current || (e.target as HTMLElement).closest("a")) && close()}
      className="ml-auto mr-0 h-dvh max-h-dvh w-full max-w-md bg-blanco p-0 text-azul backdrop:bg-azul/50 open:animate-[slide-in-right_200ms_ease-out]"
    >
      <div className="flex h-full flex-col">
        <div className="flex items-center justify-between border-b border-azul/15 py-2 pl-5 pr-2">
          <h2 id="cart-title" className="text-lg font-bold uppercase">
            Tu carrito {count > 0 && <span className="text-sm font-medium normal-case text-gris-tinta">({count} {count === 1 ? "par" : "pares"})</span>}
          </h2>
          <button type="button" onClick={close} aria-label="Cerrar carrito" className="flex size-11 items-center justify-center rounded-full hover:bg-azul/5">
            <CloseIcon />
          </button>
        </div>

        {items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
            <p className="text-lg font-bold uppercase">Tu carrito está vacío</p>
            <p className="text-gris-tinta">Llevate el par que te gusta.</p>
            <button type="button" onClick={close} className="h-12 rounded-md bg-rojo px-6 text-sm font-bold uppercase text-blanco">
              Seguir comprando
            </button>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto px-5 py-4">
              {notices.length > 0 && (
                <ul role="alert" className="mb-4 space-y-1 rounded-md border border-rojo/40 p-3 text-sm">
                  {notices.map((n) => (
                    <li key={n}>{n}</li>
                  ))}
                </ul>
              )}

              <ul className="divide-y divide-azul/10">
                {items.map((i) => (
                  <li key={i.variantId} className="flex gap-3 py-4 first:pt-0">
                    <Link href={`/producto/${i.slug}?color=${i.colorSlug}`} onClick={close} className="relative size-20 shrink-0 overflow-hidden rounded-md border border-azul/10">
                      {i.image && <Image src={i.image} alt="" fill sizes="80px" className="object-contain" />}
                    </Link>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <Link href={`/producto/${i.slug}?color=${i.colorSlug}`} onClick={close} className="text-sm font-semibold leading-tight hover:underline">
                          {i.name}
                        </Link>
                        <button
                          type="button"
                          onClick={() => remove(i.variantId)}
                          aria-label={`Sacar ${i.name} talle ${i.size}`}
                          className="-mr-2 -mt-2 flex size-10 shrink-0 items-center justify-center rounded-full text-gris-tinta hover:text-rojo"
                        >
                          <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                            <path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v6M14 11v6" />
                          </svg>
                        </button>
                      </div>
                      <p className="text-xs text-gris-tinta">
                        {i.colorName} · Talle {i.size}
                      </p>
                      <div className="mt-2 flex items-center justify-between">
                        <div className="flex h-9 items-center rounded-md border border-azul/30" role="group" aria-label={`Cantidad de ${i.name}`}>
                          <button
                            type="button"
                            onClick={() => setQty(i.variantId, i.qty - 1)}
                            disabled={i.qty <= 1}
                            aria-label="Restar uno"
                            className="flex size-9 items-center justify-center disabled:opacity-30"
                          >
                            <MinusIcon size={16} />
                          </button>
                          <span className="w-6 text-center text-sm font-bold">{i.qty}</span>
                          <button
                            type="button"
                            onClick={() => setQty(i.variantId, i.qty + 1)}
                            disabled={i.qty >= (stock[i.variantId] ?? 10)}
                            aria-label="Sumar uno"
                            className="flex size-9 items-center justify-center disabled:opacity-30"
                          >
                            <PlusIcon size={16} />
                          </button>
                        </div>
                        <span className="text-base font-bold">{formatPrice(i.price * i.qty)}</span>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>

              <div className="mt-4">
                <ShippingQuoter request={{ items: items.map((i) => ({ variantId: i.variantId, qty: i.qty })) }} selectable onQuote={setQuote} />
              </div>
            </div>

            <div className="border-t border-azul/15 px-5 py-4 [padding-bottom:max(1rem,env(safe-area-inset-bottom))]">
              <dl className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <dt>Subtotal</dt>
                  <dd className="font-semibold">{formatPrice(subtotal)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt>Envío</dt>
                  <dd className="font-semibold">
                    {option ? (
                      option.price === 0 ? "Gratis" : formatPrice(option.price)
                    ) : (
                      <span className="font-normal text-gris-tinta">{quote ? "Elegí una opción" : "Ingresá tu código postal"}</span>
                    )}
                  </dd>
                </div>
                <div className="flex items-baseline justify-between pt-1 text-base">
                  <dt className="font-bold uppercase">Total</dt>
                  <dd className="text-xl font-bold">{formatPrice(total)}</dd>
                </div>
                {cuota && (
                  <p className="flex flex-wrap items-center justify-end gap-x-2 text-right text-sm font-medium">
                    <span>
                      {cuota.installments} cuotas sin interés de {formatPrice(cuota.amount)} con
                    </span>
                    <PaymentLogo provider={cuota.promo.provider} logoUrl={cuota.promo.logoUrl} label={cuota.promo.label} className="h-4" compact />
                  </p>
                )}
              </dl>
              <Link
                href="/checkout"
                className="mt-4 flex h-14 items-center justify-center rounded-md bg-rojo text-base font-bold uppercase tracking-wide text-blanco hover:opacity-90"
              >
                Iniciar compra
              </Link>
              <button type="button" onClick={close} className="mt-2 flex min-h-11 w-full items-center justify-center text-sm font-semibold underline underline-offset-4">
                Seguir comprando
              </button>
            </div>
          </>
        )}
      </div>
    </dialog>
  );
}
