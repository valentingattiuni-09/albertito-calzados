"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useMemo, useState } from "react";
import { syncCart } from "@/components/cart/CartDrawer";
import { ShippingQuoter, type QuoteState } from "@/components/shipping/ShippingQuoter";
import { analytics } from "@/lib/analytics";
import { setShippingPrefs, useShippingPrefs } from "@/lib/cart/shipping-store";
import { useCartItems, writeCart } from "@/lib/cart/store";
import type { PaymentPromo } from "@/lib/data/types";
import { formatPrice } from "@/lib/format";
import { detectBrand, tokenizeCard, validateCard, type CardInput } from "@/lib/payments/client";

const PROVINCES = [
  "San Luis", "Buenos Aires", "CABA", "Catamarca", "Chaco", "Chubut", "Córdoba", "Corrientes", "Entre Ríos", "Formosa", "Jujuy",
  "La Pampa", "La Rioja", "Mendoza", "Misiones", "Neuquén", "Río Negro", "Salta", "San Juan", "Santa Cruz", "Santa Fe",
  "Santiago del Estero", "Tierra del Fuego", "Tucumán",
];

const BRANDS: { id: string; label: string }[] = [
  { id: "visa", label: "Visa" },
  { id: "master", label: "Mastercard" },
  { id: "naranja", label: "Naranja" },
  { id: "tarjeta_verde", label: "Tarjeta Verde" },
  { id: "visa_debito", label: "Visa Débito" },
  { id: "master_debito", label: "Maestro / Master Débito" },
];

type Customer = { email: string; firstName: string; lastName: string; dni: string; phone: string };
type Address = { street: string; number: string; floor: string; city: string; province: string };

const input = "h-12 w-full rounded-md border border-azul/30 bg-blanco px-3 text-base text-azul placeholder:text-gris-tinta aria-[invalid=true]:border-rojo";
const labelCls = "mb-1 block text-sm font-semibold";

function Field({ id, label, error, children }: { id: string; label: string; error?: string | null; children: React.ReactNode }) {
  return (
    <div>
      <label htmlFor={id} className={labelCls}>
        {label}
      </label>
      {children}
      {error && (
        <p id={`${id}-error`} className="mt-1 text-sm font-semibold text-rojo">
          {error}
        </p>
      )}
    </div>
  );
}

function StepHeader({ n, title, done, open, onEdit }: { n: number; title: string; done: boolean; open: boolean; onEdit: () => void }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <h2 className="flex items-center gap-3 text-lg font-bold uppercase">
        <span
          className={`flex size-8 items-center justify-center rounded-full text-sm ${open ? "bg-azul text-blanco" : done ? "bg-azul/10 text-azul" : "border border-azul/30 text-gris-tinta"}`}
          aria-hidden
        >
          {done && !open ? "✓" : n}
        </span>
        {title}
      </h2>
      {done && !open && (
        <button type="button" onClick={onEdit} className="min-h-11 text-sm font-semibold underline underline-offset-4">
          Cambiar
        </button>
      )}
    </div>
  );
}

/**
 * Checkout en una página, 3 pasos: Tus datos → Entrega → Pago. Resumen siempre visible
 * (a la derecha en desktop, abajo en mobile). Todo se vuelve a validar en el servidor.
 */
