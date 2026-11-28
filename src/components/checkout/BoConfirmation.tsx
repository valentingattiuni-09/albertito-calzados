import Link from "next/link";
import { BoOrderLive } from "@/components/checkout/BoOrderLive";
import { boOrder } from "@/lib/backoffice/checkout";
import { brandLabel, isOrderNumber, type BoOrderView } from "@/lib/backoffice/checkout-map";
import { readOrderToken } from "@/lib/backoffice/order-cookie";
import { formatPrice } from "@/lib/format";

const pesos = (c: number) => formatPrice(Math.round(c / 100));

function header(o: BoOrderView): { title: string; text: string; tone: "rojo" | "azul" } {
  const rejected = o.payment?.status === "REJECTED";
  switch (o.storeStatus) {
    case "pagado":
    case "enviado":
    case "entregado":
      return { title: `¡Gracias, ${o.customer.firstName}!`, text: "Tu compra está confirmada. Pisá fuerte.", tone: "rojo" };
    case "en_revision":
      return { title: "Recibimos tu pago", text: "Estamos revisando el pedido y te escribimos dentro de las 24 h hábiles.", tone: "azul" };
    case "cancelado":
      return { title: "Tu reserva venció", text: "No recibimos el pago a tiempo y liberamos los productos. Si todavía los querés, armá el pedido de nuevo.", tone: "azul" };
    default:
      return rejected
        ? { title: "Tu pago no se aprobó", text: "No se acreditó ningún cobro. Podés probar con otra tarjeta o con Mercado Pago mientras dure la reserva.", tone: "azul" }
        : { title: "Estamos verificando tu pago", text: "Te avisamos por mail apenas se confirme. No hace falta que pagues de nuevo.", tone: "azul" };
  }
}

/** Confirmación del pedido con el back office: el token del pedido está en la cookie httpOnly (nunca en la URL). */
export async function BoConfirmation({ numero }: { numero: Promise<string> }) {
  const number = (await numero).toUpperCase();
  const token = isOrderNumber(number) ? await readOrderToken(number) : null;
  const res = token ? await boOrder(number, token) : null;
  const o = res && res.status === 200 ? res.body : null;

  if (!o) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10 lg:px-6">
        <div className="rounded-xl bg-azul p-6 text-blanco sm:p-8">
          <p className="text-sm font-semibold uppercase tracking-[0.2em]">Pedido {number}</p>
          <h1 className="mt-2 font-campana text-3xl uppercase leading-tight sm:text-4xl">No encontramos tu pedido en este dispositivo</h1>
          <p className="mt-2 text-lg font-medium">Seguilo con tu número de pedido y el mail de la compra.</p>
        </div>
        <Link href="/cuenta" className="mt-6 inline-flex h-12 items-center rounded-md bg-rojo px-6 text-sm font-bold uppercase text-blanco">
          Seguí tu pedido
        </Link>
        <BoOrderLive number={number} storeStatus={null} paymentStatus={null} purchase={null} />
      </div>
    );
  }

  const h = header(o);
  // Si la reserva ya venció, la API lo dice al reintentar (ORDER_EXPIRED) y la página de pago lo muestra
  const canRetry = o.storeStatus === "pendiente" && o.payment?.status === "REJECTED" && o.attemptsLeft > 0;
  const d = o.delivery;
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 lg:px-6">
      <div className={`rounded-xl p-6 text-blanco sm:p-8 ${h.tone === "rojo" ? "bg-rojo" : "bg-azul"}`}>
        <p className="text-sm font-semibold uppercase tracking-[0.2em]">Pedido {o.number}</p>
        <h1 className="mt-2 font-campana text-3xl uppercase leading-tight sm:text-4xl">{h.title}</h1>
        <p className="mt-2 text-lg font-medium">{h.text}</p>
      </div>

      {canRetry && (
        <Link href={`/checkout/pagar/${o.number}`} className="mt-6 inline-flex h-12 items-center rounded-md bg-rojo px-6 text-sm font-bold uppercase text-blanco">
          Probar de nuevo
        </Link>
      )}
      {o.storeStatus === "cancelado" && (
        <Link href="/" className="mt-6 inline-flex h-12 items-center rounded-md bg-rojo px-6 text-sm font-bold uppercase text-blanco">
          Ir a la tienda
        </Link>
      )}

      <BoOrderLive
        number={o.number}
        storeStatus={o.storeStatus}
        paymentStatus={o.payment?.status ?? null}
        purchase={{ total: Math.round(o.totalCents / 100), shipping: Math.round(o.shippingCents / 100), items: o.items.map((i) => ({ sku: i.sku, name: `${i.brandName} ${i.productName}`, price: Math.round(i.unitPriceCents / 100), qty: i.quantity })) }}
      />

      <section aria-labelledby="detalle" className="mt-8 rounded-xl border border-azul/15 p-5 sm:p-6">
        <h2 id="detalle" className="text-lg font-bold uppercase">
          Tu pedido
        </h2>
        <ul className="mt-4 space-y-2 text-sm">
          {o.items.map((i) => (
            <li key={`${i.variantId}`} className="flex justify-between gap-3">
              <span>
                <span className="font-semibold">
                  {i.brandName} {i.productName}
                </span>
                <span className="block text-xs text-gris-tinta">
                  {i.color} · Talle {i.size} · {i.quantity} {i.quantity === 1 ? "par" : "pares"}
                </span>
              </span>
              <span className="font-semibold">{pesos(i.lineTotalCents)}</span>
            </li>
          ))}
        </ul>
        <dl className="mt-4 space-y-1 border-t border-azul/10 pt-3 text-sm">
          <div className="flex justify-between">
            <dt>{d.label}</dt>
            <dd>{o.shippingCents ? pesos(o.shippingCents) : "Gratis"}</dd>
          </div>
          <div className="flex justify-between text-base font-bold">
            <dt>Total</dt>
            <dd>{pesos(o.totalCents)}</dd>
          </div>
          {o.payment?.status === "APPROVED" && (
            <div className="flex justify-between text-gris-tinta">
              <dt>Pago</dt>
              <dd>
                {o.payment.method === "MERCADOPAGO" ? "Mercado Pago" : brandLabel(o.payment.cardBrand)}
                {o.payment.last4 ? ` terminada en ${o.payment.last4}` : ""}
                {o.payment.installments && o.payment.installments > 1 ? ` · ${o.payment.installments} cuotas` : ""}
              </dd>
            </div>
          )}
        </dl>
        <p className="mt-4 text-sm">
          {d.method === "PICKUP"
            ? `Retirás en el local: ${[d.address?.street, d.address?.number, d.address?.city].filter(Boolean).join(" ")}. Te avisamos cuando esté listo. Traé tu DNI.`
            : d.method === "BRANCH" && d.branch
              ? `Retirás en la sucursal ${d.branch.name}: ${d.branch.address}, ${d.branch.city}.`
              : d.address
                ? `Te lo mandamos a ${d.address.street} ${d.address.number}${d.address.apartment ? ` ${d.address.apartment}` : ""}, ${d.address.city}.`
                : ""}
        </p>
        <p className="mt-2 text-xs text-gris-tinta">Te mandamos el detalle a {o.customer.email}. Guardá el número de pedido: con él y tu mail lo seguís en «Seguí tu pedido».</p>
      </section>
    </div>
  );
}
