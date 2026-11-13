import type { Metadata } from "next";
import { requireAdmin } from "@/lib/admin/auth";
import { listPromos, listTopbar } from "@/lib/admin/repo";
import { PromosManager } from "./PromosManager";

// Panel: depende de la sesión, la navegación puede esperar al servidor
export const instant = false;

export const metadata: Metadata = { title: "Cuotas y barra" };

export default async function PromosPage() {
  await requireAdmin();
  const [promos, topbar] = await Promise.all([listPromos(), listTopbar()]);
  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold uppercase">Cuotas y barra superior</h1>
        <p className="mt-1 text-sm text-gris-tinta">
          Las promos activas se ven en la barra azul, en las tarjetas de producto, en la ficha y en el checkout. Tienen que coincidir con
          los planes configurados en Payway.
        </p>
      </div>
      <PromosManager promos={promos} topbar={topbar} />
    </div>
  );
}
