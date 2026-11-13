import type { Metadata } from "next";
import { requireAdmin } from "@/lib/admin/auth";
import { getSetting, listFallbackRates } from "@/lib/admin/repo";
import { demoSettings } from "@/lib/demo/catalog";
import type { ShippingConfig } from "@/lib/orders/live";
import { ShippingForm } from "./ShippingForm";

// Panel: depende de la sesión, la navegación puede esperar al servidor
export const instant = false;

export const metadata: Metadata = { title: "Envíos" };

export default async function ShippingPage() {
  await requireAdmin();
  const [conf, rates] = await Promise.all([getSetting<ShippingConfig>("shipping"), listFallbackRates()]);
  const config = { ...(demoSettings.shipping.value as ShippingConfig), ...(conf ?? {}) };
  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold uppercase">Envíos</h1>
        <p className="mt-1 text-sm text-gris-tinta">
          Con esto se cotiza Andreani y Correo Argentino. Las tarifas de respaldo se usan solo si las dos empresas no responden.
        </p>
      </div>
      <ShippingForm config={config} rates={rates} />
    </div>
  );
}
