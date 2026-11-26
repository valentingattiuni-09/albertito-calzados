/**
 * FASE A (solo lectura): con DATA_SOURCE=backoffice las compras están apagadas hasta la fase B,
 * para que nadie pueda comprar contra pedidos de prueba en memoria.
 */
export const CHECKOUT_CLOSED_MESSAGE = "Las compras online se habilitan muy pronto. Mientras tanto, escribinos por WhatsApp y te ayudamos con tu pedido.";

/** 503 con el mensaje, para las rutas de checkout, pago, cupón y cotización de envío. */
export function checkoutClosedResponse(): Response {
  return new Response(JSON.stringify({ ok: false, code: "CHECKOUT_CLOSED", message: CHECKOUT_CLOSED_MESSAGE }), {
    status: 503,
    headers: { "Content-Type": "application/json", "Retry-After": "86400", "Cache-Control": "no-store" },
  });
}

/** true = se puede comprar. Con el back office, recién en la fase B. */
export const checkoutEnabled = (backoffice: boolean) => !backoffice;
