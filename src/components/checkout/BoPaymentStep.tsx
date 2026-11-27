"use client";

import { useEffect, useId, useMemo, useState } from "react";
import { brandToApi, installmentsFor, type BoPaymentOptions } from "@/lib/backoffice/checkout-map";
import { formatPrice } from "@/lib/format";
import { detectBrand, tokenizeForBackoffice, validateCard, type CardInput } from "@/lib/payments/client";

/** Lo que responde la web al pagar (rutas /api/checkout y /api/checkout/pay en modo back office) */
export type PayResponse = {
  ok: boolean;
  number?: string;
  outcome?: "redirect" | "aprobado" | "pendiente" | "revision" | "rechazado" | "error";
  redirectUrl?: string;
  message?: string;
  step?: 1 | 2 | 3;
  action?: "sync_cart" | "requote" | "reload_installments" | "go_confirmation" | "new_order" | "retry_new_key";
  code?: string | null;
  attemptsLeft?: number;
};
export type PaymentRequest = { provider: "PAYWAY" | "MERCADOPAGO"; installments: number; brand?: string; token?: string; bin?: string; attemptKey: string };

const BRANDS: { id: string; label: string; tag?: string }[] = [
  { id: "visa", label: "Visa", tag: "Crédito" },
  { id: "master", label: "Mastercard", tag: "Crédito" },
  { id: "naranja", label: "Naranja" },
  { id: "visa_debito", label: "Visa Débito", tag: "Débito" },
  { id: "master_debito", label: "Mastercard Débito", tag: "Débito" },
];
const EMPTY_CARD: CardInput = { number: "", holderName: "", expMonth: "", expYear: "", cvv: "", holderDni: "" };
const input = "h-12 w-full rounded-md border border-azul/30 bg-blanco px-3 text-base text-azul placeholder:text-gris-tinta";
const labelCls = "mb-1 block text-sm font-semibold";

/**
 * Paso de pago con el back office: tarjeta (Payway: el navegador tokeniza y la API cobra) o Mercado Pago (redirección). Las cuotas salen de la API
 * (solo sin interés; «1 pago» siempre) y la API las vuelve a validar. El número de la tarjeta nunca sale del navegador.
 */
