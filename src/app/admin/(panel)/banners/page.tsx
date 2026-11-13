import type { Metadata } from "next";
import { requireAdmin } from "@/lib/admin/auth";
import { listBanners } from "@/lib/admin/repo";
import { BannersManager } from "./BannersManager";

// Panel: depende de la sesión, la navegación puede esperar al servidor
export const instant = false;

export const metadata: Metadata = { title: "Banners" };

export default async function BannersPage() {
  await requireAdmin();
  const banners = await listBanners();
  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold uppercase">Banners del home</h1>
        <p className="mt-1 text-sm text-gris-tinta">
          Imagen desktop 1600 × 600 y mobile 800 × 800 (cuadrada). Arrastrá o usá las flechas para ordenarlos.
        </p>
      </div>
      <BannersManager banners={banners} />
    </div>
  );
}
