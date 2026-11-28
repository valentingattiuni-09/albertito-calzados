/**
 * Fase A (solo lectura) apagaba las compras con DATA_SOURCE=backoffice. Desde la fase B se compra contra la API de la tienda: el mensaje y la respuesta
 * quedan para lo que sigue apagado (cupones, hasta la fase C).
 */
export const CHECKOUT_CLOSED_MESSAGE = "Las compras online se habilitan muy pronto. Mientras tanto, escribinos por WhatsApp y te ayudamos con tu pedido.";

/** 503 con el mensaje, para las rutas de checkout, pago, cupón y cotización de envío. */
export function checkoutClosedResponse(): Response {
  return new Response(JSON.stringify({ ok: false, code: "CHECKOUT_CLOSED", message: CHECKOUT_CLOSED_MESSAGE }), {
    status: 503,
    headers: { "Content-Type": "application/json", "Retry-After": "86400", "Cache-Control": "no-store" },
  });
}

/** true = se puede comprar. Desde la fase B, también con el back office. */
export function checkoutEnabled(backoffice: boolean): boolean {
  void backoffice;
  return true;
}

/** Cupones: con el back office llegan en la fase C */
export const COUPONS_CLOSED_MESSAGE = "Los cupones todavía no están disponibles.";
