"use server";

import { redirect } from "next/navigation";
import { isBackoffice } from "@/lib/backoffice/source";
import { boTrack } from "@/lib/backoffice/checkout";
import { errorAction } from "@/lib/backoffice/checkout-map";
import { getOrderByNumberUnsafe } from "@/lib/orders/orders";

/** Con el back office, el seguimiento muestra la vista reducida en la misma página (sin precios por línea, dirección ni datos personales) */
export type TrackSummary = { number: string; status: string; label: string; createdAt: string; items: string[]; total: number; delivery: string; tracking: string | null };
export type TrackState = { ok: false; message: string } | { ok: true; order: TrackSummary } | null;

const STATUS_LABEL: Record<string, string> = { pendiente: "Pendiente de pago", pagado: "Pagado: lo estamos preparando", en_revision: "En revisión: te escribimos dentro de las 24 h hábiles", enviado: "Enviado", entregado: "Entregado", cancelado: "Cancelado" };

/** "Seguí tu pedido": con número + mail lleva al detalle del pedido (sin cuenta). */
export async function trackOrder(_prev: TrackState, f: FormData): Promise<TrackState> {
  const number = String(f.get("number") ?? "").trim().toUpperCase().slice(0, 20);
  const email = String(f.get("email") ?? "").trim().toLowerCase().slice(0, 120);
  if (!/^ALB-\d{6}$/.test(number)) return { ok: false, message: "El número de pedido es como ALB-001234. Lo tenés en el mail de confirmación." };
  if (!email) return { ok: false, message: "Escribí el mail con el que compraste." };

  if (isBackoffice()) {
    const res = await boTrack(number, email);
    if (res.status === 404) return { ok: false, message: "No encontramos un pedido con ese número y ese mail. Revisá los datos o escribinos por WhatsApp." };
    if (res.status !== 200) return { ok: false, message: errorAction(res.body, res.status).message };
    const o = res.body;
    return {
      ok: true,
      order: {
        number: o.number,
        status: o.storeStatus,
        label: STATUS_LABEL[o.storeStatus] ?? o.storeStatus,
        createdAt: o.createdAt,
        items: o.items.map((i) => `${i.brandName} ${i.productName} · talle ${i.size} · ${i.color}${i.quantity > 1 ? ` (x${i.quantity})` : ""}`),
        total: Math.round(o.totalCents / 100),
        delivery: o.delivery.label,
        tracking: o.shipment?.trackingCode ? `${o.shipment.carrier ?? "Seguimiento"}: ${o.shipment.trackingCode}` : null,
      },
    };
  }
  const order = await getOrderByNumberUnsafe(number);
  // Mismo mensaje si no existe o si el mail no coincide: no revela qué pedidos existen
  if (!order || order.customer.email.toLowerCase() !== email) {
    return { ok: false, message: "No encontramos un pedido con ese número y ese mail. Revisá los datos o escribinos por WhatsApp." };
  }
  redirect(`/checkout/confirmacion/${order.number}?t=${order.accessToken}`);
}
