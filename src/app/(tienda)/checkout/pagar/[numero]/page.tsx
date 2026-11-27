import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound, redirect } from "next/navigation";
import { BoPayAgain } from "@/components/checkout/BoPayAgain";
import { boOrder } from "@/lib/backoffice/checkout";
import { isOrderNumber } from "@/lib/backoffice/checkout-map";
import { readOrderToken } from "@/lib/backoffice/order-cookie";
import { isBackoffice } from "@/lib/backoffice/source";
import { formatPrice } from "@/lib/format";

export const metadata: Metadata = { title: "Pagar el pedido", robots: { index: false } };

/** Reintento de pago sobre el mismo pedido (con el back office): al volver de Mercado Pago o desde el link del mail. */
export default function PayAgainPage({ params }: { params: Promise<{ numero: string }> }) {
  if (!isBackoffice()) notFound();
  // La cookie del pedido se lee en el servidor al pedir la página: dentro de Suspense (no se prerenderiza)
  return (
    <Suspense fallback={<p className="mx-auto max-w-3xl px-4 py-10 text-sm lg:px-6">Cargando tu pedido…</p>}>
      <PayAgain params={params} />
    </Suspense>
  );
}

async function PayAgain({ params }: { params: Promise<{ numero: string }> }) {
  const number = (await params).numero.toUpperCase();
  const token = isOrderNumber(number) ? await readOrderToken(number) : null;
  if (!token) redirect(`/checkout/confirmacion/${number}`);
  const res = await boOrder(number, token);
  if (res.status !== 200 || res.body.storeStatus !== "pendiente") redirect(`/checkout/confirmacion/${number}`);
  const o = res.body;
  const total = Math.round(o.totalCents / 100);
  return (
    <div className="mx-auto max-w-3xl px-4 py-6 lg:px-6">
      <h1 className="text-2xl font-bold uppercase sm:text-3xl">Pagar el pedido {o.number}</h1>
      <p className="mt-2 text-sm">
        {o.items.map((i) => `${i.productName} talle ${i.size}`).join(" · ")} · {o.delivery.label} · Total <strong>{formatPrice(total)}</strong>
      </p>
      <p className="mt-1 text-xs text-gris-tinta">Tus productos siguen reservados. Te quedan {o.attemptsLeft} {o.attemptsLeft === 1 ? "intento" : "intentos"}.</p>
      <section aria-label="Pago" className="mt-6 rounded-xl border border-azul/15 p-4 sm:p-6">
        <BoPayAgain number={o.number} total={total} />
      </section>
    </div>
  );
}
