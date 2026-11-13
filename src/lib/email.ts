import "server-only";
import type { OrderView } from "@/lib/orders/orders";
import { formatPrice } from "@/lib/format";

/**
 * Mails transaccionales. Con RESEND_API_KEY y EMAIL_FROM configurados se envían por Resend;
 * si no, se escriben en el log del servidor (modo prueba).
 */
async function send(to: string, subject: string, html: string) {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!key || !from) {
    console.info(`[mail:prueba] para ${to} · ${subject}`);
    return;
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to, subject, html }),
  });
  if (!res.ok) console.error("[mail]", res.status, await res.text().catch(() => ""));
}

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

export async function sendOrderConfirmation(order: OrderView, siteUrl: string) {
  const link = `${siteUrl}/checkout/confirmacion/${order.number}?t=${order.accessToken}`;
  const rows = order.items
    .map((i) => `<tr><td>${esc(i.name)} · ${esc(i.colorName ?? "")} · talle ${esc(i.size)} × ${i.qty}</td><td align="right">${formatPrice(i.unitPrice * i.qty)}</td></tr>`)
    .join("");
  const html = `
  <div style="font-family:Arial,sans-serif;color:#213681;max-width:560px">
    <div style="background:#E93136;color:#fff;padding:20px;font-size:20px;font-weight:bold">¡Gracias por tu compra, ${esc(order.customer.firstName)}!</div>
    <p>Tu pedido <strong>${order.number}</strong> está confirmado. Te avisamos cuando salga.</p>
    <table width="100%" cellpadding="6" style="border-collapse:collapse">${rows}
      <tr><td>Envío: ${esc(order.shipping.label)}</td><td align="right">${order.shipping.cost ? formatPrice(order.shipping.cost) : "Gratis"}</td></tr>
      ${order.discount ? `<tr><td>Descuento</td><td align="right">-${formatPrice(order.discount)}</td></tr>` : ""}
      <tr><td><strong>Total</strong></td><td align="right"><strong>${formatPrice(order.total)}</strong></td></tr>
    </table>
    <p><a href="${link}" style="color:#213681">Ver tu pedido</a></p>
    <p style="color:#5B6478;font-size:12px">Albertito Calzados · Edison 15, Villa Mercedes · Pisá fuerte. Caminá feliz.</p>
  </div>`;
  await send(order.customer.email, `Pedido ${order.number} confirmado · Albertito Calzados`, html);
}

/** Constancia del botón de arrepentimiento: al cliente y copia al local. */
export async function sendWithdrawalConfirmation(
  req: { code: string; firstName: string; email: string; orderNumber: string | null },
  storeEmail: string | null,
) {
  const html = `
  <div style="font-family:Arial,sans-serif;color:#213681;max-width:560px">
    <p>Hola ${esc(req.firstName)}:</p>
    <p>Recibimos tu solicitud de arrepentimiento${req.orderNumber ? ` del pedido <strong>${esc(req.orderNumber)}</strong>` : ""}.</p>
    <p>Tu código de trámite es <strong>${esc(req.code)}</strong>. Te contactamos dentro de las 24 h hábiles para coordinar la devolución.</p>
    <p style="color:#5B6478;font-size:12px">Albertito Calzados · Pisá fuerte. Caminá feliz.</p>
  </div>`;
  await send(req.email, `Arrepentimiento ${req.code} · Albertito Calzados`, html);
  if (storeEmail) await send(storeEmail, `Nueva solicitud de arrepentimiento ${req.code}`, html);
}
