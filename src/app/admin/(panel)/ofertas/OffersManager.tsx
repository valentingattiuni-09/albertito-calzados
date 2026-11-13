"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useMemo, useState } from "react";
import { FormMessage, inputCls, SubmitButton, toLocalInput, Toggle, ActionForm } from "@/components/admin/ui";
import type { AdminProductSummary } from "@/lib/admin/repo";
import { formatPrice } from "@/lib/format";
import { saveOfferAction, type ActionState } from "../../actions";

const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

function OfferRow({ p }: { p: AdminProductSummary }) {
  const router = useRouter();
  const [state, action, pending] = useActionState<ActionState, FormData>(saveOfferAction, null);
  const [on, setOn] = useState(p.isOffer);
  const [mode, setMode] = useState<"price" | "pct">("price");
  const [value, setValue] = useState(p.salePrice ? String(p.salePrice) : "");
  useEffect(() => {
    if (state?.ok) router.refresh();
  }, [state, router]);

  const preview = mode === "pct" ? Math.round((p.basePrice * (100 - Number(value || 0))) / 100 / 100) * 100 : Number(value || 0);
  const pct = preview > 0 && preview < p.basePrice ? Math.round((100 * (p.basePrice - preview)) / p.basePrice) : 0;

  return (
    <li className="rounded-lg border border-azul/15 p-3">
      <ActionForm dispatch={action} pending={pending} className="space-y-3">
        <input type="hidden" name="id" value={p.id} />
        <input type="hidden" name="basePrice" value={p.basePrice} />
        <input type="hidden" name="mode" value={mode} />
        <div className="flex items-center gap-3">
          <span className="relative size-14 shrink-0 overflow-hidden rounded border border-azul/10">
            {p.image && <Image src={p.image} alt="" fill sizes="56px" className="object-contain" />}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold">{p.name}</p>
            <p className="text-sm text-gris-tinta">Precio normal: {formatPrice(p.basePrice)}</p>
          </div>
          <Toggle name="isOffer" label="En oferta" checked={on} onChange={setOn} />
        </div>

        {on && (
          <div className="grid gap-3 sm:grid-cols-2 sm:items-end">
            <div className="flex h-11 self-end rounded-md border border-azul/30 p-0.5 sm:w-fit" role="group" aria-label="Tipo de descuento">
              {(
                [
                  ["price", "$ precio"],
                  ["pct", "% off"],
                ] as const
              ).map(([m, l]) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => {
                    setMode(m);
                    setValue("");
                  }}
                  aria-pressed={mode === m}
                  className={`h-full flex-1 whitespace-nowrap rounded px-4 text-sm font-semibold ${mode === m ? "bg-azul text-blanco" : ""}`}
                >
                  {l}
                </button>
              ))}
            </div>
            <label className="text-sm font-semibold">
              {mode === "pct" ? "Descuento (%)" : "Precio de oferta ($)"}
              <input
                name={mode === "pct" ? "pct" : "salePrice"}
                inputMode="numeric"
                value={value}
                onChange={(e) => setValue(e.target.value.replace(/\D/g, ""))}
                className={`${inputCls} mt-1`}
              />
            </label>
            <label className="text-sm font-semibold">
              Desde (opcional)
              <input name="saleStartsAt" type="datetime-local" defaultValue={toLocalInput(p.saleStartsAt)} className={`${inputCls} mt-1`} />
            </label>
            <label className="text-sm font-semibold">
              Hasta (opcional)
              <input name="saleEndsAt" type="datetime-local" defaultValue={toLocalInput(p.saleEndsAt)} className={`${inputCls} mt-1`} />
            </label>
            {pct > 0 && (
              <p className="text-sm sm:col-span-2">
                Se va a ver: <span className="text-gris-tinta line-through">{formatPrice(p.basePrice)}</span>{" "}
                <strong className="text-rojo">{formatPrice(preview)}</strong> <strong>-{pct}%</strong>
              </p>
            )}
          </div>
        )}
        <div className="flex flex-wrap items-center gap-3">
          <SubmitButton className="inline-flex h-10 items-center rounded-md bg-rojo px-4 text-sm font-bold uppercase text-blanco disabled:opacity-60">Guardar</SubmitButton>
          <FormMessage state={state} />
        </div>
      </ActionForm>
    </li>
  );
}

export function OffersManager({ products }: { products: AdminProductSummary[] }) {
  const [q, setQ] = useState("");
  const [onlyOffers, setOnlyOffers] = useState(false);
  const list = useMemo(
    () => products.filter((p) => (!onlyOffers || p.isOffer) && (!q || norm(p.name).includes(norm(q)))).slice(0, 60),
    [products, q, onlyOffers],
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-4">
        <label className="min-w-0 flex-1">
          <span className="sr-only">Buscar producto</span>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar producto…" className={inputCls} />
        </label>
        <Toggle label={`Solo en oferta (${products.filter((p) => p.isOffer).length})`} checked={onlyOffers} onChange={setOnlyOffers} />
      </div>
      <ul className="space-y-3">
        {list.map((p) => (
          <OfferRow key={p.id} p={p} />
        ))}
      </ul>
      {list.length === 0 && <p className="text-sm text-gris-tinta">No hay productos con ese filtro.</p>}
    </div>
  );
}
