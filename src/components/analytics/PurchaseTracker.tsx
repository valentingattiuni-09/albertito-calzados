"use client";

import { useEffect } from "react";
import { analytics } from "@/lib/analytics";

/** Evento de compra en la confirmación (una sola vez por pedido, aunque se recargue la página). */
export function PurchaseTracker({ order }: { order: { number: string; total: number; shipping: number; items: { sku: string; name: string; price: number; qty: number }[] } }) {
  useEffect(() => {
    const key = `albertito:purchase:${order.number}`;
    try {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, "1");
    } catch {
      /* sin storage */
    }
    analytics.purchase(
      order.number,
      order.total,
      order.shipping,
      order.items.map((i) => ({ id: i.sku, name: i.name, price: i.price, quantity: i.qty })),
    );
  }, [order]);
  return null;
}
