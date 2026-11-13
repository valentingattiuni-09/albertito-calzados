import type { Metadata } from "next";
import { requireAdmin } from "@/lib/admin/auth";
import { listProducts } from "@/lib/admin/repo";
import { OffersManager } from "./OffersManager";

// Panel: depende de la sesión, la navegación puede esperar al servidor
export const instant = false;

export const metadata: Metadata = { title: "Ofertas" };

export default async function OffersPage() {
  await requireAdmin();
  const products = (await listProducts()).filter((p) => p.active);
  return (
    <div className="max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold uppercase">Ofertas</h1>
        <p className="mt-1 text-sm text-gris-tinta">Los productos en oferta aparecen en /ofertas y en el carrusel del home, con el precio tachado y el % de descuento.</p>
      </div>
      <OffersManager products={products} />
    </div>
  );
}