export function CheckoutForm({ promos, storeAddress }: { promos: PaymentPromo[]; storeAddress: string }) {
  const id = useId();
  const router = useRouter();
  const items = useCartItems();
  const prefs = useShippingPrefs();

  const [step, setStep] = useState(1);
  const [maxStep, setMaxStep] = useState(1);
  const [customer, setCustomer] = useState<Customer>({ email: "", firstName: "", lastName: "", dni: "", phone: "" });
  const [createAccount, setCreateAccount] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [quote, setQuote] = useState<QuoteState>(null);
  const [address, setAddress] = useState<Address>({ street: "", number: "", floor: "", city: "", province: "San Luis" });
  const [branchId, setBranchId] = useState("");
  const [coupon, setCoupon] = useState<{ code: string; discount: number } | null>(null);
  const [couponDraft, setCouponDraft] = useState("");
  const [couponMsg, setCouponMsg] = useState<string | null>(null);
  const [brand, setBrand] = useState("");
  const [installments, setInstallments] = useState(1);
  const [card, setCard] = useState<CardInput>({ number: "", holderName: "", expMonth: "", expYear: "", cvv: "", holderDni: "" });
  const [submitting, setSubmitting] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);
  const [notices, setNotices] = useState<string[]>([]);
  const [pendingOrder, setPendingOrder] = useState<{ number: string; accessToken: string } | null>(null);
  const [hydrated, setHydrated] = useState(false);

  // Validar stock y precio al entrar
  useEffect(() => {
    let raw: string | null = null;
    try {
      raw = localStorage.getItem("albertito:cart");
    } catch {
      /* sin storage */
    }
    const initial = raw ? JSON.parse(raw) : [];
    void syncCart(initial).then((r) => {
      setNotices(r.notices);
      setHydrated(true);
      if (initial.length) {
        analytics.beginCheckout(
          initial.map((i: { variantId: string; name: string; price: number; qty: number }) => ({ id: i.variantId, name: i.name, price: i.price, quantity: i.qty })),
        );
      }
    });
  }, []);

  const option = quote?.options.find((o) => o.id === prefs.optionId) ?? null;
  const subtotal = items.reduce((n, i) => n + i.price * i.qty, 0);
  const discount = coupon?.discount ?? 0;
  const total = subtotal - discount + (option?.price ?? 0);

  // Cuotas posibles para la tarjeta elegida (el servidor aplica la misma regla)
  const plans = useMemo(() => {
    const list = [{ installments: 1, label: "1 pago" }];
    if (!brand || brand.endsWith("_debito")) return list;
    promos
      .filter((p) => p.provider === brand && p.interestFree && p.installments > 1 && total >= p.minAmount)
      .forEach((p) => list.push({ installments: p.installments, label: `${p.installments} cuotas sin interés` }));
    return list;
  }, [brand, promos, total]);
  const plan = plans.find((p) => p.installments === installments) ?? plans[0];

  const go = (n: number) => {
    setStep(n);
    setMaxStep((m) => Math.max(m, n));
    requestAnimationFrame(() => document.getElementById(`${id}-step-${n}`)?.scrollIntoView({ behavior: "smooth", block: "start" }));
  };

  const validateCustomer = () => {
    const e: Record<string, string> = {};
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(customer.email.trim())) e.email = "Revisá tu mail.";
    if (!customer.firstName.trim()) e.firstName = "Completá tu nombre.";
    if (!customer.lastName.trim()) e.lastName = "Completá tu apellido.";
    if (!/^\d{7,8}$/.test(customer.dni.replace(/\D/g, ""))) e.dni = "Revisá el DNI: 7 u 8 números.";
    if (customer.phone.replace(/\D/g, "").length < 8) e.phone = "Revisá el teléfono, con característica.";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const validateDelivery = () => {
    const e: Record<string, string> = {};
    if (!option) e.shipping = "Elegí cómo te llega el pedido.";
    else if (option.service === "domicilio") {
      if (!address.street.trim()) e.street = "Completá la calle.";
      if (!address.number.trim()) e.number = "Completá la altura.";
      if (!address.city.trim()) e.city = "Completá la localidad.";
    } else if (option.service === "sucursal" && option.branches?.length && !option.branches.some((b) => b.id === branchId)) {
      e.branch = "Elegí la sucursal.";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const applyCoupon = async () => {
    setCouponMsg(null);
    const res = await fetch("/api/coupon", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: couponDraft, items: items.map((i) => ({ variantId: i.variantId, qty: i.qty })) }),
    }).then((r) => r.json());
    if (res.ok) {
      setCoupon({ code: res.code, discount: res.discount });
      setCouponMsg(`Cupón ${res.code} aplicado.`);
    } else {
      setCoupon(null);
      setCouponMsg(res.message);
    }
  };

  const pay = async () => {
    setPayError(null);
    if (!brand) return setPayError("Elegí la tarjeta.");
    const cardError = validateCard(card);
    if (cardError) return setPayError(cardError);

    setSubmitting(true);
    try {
      const tok = await tokenizeCard(card);
      const payment = { token: tok.token, bin: tok.bin, brand, installments: plan.installments };
      const res = pendingOrder
        ? await fetch("/api/checkout/pay", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ...pendingOrder, payment }),
          })
        : await fetch("/api/checkout", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              customer,
              items: items.map((i) => ({ variantId: i.variantId, qty: i.qty })),
              shipping: {
                optionId: option?.id,
                cp: prefs.cp,
                branchId,
                address: option?.service === "domicilio" ? address : undefined,
              },
              coupon: coupon?.code,
              payment,
            }),
          });
      const data = await res.json();

      if (data.code === "CART_CHANGED" || data.code === "OUT_OF_STOCK") {
        const r = await syncCart(items);
        setNotices(r.notices.length ? r.notices : [data.message]);
        setPayError(data.message);
        return;
      }
      if (data.number && data.accessToken && (data.paymentStatus === "aprobado" || data.paymentStatus === "pendiente")) {
        writeCart([]);
        setShippingPrefs({ optionId: null });
        // Limpiar los datos de la tarjeta del estado antes de salir
        setCard({ number: "", holderName: "", expMonth: "", expYear: "", cvv: "", holderDni: "" });
        router.push(`/checkout/confirmacion/${data.number}?t=${data.accessToken}${createAccount ? "&cuenta=1" : ""}`);
        return;
      }
      if (data.number && data.accessToken) setPendingOrder({ number: data.number, accessToken: data.accessToken });
      setPayError(data.message ?? "No pudimos procesar el pago. Probá de nuevo.");
      if (data.field && ["email", "firstName", "lastName", "dni", "phone"].includes(data.field)) go(1);
      else if (data.field && ["cp", "shipping", "address", "branch"].includes(data.field)) go(2);
    } catch (e) {
      setPayError(e instanceof Error ? e.message : "No pudimos procesar el pago.");
    } finally {
      setSubmitting(false);
    }
  };

  if (hydrated && items.length === 0) {
    return (
      <div className="py-16 text-center">
        <p className="text-xl font-bold uppercase">Tu carrito está vacío</p>
        <p className="mt-2 text-gris-tinta">Elegí tu par y volvé.</p>
        <Link href="/" className="mt-6 inline-flex h-12 items-center rounded-md bg-rojo px-6 text-sm font-bold uppercase text-blanco">
          Ir a la tienda
        </Link>
      </div>
    );
  }

  const err = (k: string) => (errors[k] ? { "aria-invalid": true, "aria-describedby": `${id}-${k}-error` } : {});

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_24rem] lg:items-start">
      <div className="space-y-4">
        {notices.length > 0 && (
          <ul role="alert" className="space-y-1 rounded-md border border-rojo/40 p-3 text-sm">
            {notices.map((n) => (
              <li key={n}>{n}</li>
            ))}
          </ul>
        )}

        {/* PASO 1 */}
        <section id={`${id}-step-1`} aria-label="Paso 1: tus datos" className="scroll-mt-40 rounded-xl border border-azul/15 p-4 sm:p-6">
          <StepHeader n={1} title="Tus datos" done={maxStep > 1} open={step === 1} onEdit={() => go(1)} />
          {step === 1 ? (
            <form
              className="mt-5 grid gap-4 sm:grid-cols-2"
              onSubmit={(e) => {
                e.preventDefault();
                if (validateCustomer()) go(2);
              }}
              noValidate
            >
              <div className="sm:col-span-2">
                <Field id={`${id}-email`} label="Mail" error={errors.email}>
                  <input id={`${id}-email`} type="email" autoComplete="email" className={input} value={customer.email} onChange={(e) => setCustomer({ ...customer, email: e.target.value })} {...err("email")} />
                </Field>
              </div>
              <Field id={`${id}-firstName`} label="Nombre" error={errors.firstName}>
                <input id={`${id}-firstName`} autoComplete="given-name" className={input} value={customer.firstName} onChange={(e) => setCustomer({ ...customer, firstName: e.target.value })} {...err("firstName")} />
              </Field>
              <Field id={`${id}-lastName`} label="Apellido" error={errors.lastName}>
                <input id={`${id}-lastName`} autoComplete="family-name" className={input} value={customer.lastName} onChange={(e) => setCustomer({ ...customer, lastName: e.target.value })} {...err("lastName")} />
              </Field>
              <Field id={`${id}-dni`} label="DNI" error={errors.dni}>
                <input id={`${id}-dni`} inputMode="numeric" className={input} value={customer.dni} onChange={(e) => setCustomer({ ...customer, dni: e.target.value })} {...err("dni")} />
              </Field>
              <Field id={`${id}-phone`} label="Teléfono (con característica)" error={errors.phone}>
                <input id={`${id}-phone`} type="tel" autoComplete="tel" placeholder="2657 123456" className={input} value={customer.phone} onChange={(e) => setCustomer({ ...customer, phone: e.target.value })} {...err("phone")} />
              </Field>
              <label className="flex items-start gap-2 text-sm sm:col-span-2">
                <input type="checkbox" checked={createAccount} onChange={(e) => setCreateAccount(e.target.checked)} className="mt-0.5 size-5 accent-azul" />
                Crear mi cuenta con estos datos para seguir mis pedidos
              </label>
              <button type="submit" className="h-12 rounded-md bg-rojo text-base font-bold uppercase text-blanco sm:col-span-2">
                Continuar
              </button>
            </form>
          ) : (
            maxStep > 1 && (
              <p className="mt-3 text-sm">
                {customer.firstName} {customer.lastName} · {customer.email} · DNI {customer.dni}
              </p>
            )
          )}
        </section>

        {/* PASO 2 */}
        <section id={`${id}-step-2`} aria-label="Paso 2: entrega" className="scroll-mt-40 rounded-xl border border-azul/15 p-4 sm:p-6">
          <StepHeader n={2} title="Entrega" done={maxStep > 2} open={step === 2} onEdit={() => go(2)} />
          {step === 2 ? (
            <div className="mt-5 space-y-5">
              <ShippingQuoter request={{ items: items.map((i) => ({ variantId: i.variantId, qty: i.qty })) }} selectable onQuote={setQuote} compact />
              {errors.shipping && <p className="text-sm font-semibold text-rojo">{errors.shipping}</p>}

              {option?.service === "domicilio" && (
                <fieldset className="grid gap-4 sm:grid-cols-6">
                  <legend className="mb-3 text-base font-bold">¿A dónde te lo mandamos?</legend>
                  <div className="sm:col-span-4">
                    <Field id={`${id}-street`} label="Calle" error={errors.street}>
                      <input id={`${id}-street`} autoComplete="address-line1" className={input} value={address.street} onChange={(e) => setAddress({ ...address, street: e.target.value })} {...err("street")} />
                    </Field>
                  </div>
                  <div className="sm:col-span-2">
                    <Field id={`${id}-number`} label="Altura" error={errors.number}>
                      <input id={`${id}-number`} inputMode="numeric" className={input} value={address.number} onChange={(e) => setAddress({ ...address, number: e.target.value })} {...err("number")} />
                    </Field>
                  </div>
                  <div className="sm:col-span-2">
                    <Field id={`${id}-floor`} label="Piso / Depto (opcional)">
                      <input id={`${id}-floor`} autoComplete="address-line2" className={input} value={address.floor} onChange={(e) => setAddress({ ...address, floor: e.target.value })} />
                    </Field>
                  </div>
                  <div className="sm:col-span-2">
                    <Field id={`${id}-city`} label="Localidad" error={errors.city}>
                      <input id={`${id}-city`} autoComplete="address-level2" className={input} value={address.city} onChange={(e) => setAddress({ ...address, city: e.target.value })} {...err("city")} />
                    </Field>
                  </div>
                  <div className="sm:col-span-2">
                    <Field id={`${id}-province`} label="Provincia">
                      <select id={`${id}-province`} autoComplete="address-level1" className={input} value={address.province} onChange={(e) => setAddress({ ...address, province: e.target.value })}>
                        {PROVINCES.map((p) => (
                          <option key={p}>{p}</option>
                        ))}
                      </select>
                    </Field>
                  </div>
                  <p className="text-sm text-gris-tinta sm:col-span-6">Código postal: {prefs.cp}</p>
                </fieldset>
              )}

              {option?.service === "sucursal" && option.branches && option.branches.length > 0 && (
                <Field id={`${id}-branch`} label="Elegí la sucursal" error={errors.branch}>
                  <select id={`${id}-branch`} className={input} value={branchId} onChange={(e) => setBranchId(e.target.value)} {...err("branch")}>
                    <option value="">Elegí una sucursal</option>
                    {option.branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name} · {b.address}
                      </option>
                    ))}
                  </select>
                </Field>
              )}

              {option?.service === "retiro" && (
                <p className="rounded-md border border-azul/15 p-3 text-sm">
                  Retirás gratis en <strong>{storeAddress}</strong>. Te avisamos por mail cuando esté listo. Traé tu DNI.
                </p>
              )}

              <button
                type="button"
                onClick={() => validateDelivery() && go(3)}
                className="h-12 w-full rounded-md bg-rojo text-base font-bold uppercase text-blanco"
              >
                Continuar al pago
              </button>
            </div>
          ) : (
            maxStep > 2 &&
            option && (
              <p className="mt-3 text-sm">
                {option.label}
                {option.service === "domicilio" && ` · ${address.street} ${address.number}, ${address.city}`}
                {option.service === "sucursal" && option.branches?.find((b) => b.id === branchId) && ` · ${option.branches.find((b) => b.id === branchId)!.name}`}
              </p>
            )
          )}
        </section>

        {/* PASO 3 */}
        <section id={`${id}-step-3`} aria-label="Paso 3: pago" className="scroll-mt-40 rounded-xl border border-azul/15 p-4 sm:p-6">
          <StepHeader n={3} title="Pago" done={false} open={step === 3} onEdit={() => go(3)} />
          {step === 3 && (
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
                <legend className="mb-2 text-sm font-semibold">Elegí tu tarjeta (crédito o débito)</legend>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {BRANDS.map((b) => (
                    <label
                      key={b.id}
                      className="flex min-h-12 cursor-pointer items-center justify-center rounded-md border border-azul/25 px-2 text-center text-sm font-semibold has-[:checked]:border-azul has-[:checked]:bg-azul has-[:checked]:text-blanco"
                    >
                      <input
                        type="radio"
                        name="brand"
                        value={b.id}
                        checked={brand === b.id}
                        onChange={() => {
                          setBrand(b.id);
                          setInstallments(1);
                        }}
                        className="sr-only"
                      />
                      {b.label}
                    </label>
                  ))}
                </div>
              </fieldset>

              {brand && (
                <fieldset>
                  <legend className="mb-2 text-sm font-semibold">Cuotas</legend>
                  <div className="space-y-2">
                    {plans.map((p) => (
                      <label
                        key={p.installments}
                        className="flex min-h-12 cursor-pointer items-center justify-between gap-3 rounded-md border border-azul/20 px-3 has-[:checked]:border-azul has-[:checked]:ring-1 has-[:checked]:ring-azul"
                      >
                        <span className="flex items-center gap-3">
                          <input type="radio" name="installments" checked={plan.installments === p.installments} onChange={() => setInstallments(p.installments)} className="size-4 accent-azul" />
                          <span className="text-sm">
                            {p.installments === 1 ? "1 pago" : `${p.installments} cuotas`}
                            {p.installments > 1 && <strong className="ml-1 font-bold">sin interés</strong>}
                          </span>
                        </span>
                        <span className="text-sm font-bold">
                          {p.installments > 1 ? `${p.installments} × ${formatPrice(Math.ceil(total / p.installments))}` : formatPrice(total)}
                        </span>
                      </label>
                    ))}
                  </div>
                </fieldset>
              )}

              {/* Datos de la tarjeta: se tokenizan en el navegador; los inputs no tienen `name` para que nunca se envíen en un form */}
              <fieldset className="grid gap-4 sm:grid-cols-6">
                <legend className="mb-3 text-sm font-semibold">Datos de la tarjeta</legend>
                <div className="sm:col-span-6">
                  <label htmlFor={`${id}-cc`} className={labelCls}>
                    Número de tarjeta
                  </label>
                  <input
                    id={`${id}-cc`}
                    inputMode="numeric"
                    autoComplete="cc-number"
                    className={input}
                    value={card.number}
                    onChange={(e) => {
                      const v = e.target.value.replace(/[^\d ]/g, "").slice(0, 23);
                      setCard({ ...card, number: v });
                      const detected = detectBrand(v);
                      if (detected && !brand) setBrand(detected);
                    }}
                    placeholder="0000 0000 0000 0000"
                  />
                </div>
                <div className="sm:col-span-6">
                  <label htmlFor={`${id}-ccname`} className={labelCls}>
                    Nombre como figura en la tarjeta
                  </label>
                  <input id={`${id}-ccname`} autoComplete="cc-name" className={input} value={card.holderName} onChange={(e) => setCard({ ...card, holderName: e.target.value })} />
                </div>
                <div className="sm:col-span-2">
                  <span className={labelCls}>Vencimiento</span>
                  <div className="flex gap-2">
                    <input aria-label="Mes de vencimiento (MM)" inputMode="numeric" autoComplete="cc-exp-month" placeholder="MM" maxLength={2} className={input} value={card.expMonth} onChange={(e) => setCard({ ...card, expMonth: e.target.value.replace(/\D/g, "") })} />
                    <input aria-label="Año de vencimiento (AA)" inputMode="numeric" autoComplete="cc-exp-year" placeholder="AA" maxLength={2} className={input} value={card.expYear} onChange={(e) => setCard({ ...card, expYear: e.target.value.replace(/\D/g, "") })} />
                  </div>
                </div>
                <div className="sm:col-span-2">
                  <label htmlFor={`${id}-cvv`} className={labelCls}>
                    Código de seguridad
                  </label>
                  <input id={`${id}-cvv`} inputMode="numeric" autoComplete="cc-csc" maxLength={4} className={input} value={card.cvv} onChange={(e) => setCard({ ...card, cvv: e.target.value.replace(/\D/g, "") })} />
                </div>
                <div className="sm:col-span-2">
                  <label htmlFor={`${id}-ccdni`} className={labelCls}>
                    DNI del titular
                  </label>
                  <input id={`${id}-ccdni`} inputMode="numeric" className={input} value={card.holderDni} onChange={(e) => setCard({ ...card, holderDni: e.target.value })} placeholder={customer.dni} />
                </div>
              </fieldset>

              {process.env.NEXT_PUBLIC_PAYMENT_PROVIDER !== "payway" && (
                <p className="rounded-md border border-dashed border-azul/30 p-3 text-xs">
                  <strong>Modo de prueba:</strong> usá cualquier número. Terminado en <strong>0002</strong> se rechaza; en <strong>0003</strong> queda pendiente; cualquier otro se aprueba.
                </p>
              )}

              {payError && (
                <p role="alert" className="rounded-md border border-rojo p-3 text-sm font-semibold text-rojo">
                  {payError}
                  {pendingOrder && <span className="block font-normal text-azul">Tu pedido {pendingOrder.number} quedó guardado. Podés reintentar con otra tarjeta.</span>}
                </p>
              )}

              <button type="submit" disabled={submitting} className="h-14 w-full rounded-md bg-rojo text-base font-bold uppercase tracking-wide text-blanco disabled:opacity-60">
                {submitting ? "Procesando…" : pendingOrder ? `Reintentar pago · ${formatPrice(total)}` : `Pagar ${formatPrice(total)}`}
              </button>
              <p className="text-center text-xs italic text-gris-tinta">Pago seguro con Payway. No guardamos los datos de tu tarjeta.</p>
            </form>
          )}
        </section>
      </div>

      {/* RESUMEN */}
      <aside aria-label="Resumen del pedido" className="rounded-xl border border-azul/15 p-4 sm:p-6 lg:sticky lg:top-44">
        <h2 className="text-lg font-bold uppercase">Tu pedido</h2>
        <ul className="mt-4 space-y-3">
          {items.map((i) => (
            <li key={i.variantId} className="flex gap-3">
              <span className="relative size-16 shrink-0 overflow-hidden rounded-md border border-azul/10">
                {i.image && <Image src={i.image} alt="" fill sizes="64px" className="object-contain" />}
                <span className="absolute right-0.5 top-0.5 flex size-5 items-center justify-center rounded-full bg-azul text-[11px] font-bold text-blanco">{i.qty}</span>
              </span>
              <span className="min-w-0 flex-1 text-sm">
                <span className="block font-semibold leading-tight">{i.name}</span>
                <span className="text-xs text-gris-tinta">
                  {i.colorName} · Talle {i.size}
                </span>
              </span>
              <span className="text-sm font-semibold">{formatPrice(i.price * i.qty)}</span>
            </li>
          ))}
        </ul>

        <form
          className="mt-5 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            void applyCoupon();
          }}
        >
          <label htmlFor={`${id}-coupon`} className="sr-only">
            Cupón de descuento
          </label>
          <input id={`${id}-coupon`} value={couponDraft} onChange={(e) => setCouponDraft(e.target.value)} placeholder="Cupón de descuento" disabled={!!pendingOrder} className="h-11 min-w-0 flex-1 rounded-md border border-azul/30 px-3 text-sm uppercase" />
          <button type="submit" disabled={!!pendingOrder} className="h-11 rounded-md border-2 border-azul px-3 text-sm font-bold uppercase disabled:opacity-50">
            Aplicar
          </button>
        </form>
        {couponMsg && <p className="mt-1 text-xs font-semibold">{couponMsg}</p>}

        <dl className="mt-5 space-y-1.5 border-t border-azul/10 pt-4 text-sm">
          <div className="flex justify-between">
            <dt>Subtotal</dt>
            <dd>{formatPrice(subtotal)}</dd>
          </div>
          {discount > 0 && (
            <div className="flex justify-between">
              <dt>Descuento ({coupon?.code})</dt>
              <dd>-{formatPrice(discount)}</dd>
            </div>
          )}
          <div className="flex justify-between">
            <dt>Envío</dt>
            <dd>{option ? (option.price === 0 ? "Gratis" : formatPrice(option.price)) : <span className="text-gris-tinta">A definir</span>}</dd>
          </div>
          <div className="flex items-baseline justify-between pt-2 text-base">
            <dt className="font-bold uppercase">Total</dt>
            <dd className="text-2xl font-bold">{formatPrice(total)}</dd>
          </div>
          {plan.installments > 1 && (
            <p className="text-right text-sm font-medium">
              {plan.installments} cuotas sin interés de {formatPrice(Math.ceil(total / plan.installments))}
            </p>
          )}
        </dl>
      </aside>
    </div>
  );
}
