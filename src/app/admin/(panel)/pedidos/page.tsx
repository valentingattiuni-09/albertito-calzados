import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/admin/auth";
import { listOrders } from "@/lib/admin/repo";
import { formatPrice } from "@/lib/format";

// Panel: depende de la sesión, la navegación puede esperar al servidor
export const instant = false;

export const metadata: Metadata = { title: "Pedidos" };

const STATUSES = [
  ["", "Todos"],
  ["pendiente", "Pendientes"],
  ["pagado", "Para preparar"],
  ["enviado", "Enviados"],
  ["entregado", "Entregados"],
  ["cancelado", "Cancelados"],
] as const;

const BADGE: Record<string, string> = {
  pendiente: "border border-azul/30",
  pagado: "bg-rojo text-blanco",
  enviado: "bg-azul text-blanco",
  entregado: "border border-azul text-azul",
  cancelado: "border border-gris-tinta/40 text-gris-tinta line-through",
};

export default async function OrdersPage({ searchParams }: PageProps<"/admin/pedidos">) {
  await requireAdmin();
  const sp = await searchParams;
  const status = typeof sp.estado === "string" && STATUSES.some(([k]) => k === sp.estado) ? sp.estado : "";
  const orders = await listOrders(status || undefined);

  return (
    <div className="max-w-5xl space-y-6">
      <h1 className="text-2xl font-bold uppercase">Pedidos</h1>
      <nav aria-label="Filtrar por estado" className="no-scrollbar flex gap-2 overflow-x-auto">
        {STATUSES.map(([k, label]) => (
          <Link
            key={k}
            href={k ? `/admin/pedidos?estado=${k}` : "/admin/pedidos"}
            aria-current={status === k ? "page" : undefined}
            className={`inline-flex h-10 shrink-0 items-center rounded-full border px-4 text-sm font-semibold ${status === k ? "border-azul bg-azul text-blanco" : "border-azul/25"}`}
          >
            {label}
          </Link>
        ))}
      </nav>

      {orders.length === 0 ? (
        <p className="text-sm text-gris-tinta">No hay pedidos {status ? "con ese estado" : "todavía"}.</p>
      ) : (
        <ul className="divide-y divide-azul/10 rounded-xl border border-azul/15">
          {orders.map((o) => (
            <li key={o.id}>
              <Link href={`/admin/pedidos/${o.number}`} className="flex flex-wrap items-center gap-x-4 gap-y-1 p-3 hover:bg-azul/5">
                <span className="w-28 font-bold">{o.number}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{o.customer}</span>
                  <span className="block truncate text-xs text-gris-tinta">
                    {new Date(o.createdAt).toLocaleString("es-AR", { dateStyle: "short", timeStyle: "short", timeZone: "America/Argentina/Buenos_Aires" })} · {o.items} {o.items === 1 ? "par" : "pares"} · {o.shipping}
                  </span>
                </span>
                <span className="font-semibold">{formatPrice(o.total)}</span>
                <span className={`rounded px-2 py-0.5 text-xs font-bold uppercase ${BADGE[o.status]}`}>{o.status === "pagado" ? "para preparar" : o.status}</span>
                {o.paymentStatus !== "aprobado" && <span className="text-xs font-semibold text-gris-tinta">pago {o.paymentStatus}</span>}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
