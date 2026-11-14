import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/admin/auth";
import { getOrderAdmin } from "@/lib/admin/repo";
import { formatPrice, whatsappLink } from "@/lib/format";
import { OrderStatusForm } from "./OrderStatusForm";

// Panel: depende de la sesión, la navegación puede esperar al servidor
export const instant = false;

export const metadata: Metadata = { title: "Pedido" };

export default async function OrderDetailPage({ params }: PageProps<"/admin/pedidos/[numero]">) {
  await requireAdmin();
  const { numero } = await params;
  const o = await getOrderAdmin(numero);
  if (!o) notFound();
  const s = o.shipping;
  const phone = o.customer.phone.replace(/\D/g, "");

  return (
    <div className="max-w-4xl space-y-6">
      <Link href="/admin/pedidos" className="text-sm underline">
        ← Pedidos
      </Link>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="text-2xl font-bold uppercase">Pedido {o.number}</h1>
        <p className="text-sm text-gris-tinta">{new Date(o.createdAt).toLocaleString("es-AR", { timeZone: "America/Argentina/Buenos_Aires" })}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <section className="rounded-xl border border-azul/15 p-4">
          <h2 className="mb-2 font-bold uppercase">Cliente</h2>
          <p className="font-semibold">
            {o.customer.firstName} {o.customer.lastName}
          </p>
          <p className="text-sm">DNI {o.customer.dni}</p>
          <p className="text-sm">
            <a href={`mailto:${o.customer.email}`} className="underline">
              {o.customer.email}
            </a>
          </p>
          <p className="text-sm">
            {o.customer.phone} ·{" "}
            <a
              href={whatsappLink(phone.startsWith("54") ? phone : `549${phone}`, `¡Hola ${o.customer.firstName}! Te escribimos de Albertito Calzados por tu pedido ${o.number}.`)}
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold underline"
            >
              WhatsApp
            </a>
          </p>
        </section>
        <section className="rounded-xl border border-azul/15 p-4">
          <h2 className="mb-2 font-bold uppercase">Entrega</h2>
          <p className="font-semibold">{s.label}</p>
          {s.address && (
            <p className="text-sm">
              {s.address.street} {s.address.number}
              {s.address.floor ? `, ${s.address.floor}` : ""} · {s.address.city}, {s.address.province} ({s.address.cp})
            </p>
          )}
          {s.branch && (
            <p className="text-sm">
              {s.branch.name} · {s.branch.address}
            </p>
          )}
          <p className="text-sm">Costo: {s.cost === 0 ? "Gratis" : formatPrice(s.cost)}</p>
          {o.trackingCode && <p className="text-sm">Seguimiento: <strong>{o.trackingCode}</strong></p>}
        </section>
      </div>

      <section className="rounded-xl border border-azul/15 p-4">
        <h2 className="mb-2 font-bold uppercase">Productos</h2>
        <ul className="divide-y divide-azul/10">
          {o.items.map((i) => (
            <li key={i.sku} className="flex items-center gap-3 py-2">
              <span className="relative size-14 shrink-0 overflow-hidden rounded border border-azul/10">
                {i.imageUrl && <Image src={i.imageUrl} alt="" fill sizes="56px" className="object-contain" />}
              </span>
              <span className="min-w-0 flex-1 text-sm">
                <span className="block font-semibold">{i.name}</span>
                <span className="text-xs text-gris-tinta">
                  {i.colorName} · Talle {i.size} · SKU {i.sku}
                </span>
              </span>
              <span className="text-sm">× {i.qty}</span>
              <span className="w-24 text-right text-sm font-semibold">{formatPrice(i.unitPrice * i.qty)}</span>
            </li>
          ))}
        </ul>
        <dl className="mt-3 space-y-1 border-t border-azul/10 pt-3 text-sm">
          <div className="flex justify-between">
            <dt>Subtotal</dt>
            <dd>{formatPrice(o.subtotal)}</dd>
          </div>
          {o.discount > 0 && (
            <div className="flex justify-between">
              <dt>Descuento {o.couponCode}</dt>
              <dd>-{formatPrice(o.discount)}</dd>
            </div>
          )}
          <div className="flex justify-between">
            <dt>Envío</dt>
            <dd>{formatPrice(s.cost)}</dd>
          </div>
          <div className="flex justify-between text-base font-bold">
            <dt>Total</dt>
            <dd>{formatPrice(o.total)}</dd>
          </div>
          <p className="text-xs text-gris-tinta">
            Pago {o.paymentStatus}
            {o.lastPayment && ` · ${o.lastPayment.cardBrand ?? ""} ${o.lastPayment.installments > 1 ? `${o.lastPayment.installments} cuotas sin interés` : "1 pago"}`}
          </p>
        </dl>
      </section>

      <OrderStatusForm id={o.id} status={o.status} trackingCode={o.trackingCode} />
    </div>
  );
}
