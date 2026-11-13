import Link from "next/link";
import { ADMIN_SECTIONS } from "@/components/admin/sections";
import { requireAdmin } from "@/lib/admin/auth";
import { listOrders, listProducts, listSubscribers } from "@/lib/admin/repo";
import { formatPrice } from "@/lib/format";

// Panel: depende de la sesión, la navegación puede esperar al servidor
export const instant = false;

export default async function AdminHome() {
  // Cada página verifica el acceso: layout y página se renderizan en paralelo
  await requireAdmin();
  const [orders, products, subs] = await Promise.all([listOrders(), listProducts(), listSubscribers()]);
  const paid = orders.filter((o) => o.status === "pagado");
  const today = new Date().toISOString().slice(0, 10);
  const salesToday = orders.filter((o) => o.paymentStatus === "aprobado" && o.createdAt.slice(0, 10) === today).reduce((n, o) => n + o.total, 0);
  const noStock = products.filter((p) => p.active && p.stock === 0).length;

  const cards = [
    { label: "Para preparar", value: String(paid.length), href: "/admin/pedidos?estado=pagado", hint: "Pedidos pagados sin enviar" },
    { label: "Vendido hoy", value: formatPrice(salesToday), href: "/admin/pedidos", hint: "Pagos aprobados" },
    { label: "Sin stock", value: String(noStock), href: "/admin/productos?filtro=sin-stock", hint: "Productos activos agotados" },
    { label: "Suscriptores", value: String(subs.length), href: "/admin/newsletter", hint: "Newsletter" },
  ];

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold uppercase">Hola 👋</h1>
      <ul className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {cards.map((c) => (
          <li key={c.label}>
            <Link href={c.href} className="block rounded-xl border border-azul/15 p-4 hover:border-azul">
              <span className="text-xs font-bold uppercase tracking-[0.15em] text-gris-tinta">{c.label}</span>
              <span className="mt-1 block text-2xl font-bold">{c.value}</span>
              <span className="text-xs text-gris-tinta">{c.hint}</span>
            </Link>
          </li>
        ))}
      </ul>

      <section>
        <h2 className="mb-3 text-lg font-bold uppercase">¿Qué querés cambiar?</h2>
        <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {ADMIN_SECTIONS.filter((s) => s.href !== "/admin").map((s) => (
            <li key={s.href}>
              <Link href={s.href} className="flex min-h-14 items-center rounded-lg border border-azul/15 px-4 font-semibold hover:border-azul">
                {s.label}
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
