import { PaymentLogo } from "@/components/ui/PaymentLogo";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PurchaseTracker } from "@/components/analytics/PurchaseTracker";
import { getSettings } from "@/lib/data/layout";
import { formatPrice, whatsappLink } from "@/lib/format";
import { readReceipt } from "@/lib/orders/demo-receipt";
import { getOrder } from "@/lib/orders/orders";
import { hasSupabase } from "@/lib/supabase/clients";

export const metadata: Metadata = { title: "Pedido confirmado", robots: { index: false } };

const BRAND_LABEL: Record<string, string> = {
  visa: "Visa",
  master: "Mastercard",
  naranja: "Naranja",
  tarjeta_verde: "Tarjeta Verde",
  visa_debito: "Visa Débito",
  master_debito: "Débito Mastercard",
};

export default async function ConfirmationPage({ params, searchParams }: PageProps<"/checkout/confirmacion/[numero]">) {
  const [{ numero }, sp, settings] = await Promise.all([params, searchParams, getSettings()]);
  const token = typeof sp.t === "string" ? sp.t : "";
  // Modo demo: si esta instancia no tiene el pedido en memoria, se usa el comprobante firmado
  const order = (await getOrder(numero, token)) ?? (!hasSupabase && typeof sp.r === "string" ? readReceipt(sp.r, numero) : null);
  if (!order) notFound();

  const pending = order.paymentStatus === "pendiente";
  const s = order.shipping;

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 lg:px-6">
      {order.paymentStatus === "aprobado" && (
        <PurchaseTracker
          order={{
            number: order.number,
            total: order.total,
            shipping: s.cost,
            items: order.items.map((i) => ({ sku: i.sku, name: i.name, price: i.unitPrice, qty: i.qty })),
          }}
        />
      )}
      <div className={`rounded-xl p-6 text-blanco sm:p-8 ${pending ? "bg-azul" : "bg-rojo"}`}>
        <p className="text-sm font-semibold uppercase tracking-[0.2em]">Pedido {order.number}</p>
        <h1 className="mt-2 font-campana text-3xl uppercase leading-tight sm:text-4xl">
          {pending ? "Estamos revisando tu pago" : `¡Gracias, ${order.customer.firstName}!`}
        </h1>
        <p className="mt-2 text-lg font-medium">
          {pending ? "Te avisamos por mail apenas se confirme." : "Tu compra está confirmada. Pisá fuerte."}
        </p>
      </div>

      <p className="mt-6">
        Te mandamos el detalle a <strong>{order.customer.email}</strong>.{" "}
        {s.method === "retiro" ? "Te avisamos cuando esté listo para retirar." : "Cuando despachemos te llega el número de seguimiento."}
      </p>
      {sp.cuenta === "1" && (
        <p className="mt-2 text-sm">También te vamos a mandar un mail para que crees tu cuenta y sigas tus pedidos.</p>
      )}

      <section aria-labelledby="detalle" className="mt-8 rounded-xl border border-azul/15 p-5 sm:p-6">
        <h2 id="detalle" className="text-lg font-bold uppercase">
          Detalle
        </h2>
        <ul className="mt-4 divide-y divide-azul/10">
          {order.items.map((i) => (
            <li key={i.sku} className="flex items-center gap-3 py-3">
              <span className="relative size-16 shrink-0 overflow-hidden rounded-md border border-azul/10">
                {i.imageUrl && <Image src={i.imageUrl} alt="" fill sizes="64px" className="object-contain" />}
              </span>
              <span className="min-w-0 flex-1 text-sm">
                <span className="block font-semibold">{i.name}</span>
                <span className="text-xs text-gris-tinta">
                  {i.colorName} · Talle {i.size} · {i.qty} {i.qty === 1 ? "par" : "pares"}
                </span>
              </span>
              <span className="text-sm font-semibold">{formatPrice(i.unitPrice * i.qty)}</span>
            </li>
          ))}
        </ul>

        <dl className="mt-4 space-y-1.5 border-t border-azul/10 pt-4 text-sm">
          <div className="flex justify-between">
            <dt>Subtotal</dt>
            <dd>{formatPrice(order.subtotal)}</dd>
          </div>
          {order.discount > 0 && (
            <div className="flex justify-between">
              <dt>Descuento {order.couponCode && `(${order.couponCode})`}</dt>
              <dd>-{formatPrice(order.discount)}</dd>
            </div>
          )}
          <div className="flex justify-between">
            <dt>{s.label}</dt>
            <dd>{s.cost === 0 ? "Gratis" : formatPrice(s.cost)}</dd>
          </div>
          <div className="flex justify-between pt-2 text-base font-bold">
            <dt className="uppercase">Total</dt>
            <dd className="text-xl">{formatPrice(order.total)}</dd>
          </div>
          {order.lastPayment && (
            <p className="flex flex-wrap items-center justify-end gap-x-1.5 text-right text-xs text-gris-tinta">
              <PaymentLogo
                provider={order.lastPayment.cardBrand ?? ""}
                label={BRAND_LABEL[order.lastPayment.cardBrand ?? ""] ?? "Tarjeta"}
                className="h-4"
                textClassName=""
                compact
              />{" "}
              ·{" "}
              {order.lastPayment.installments > 1
                ? `${order.lastPayment.installments} cuotas sin interés de ${formatPrice(Math.ceil(order.total / order.lastPayment.installments))}`
                : "1 pago"}
            </p>
          )}
        </dl>
      </section>

      <section aria-labelledby="entrega" className="mt-6 rounded-xl border border-azul/15 p-5 text-sm sm:p-6">
        <h2 id="entrega" className="text-lg font-bold uppercase">
          Entrega
        </h2>
        <p className="mt-3 font-semibold">{s.label}</p>
        {s.address && (
          <p>
            {s.address.street} {s.address.number}
            {s.address.floor ? `, ${s.address.floor}` : ""} · {s.address.city}, {s.address.province} ({s.address.cp})
          </p>
        )}
        {s.branch && (
          <p>
            {s.branch.name} · {s.branch.address}
          </p>
        )}
        {s.method === "retiro" && (
          <p>
            {settings.store.address}, {settings.store.city} · {settings.store.hoursDetail}
          </p>
        )}
        {s.etaDays && <p className="text-gris-tinta">Llega en {s.etaDays} días hábiles desde el despacho.</p>}
      </section>

      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Link href="/" className="flex h-12 flex-1 items-center justify-center rounded-md bg-rojo text-sm font-bold uppercase text-blanco">
          Seguir comprando
        </Link>
        <a
          href={whatsappLink(settings.whatsapp.number, `¡Hola! Tengo una consulta sobre mi pedido ${order.number}.`)}
          target="_blank"
          rel="noopener noreferrer"
          className="flex h-12 flex-1 items-center justify-center rounded-md border-2 border-azul text-sm font-bold uppercase"
        >
          Consultá por WhatsApp
        </a>
      </div>
    </div>
  );
}
