"use server";

import { redirect } from "next/navigation";
import { getOrderByNumberUnsafe } from "@/lib/orders/orders";

export type TrackState = { ok: false; message: string } | null;

/** "Seguí tu pedido": con número + mail lleva al detalle del pedido (sin cuenta). */
export async function trackOrder(_prev: TrackState, f: FormData): Promise<TrackState> {
  const number = String(f.get("number") ?? "").trim().toUpperCase().slice(0, 20);
  const email = String(f.get("email") ?? "").trim().toLowerCase().slice(0, 120);
  if (!/^ALB-\d{6}$/.test(number)) return { ok: false, message: "El número de pedido es como ALB-001234. Lo tenés en el mail de confirmación." };
  if (!email) return { ok: false, message: "Escribí el mail con el que compraste." };

  const order = await getOrderByNumberUnsafe(number);
  // Mismo mensaje si no existe o si el mail no coincide: no revela qué pedidos existen
  if (!order || order.customer.email.toLowerCase() !== email) {
    return { ok: false, message: "No encontramos un pedido con ese número y ese mail. Revisá los datos o escribinos por WhatsApp." };
  }
  redirect(`/checkout/confirmacion/${order.number}?t=${order.accessToken}`);
}
