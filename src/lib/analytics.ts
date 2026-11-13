"use client";

/**
 * Eventos de analítica (GA4 + Meta Pixel). Si no hay IDs configurados no hace nada.
 * Nombres de GA4 estándar de ecommerce; en Meta, sus eventos estándar equivalentes.
 */
type Item = { id: string; name: string; price: number; quantity?: number; variant?: string; category?: string };

type Gtag = (...args: unknown[]) => void;
type Fbq = (...args: unknown[]) => void;
const w = () => (typeof window === "undefined" ? null : (window as unknown as { gtag?: Gtag; fbq?: Fbq }));

const ga = (name: string, params: Record<string, unknown>) => w()?.gtag?.("event", name, params);
const fb = (name: string, params: Record<string, unknown>) => w()?.fbq?.("track", name, params);

const gaItems = (items: Item[]) =>
  items.map((i) => ({ item_id: i.id, item_name: i.name, price: i.price, quantity: i.quantity ?? 1, item_variant: i.variant, item_category: i.category }));
const value = (items: Item[]) => items.reduce((n, i) => n + i.price * (i.quantity ?? 1), 0);

export const analytics = {
  viewItem(item: Item) {
    ga("view_item", { currency: "ARS", value: item.price, items: gaItems([item]) });
    fb("ViewContent", { content_ids: [item.id], content_name: item.name, content_type: "product", value: item.price, currency: "ARS" });
  },
  addToCart(item: Item) {
    ga("add_to_cart", { currency: "ARS", value: value([item]), items: gaItems([item]) });
    fb("AddToCart", { content_ids: [item.id], content_name: item.name, content_type: "product", value: value([item]), currency: "ARS" });
  },
  beginCheckout(items: Item[]) {
    ga("begin_checkout", { currency: "ARS", value: value(items), items: gaItems(items) });
    fb("InitiateCheckout", { content_ids: items.map((i) => i.id), num_items: items.length, value: value(items), currency: "ARS" });
  },
  purchase(orderNumber: string, total: number, shipping: number, items: Item[]) {
    ga("purchase", { transaction_id: orderNumber, currency: "ARS", value: total, shipping, items: gaItems(items) });
    fb("Purchase", { content_ids: items.map((i) => i.id), content_type: "product", value: total, currency: "ARS" });
  },
  subscribe(source: string) {
    ga("sign_up", { method: `newsletter_${source}` });
    fb("Lead", { content_name: `newsletter_${source}` });
  },
};
