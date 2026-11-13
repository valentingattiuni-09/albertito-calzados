"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { StoreIcon, TruckIcon } from "@/components/ui/icons";
import { setShippingPrefs, useShippingPrefs } from "@/lib/cart/shipping-store";
import { formatPrice } from "@/lib/format";
import type { ShippingOption } from "@/lib/shipping/types";

type Request = { items: { variantId: string; qty: number }[] } | { productId: string; qty: number };

export type QuoteState = { cp: string; options: ShippingOption[]; warnings: string[] } | null;

const eta = (o: ShippingOption) => (o.etaDays ? `Llega en ${o.etaDays} ${o.etaDays === 1 ? "día hábil" : "días hábiles"}` : o.service === "retiro" ? "Listo para retirar en 24 h" : "");

/**
 * "Calculá tu envío": código postal → Andreani y Correo Argentino (domicilio y sucursal) con precio y plazo,
 * más retiro gratis en el local. El CP se guarda y se reutiliza en ficha, carrito y checkout.
 * Con `selectable` se puede elegir una opción (carrito y checkout).
 */
export function ShippingQuoter({
  request,
  selectable = false,
  onQuote,
  compact = false,
}: {
  request: Request;
  selectable?: boolean;
  onQuote?: (q: QuoteState) => void;
  compact?: boolean;
}) {
  const id = useId();
  const prefs = useShippingPrefs();
  // Lo que escribe la persona; si no tocó el campo, se muestra el CP guardado
  const [draft, setDraft] = useState<string | null>(null);
  const cp = draft ?? prefs.cp;
  const [quote, setQuote] = useState<QuoteState>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const reqKey = JSON.stringify(request);
  const lastAuto = useRef<string | null>(null);

  const run = useCallback(
    async (value: string) => {
      const clean = value.trim();
      if (!clean) return;
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/shipping/quote", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ cp: clean, ...JSON.parse(reqKey) }),
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error ?? "No pudimos cotizar. Probá de nuevo.");
          setQuote(null);
          onQuote?.(null);
          return;
        }
        setQuote(data);
        onQuote?.(data);
        const stillValid = data.options.some((o: ShippingOption) => o.id === prefs.optionId);
        setShippingPrefs({ cp: data.cp, optionId: stillValid ? prefs.optionId : null });
      } catch {
        setError("No pudimos cotizar. Revisá tu conexión.");
      } finally {
        setLoading(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [reqKey],
  );

  // Si ya cargó su CP en otra pantalla, cotiza solo (y re-cotiza si cambia el carrito)
  useEffect(() => {
    if (!prefs.cp) return;
    const key = `${prefs.cp}|${reqKey}`;
    if (lastAuto.current === key) return;
    lastAuto.current = key;
    void run(prefs.cp);
  }, [prefs.cp, reqKey, run]);

  return (
    <div className={compact ? "" : "rounded-lg border border-azul/15 p-4"}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          lastAuto.current = `${cp.trim()}|${reqKey}`;
          void run(cp);
        }}
      >
        <label htmlFor={`${id}-cp`} className="flex items-center gap-2 text-sm font-semibold">
          <TruckIcon size={20} /> Calculá tu envío
        </label>
        <div className="mt-2 flex gap-2">
          <input
            id={`${id}-cp`}
            value={cp}
            onChange={(e) => setDraft(e.target.value)}
            inputMode="numeric"
            autoComplete="postal-code"
            placeholder="Tu código postal"
            maxLength={8}
            className="h-11 min-w-0 flex-1 rounded-md border border-azul/30 px-3 text-base"
            aria-describedby={error ? `${id}-err` : undefined}
          />
          <button type="submit" disabled={loading} className="h-11 shrink-0 rounded-md border-2 border-azul px-4 text-sm font-bold uppercase hover:bg-azul hover:text-blanco disabled:opacity-60">
            {loading ? "…" : "Calcular"}
          </button>
        </div>
        <a
          href="https://www.correoargentino.com.ar/formularios/cpa"
          target="_blank"
          rel="noopener noreferrer"
          className="mt-1 inline-flex min-h-9 items-center text-xs underline underline-offset-2"
        >
          No sé mi código postal
        </a>
      </form>

      {error && (
        <p id={`${id}-err`} role="alert" className="mt-2 text-sm font-semibold text-rojo">
          {error}
        </p>
      )}

      {quote && (
        <div className="mt-3" aria-live="polite">
          {quote.warnings.map((w) => (
            <p key={w} className="mb-2 rounded-md border border-azul/20 px-3 py-2 text-xs">
              {w}
            </p>
          ))}
          <fieldset>
            <legend className="sr-only">Opciones de envío para {quote.cp}</legend>
            <ul className="space-y-2">
              {quote.options.map((o) => {
                const checked = prefs.optionId === o.id;
                const content = (
                  <>
                    <span className="flex min-w-0 flex-1 items-start gap-2">
                      {o.service === "retiro" ? <StoreIcon size={18} className="mt-0.5 shrink-0" /> : <TruckIcon size={18} className="mt-0.5 shrink-0" />}
                      <span className="min-w-0">
                        <span className="block text-sm font-medium leading-tight">{o.label}</span>
                        <span className="block text-xs text-gris-tinta">{eta(o)}</span>
                      </span>
                    </span>
                    <span className="shrink-0 text-sm font-bold">{o.price === 0 ? "Gratis" : formatPrice(o.price)}</span>
                  </>
                );
                return (
                  <li key={o.id}>
                    {selectable ? (
                      <label
                        className={`flex cursor-pointer items-center gap-3 rounded-md border px-3 py-2.5 ${checked ? "border-azul ring-1 ring-azul" : "border-azul/15 hover:border-azul/40"}`}
                      >
                        <input
                          type="radio"
                          name={`${id}-option`}
                          checked={checked}
                          onChange={() => setShippingPrefs({ optionId: o.id })}
                          className="size-4 shrink-0 accent-azul"
                        />
                        {content}
                      </label>
                    ) : (
                      <div className="flex items-center gap-3 rounded-md border border-azul/10 px-3 py-2.5">{content}</div>
                    )}
                  </li>
                );
              })}
            </ul>
          </fieldset>
        </div>
      )}
    </div>
  );
}