export function BoPaymentStep({ total, submit, onDone, onFailure }: { total: number; submit: (p: PaymentRequest) => Promise<PayResponse>; onDone: (r: PayResponse) => void; onFailure: (r: PayResponse) => void }) {
  const id = useId();
  const [opts, setOpts] = useState<BoPaymentOptions | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reload, setReload] = useState(0);
  const [provider, setProvider] = useState<"PAYWAY" | "MERCADOPAGO" | null>(null);
  const [brand, setBrand] = useState("");
  const [installments, setInstallments] = useState(1);
  const [card, setCard] = useState<CardInput>(EMPTY_CARD);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancel = false;
    fetch(`/api/checkout/options?total=${Math.max(1, Math.round(total))}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error())))
      .then((o: BoPaymentOptions) => {
        if (cancel) return;
        setOpts(o);
        setProvider((p) => (p && o.providers.some((x) => x.id === p) ? p : (o.providers.find((x) => x.id === "PAYWAY")?.id ?? o.providers[0]?.id ?? null)));
      })
      .catch(() => !cancel && setLoadError("No pudimos cargar los medios de pago. Probá de nuevo."));
    return () => {
      cancel = true;
    };
  }, [total, reload]);

  const payway = opts?.providers.find((p) => p.id === "PAYWAY");
  const cardInBrowser = provider === "PAYWAY" && payway?.mode === "DIRECT";
  const choices = useMemo(() => (opts && provider ? installmentsFor(opts, provider, provider === "PAYWAY" ? brand || null : null) : [1]), [opts, provider, brand]);
  const chosen = choices.includes(installments) ? installments : 1;
  const brands = BRANDS.filter((b) => !opts || [...opts.brands.credit, ...opts.brands.debit].includes(brandToApi(b.id)));

  const pay = async () => {
    setError(null);
    if (!provider) return setError("Elegí cómo querés pagar.");
    let token: { token: string; bin: string } | null = null;
    if (cardInBrowser) {
      if (!brand) return setError("Elegí la tarjeta.");
      const cardError = validateCard(card);
      if (cardError) return setError(cardError);
    }
    setSubmitting(true);
    try {
      if (cardInBrowser) token = await tokenizeForBackoffice(card, payway?.publicKey ?? null);
      const res = await submit({
        provider,
        installments: chosen,
        attemptKey: crypto.randomUUID(),
        ...(provider === "PAYWAY" ? { brand: brand ? brandToApi(brand) : undefined, token: token?.token, bin: token?.bin } : {}),
      });
      if (res.outcome === "redirect" && res.redirectUrl) {
        setCard(EMPTY_CARD);
        window.location.assign(res.redirectUrl);
        return;
      }
      if (res.ok) {
        setCard(EMPTY_CARD);
        onDone(res);
        return;
      }
      setError(res.message ?? "No pudimos procesar el pago. Probá de nuevo.");
      if (res.action === "reload_installments") setReload((n) => n + 1);
      onFailure(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No pudimos procesar el pago.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loadError)
    return (
      <div className="mt-5 space-y-3">
        <p role="alert" className="text-sm font-semibold text-rojo">
          {loadError}
        </p>
        <button
          type="button"
          onClick={() => {
            setLoadError(null);
            setReload((n) => n + 1);
          }}
          className="h-11 rounded-md border-2 border-azul px-4 text-sm font-bold uppercase"
        >
          Reintentar
        </button>
      </div>
    );
  if (!opts) return <p className="mt-5 text-sm text-gris-tinta">Cargando los medios de pago…</p>;
  if (opts.providers.length === 0) return <p className="mt-5 text-sm font-semibold">El pago online no está disponible ahora. Escribinos por WhatsApp y te ayudamos.</p>;

  return (
    <form
      className="mt-5 space-y-5"
      onSubmit={(e) => {
        e.preventDefault();
        void pay();
      }}
      noValidate
      autoComplete="on"
    >
      <fieldset>
        <legend className="mb-2 text-sm font-semibold">¿Cómo querés pagar?</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {opts.providers.map((p) => (
            <label key={p.id} className={`flex min-h-16 cursor-pointer items-center gap-3 rounded-md border p-3 ${provider === p.id ? "border-azul ring-1 ring-azul" : "border-azul/30"}`}>
              <input type="radio" name="provider" checked={provider === p.id} onChange={() => setProvider(p.id)} className="size-4 accent-azul" />
              <span>
                <span className="block text-sm font-bold">{p.id === "PAYWAY" ? "Tarjeta de crédito o débito" : "Mercado Pago"}</span>
                <span className="block text-xs text-gris-tinta">{p.id === "PAYWAY" ? (p.mode === "DIRECT" ? "Visa, Mastercard, Naranja y más" : "Formulario seguro de Payway") : "Pagás en el sitio de Mercado Pago"}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      {provider === "PAYWAY" && (
        <fieldset>
          <legend className="mb-2 text-sm font-semibold">Tarjeta</legend>
          <div className="grid gap-2 sm:grid-cols-3">
            {brands.map((b) => (
              <label key={b.id} className={`flex min-h-12 cursor-pointer items-center gap-2 rounded-md border px-3 ${brand === b.id ? "border-azul ring-1 ring-azul" : "border-azul/30"}`}>
                <input type="radio" name="brand" checked={brand === b.id} onChange={() => setBrand(b.id)} className="size-4 accent-azul" />
                <span className="text-sm font-semibold">{b.label}</span>
                {b.tag && <span className="ml-auto text-xs text-gris-tinta">{b.tag}</span>}
              </label>
            ))}
          </div>
        </fieldset>
      )}

      <fieldset>
        <legend className="mb-2 text-sm font-semibold">Cuotas</legend>
        <div className="space-y-2">
          {choices.map((n) => (
            <label key={n} className={`flex min-h-12 cursor-pointer items-center justify-between gap-3 rounded-md border px-3 ${chosen === n ? "border-azul ring-1 ring-azul" : "border-azul/30"}`}>
              <span className="flex items-center gap-2">
                <input type="radio" name="installments" checked={chosen === n} onChange={() => setInstallments(n)} className="size-4 accent-azul" />
                <span className="text-sm">
                  {n === 1 ? "1 pago" : provider === "MERCADOPAGO" ? `Hasta ${n} cuotas` : `${n} cuotas`}
                  {n > 1 && provider === "PAYWAY" && <strong className="ml-1 font-bold">sin interés</strong>}
                </span>
              </span>
              <span className="text-sm font-bold">{n > 1 && provider === "PAYWAY" ? `${n} × ${formatPrice(Math.ceil(total / n))}` : formatPrice(total)}</span>
            </label>
          ))}
        </div>
        {provider === "MERCADOPAGO" && <p className="mt-2 text-xs text-gris-tinta">Las cuotas y su interés los elegís en Mercado Pago.</p>}
      </fieldset>

      {cardInBrowser && (
        <fieldset className="grid gap-4 sm:grid-cols-6">
          <legend className="mb-2 text-sm font-semibold">Datos de la tarjeta</legend>
          <div className="sm:col-span-6">
            <label htmlFor={`${id}-num`} className={labelCls}>
              Número de la tarjeta
            </label>
            <input
              id={`${id}-num`}
              inputMode="numeric"
              autoComplete="cc-number"
              className={input}
              value={card.number}
              onChange={(e) => {
                setCard({ ...card, number: e.target.value });
                const d = detectBrand(e.target.value);
                if (d && !brand) setBrand(d);
              }}
            />
          </div>
          <div className="sm:col-span-6">
            <label htmlFor={`${id}-holder`} className={labelCls}>
              Nombre como figura en la tarjeta
            </label>
            <input id={`${id}-holder`} autoComplete="cc-name" className={input} value={card.holderName} onChange={(e) => setCard({ ...card, holderName: e.target.value })} />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor={`${id}-mm`} className={labelCls}>
              Mes (MM)
            </label>
            <input id={`${id}-mm`} inputMode="numeric" autoComplete="cc-exp-month" maxLength={2} className={input} value={card.expMonth} onChange={(e) => setCard({ ...card, expMonth: e.target.value })} />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor={`${id}-yy`} className={labelCls}>
              Año (AA)
            </label>
            <input id={`${id}-yy`} inputMode="numeric" autoComplete="cc-exp-year" maxLength={2} className={input} value={card.expYear} onChange={(e) => setCard({ ...card, expYear: e.target.value })} />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor={`${id}-cvv`} className={labelCls}>
              Código de seguridad
            </label>
            <input id={`${id}-cvv`} inputMode="numeric" autoComplete="cc-csc" maxLength={4} className={input} value={card.cvv} onChange={(e) => setCard({ ...card, cvv: e.target.value })} />
          </div>
          <div className="sm:col-span-3">
            <label htmlFor={`${id}-dni`} className={labelCls}>
              DNI del titular
            </label>
            <input id={`${id}-dni`} inputMode="numeric" className={input} value={card.holderDni} onChange={(e) => setCard({ ...card, holderDni: e.target.value })} />
          </div>
          <p className="text-xs text-gris-tinta sm:col-span-6">Los datos de la tarjeta no pasan por nuestros servidores: se cifran en tu navegador y los procesa Payway.</p>
        </fieldset>
      )}

      {error && (
        <p role="alert" className="rounded-md border border-rojo/40 p-3 text-sm font-semibold text-rojo">
          {error}
        </p>
      )}
      <button type="submit" disabled={submitting} className="h-12 w-full rounded-md bg-rojo text-base font-bold uppercase text-blanco disabled:opacity-60">
        {submitting ? "Procesando…" : provider === "MERCADOPAGO" || (provider === "PAYWAY" && !cardInBrowser) ? "Ir a pagar" : `Pagar ${formatPrice(total)}`}
      </button>
    </form>
  );
}
