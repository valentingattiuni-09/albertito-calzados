"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ProductCard } from "@/components/product/ProductCard";
import type { PaymentPromo, ProductCard as Card } from "@/lib/data/types";

type Group = { label: string; sizes: string[] };

/** "Elegí tu talle": al tocar un talle muestra productos con stock en ese talle y link a ver todos. */
export function SizeFinder({ groups, promos }: { groups: Group[]; promos: PaymentPromo[] }) {
  const [size, setSize] = useState<string | null>(null);
  const [data, setData] = useState<{ products: Card[]; total: number } | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!size) return;
    const ctrl = new AbortController();
    fetch(`/api/products/by-size?talle=${encodeURIComponent(size)}`, { signal: ctrl.signal })
      .then((r) => r.json())
      .then((d) => {
        setData(d);
        setLoading(false);
      })
      .catch(() => {});
    return () => ctrl.abort();
  }, [size]);

  return (
    <div>
      <div className="space-y-4">
        {groups.map((g) => (
          <div key={g.label}>
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.15em] text-gris-tinta">{g.label}</p>
            <ul className="flex flex-wrap gap-2" aria-label={`Talles ${g.label}`}>
              {g.sizes.map((s) => (
                <li key={s}>
                  <button
                    type="button"
                    onClick={() => {
                      setLoading(true);
                      setSize(s);
                    }}
                    aria-pressed={size === s}
                    className={`flex size-12 items-center justify-center rounded-md border text-base font-semibold transition-colors ${
                      size === s ? "border-azul bg-azul text-blanco" : "border-azul/30 hover:border-azul"
                    }`}
                  >
                    {s}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div aria-live="polite" className="mt-6">
        {size && loading && <p className="text-sm text-gris-tinta">Buscando talle {size}…</p>}
        {size && !loading && data && (
          <>
            <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
              <p className="text-base font-bold">
                {data.total > 0 ? `Tenemos tu talle: ${data.total} modelos en ${size}` : `Por ahora no hay modelos en talle ${size}`}
              </p>
              {data.total > 0 && (
                <Link href={`/buscar?talle=${encodeURIComponent(size)}`} className="text-sm font-semibold underline underline-offset-4">
                  Ver todos en talle {size}
                </Link>
              )}
            </div>
            <ul className="no-scrollbar -mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-2 sm:gap-5 lg:mx-0 lg:grid lg:grid-cols-4 lg:overflow-visible lg:px-0">
              {data.products.map((p) => (
                <li key={p.id} className="w-[44vw] shrink-0 snap-start sm:w-[30vw] lg:w-auto">
                  <ProductCard product={p} promos={promos} />
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </div>
  );
}
