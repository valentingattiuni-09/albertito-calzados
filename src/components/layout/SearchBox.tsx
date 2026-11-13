"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import type { Suggestion } from "@/app/api/search/suggest/route";
import { SearchIcon } from "@/components/ui/icons";

/**
 * Buscador de la barra roja con sugerencias desde 2 letras (productos con foto, precio y cuotas,
 * y categorías). Enter lleva a /buscar?q=...  Accesible con teclado (patrón combobox).
 */
export function SearchBox({ onFocusChange }: { onFocusChange?: (focused: boolean) => void }) {
  const router = useRouter();
  const listId = useId();
  const [q, setQ] = useState("");
  const [data, setData] = useState<Suggestion | null>(null);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [top, setTop] = useState(0);
  const wrap = useRef<HTMLFormElement>(null);
  const input = useRef<HTMLInputElement>(null);

  // Pedir sugerencias con un pequeño retardo mientras se escribe
  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) return;
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search/suggest?q=${encodeURIComponent(term)}`, { signal: ctrl.signal });
        if (res.ok) {
          setData(await res.json());
          setActive(-1);
        }
      } catch {
        /* cancelada o sin red */
      }
    }, 180);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [q]);

  // Cerrar al tocar afuera
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!wrap.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [open]);

  const show = open && q.trim().length >= 2 && data !== null;
  const items = show ? [...(data?.categories ?? []), ...(data?.products ?? [])] : [];

  const go = (href: string) => {
    setOpen(false);
    input.current?.blur();
    router.push(href);
  };

  const submit = () => {
    const term = q.trim();
    if (!term) return;
    if (active >= 0 && items[active]) return go(items[active].href);
    go(`/buscar?q=${encodeURIComponent(term)}`);
  };

  const openPanel = () => {
    const r = wrap.current?.getBoundingClientRect();
    if (r) setTop(r.bottom + 8);
    setOpen(true);
  };

  const optionId = (i: number) => `${listId}-opt-${i}`;

  return (
    <form
      ref={wrap}
      role="search"
      action="/buscar"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      className="relative w-full"
    >
      <label htmlFor="buscador" className="sr-only">
        Buscá zapatillas, ojotas, alpargatas…
      </label>
      <input
        ref={input}
        id="buscador"
        name="q"
        type="search"
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          openPanel();
        }}
        onFocus={() => {
          onFocusChange?.(true);
          openPanel();
        }}
        // Demora para que el toque en la lupa llegue antes de que vuelva a aparecer el logo
        onBlur={() => setTimeout(() => onFocusChange?.(false), 150)}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown" && items.length) {
            e.preventDefault();
            setActive((a) => (a + 1) % items.length);
          } else if (e.key === "ArrowUp" && items.length) {
            e.preventDefault();
            setActive((a) => (a <= 0 ? items.length - 1 : a - 1));
          } else if (e.key === "Escape") {
            setOpen(false);
          }
        }}
        placeholder="Buscar"
        autoComplete="off"
        enterKeyHint="search"
        role="combobox"
        aria-expanded={show}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={active >= 0 ? optionId(active) : undefined}
        className="h-11 w-full rounded-full border-0 bg-blanco pl-4 pr-11 text-sm text-azul placeholder:text-gris-tinta focus:outline-none focus-visible:ring-3 focus-visible:ring-azul [&::-webkit-search-cancel-button]:hidden"
      />
      <button
        type="submit"
        className="absolute right-0 top-0 flex size-11 items-center justify-center rounded-full text-azul"
        aria-label="Buscar"
      >
        <SearchIcon size={20} />
      </button>

      {show && (
        <div
          id={listId}
          role="listbox"
          aria-label="Sugerencias"
          style={{ ["--top" as string]: `${top}px` }}
          className="fixed inset-x-2 top-[var(--top)] z-50 max-h-[70dvh] overflow-y-auto rounded-xl border border-azul/10 bg-blanco text-azul shadow-xl shadow-azul/20 sm:absolute sm:inset-x-auto sm:right-0 sm:top-full sm:mt-2 sm:w-[30rem]"
        >
          {items.length === 0 ? (
            <p className="px-4 py-5 text-sm">
              No encontramos <strong>“{q.trim()}”</strong>. Probá con otra palabra.
            </p>
          ) : (
            <>
              {data!.categories.length > 0 && (
                <div className="border-b border-azul/10 p-2">
                  <p className="px-2 pb-1 pt-1 text-xs font-bold uppercase tracking-[0.15em] text-gris-tinta">Categorías</p>
                  {data!.categories.map((c, i) => (
                    <Link
                      key={c.href}
                      id={optionId(i)}
                      role="option"
                      aria-selected={active === i}
                      href={c.href}
                      onClick={() => setOpen(false)}
                      className={`flex min-h-11 items-center rounded-md px-2 text-sm font-semibold ${active === i ? "bg-azul text-blanco" : "hover:bg-azul/5"}`}
                    >
                      {c.name}
                    </Link>
                  ))}
                </div>
              )}
              {data!.products.length > 0 && (
                <div className="p-2">
                  <p className="px-2 pb-1 pt-1 text-xs font-bold uppercase tracking-[0.15em] text-gris-tinta">Productos</p>
                  {data!.products.map((p, j) => {
                    const i = data!.categories.length + j;
                    return (
                      <Link
                        key={p.href}
                        id={optionId(i)}
                        role="option"
                        aria-selected={active === i}
                        href={p.href}
                        onClick={() => setOpen(false)}
                        className={`flex items-center gap-3 rounded-md p-2 ${active === i ? "bg-azul/10" : "hover:bg-azul/5"}`}
                      >
                        <span className="relative size-14 shrink-0 overflow-hidden rounded-md border border-azul/10">
                          {p.image && <Image src={p.image} alt="" fill sizes="56px" className="object-contain" />}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium">{p.name}</span>
                          <span className="flex items-baseline gap-2">
                            <span className={`text-sm font-bold ${p.basePrice ? "text-rojo" : ""}`}>{p.price}</span>
                            {p.basePrice && <span className="text-xs text-gris-tinta line-through">{p.basePrice}</span>}
                          </span>
                          {p.installments && <span className="block text-xs">{p.installments}</span>}
                        </span>
                      </Link>
                    );
                  })}
                </div>
              )}
              <div className="border-t border-azul/10 p-2">
                <Link
                  href={`/buscar?q=${encodeURIComponent(q.trim())}`}
                  onClick={() => setOpen(false)}
                  className="flex min-h-11 items-center justify-center rounded-md text-sm font-bold underline underline-offset-4"
                >
                  Ver los {data!.total} resultados
                </Link>
              </div>
            </>
          )}
        </div>
      )}
    </form>
  );
}
