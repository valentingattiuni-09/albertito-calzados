import type { Metadata } from "next";
import { requireAdmin } from "@/lib/admin/auth";
import { getSettings } from "@/lib/data/layout";
import { SettingsForm } from "./SettingsForm";

// Panel: depende de la sesión, la navegación puede esperar al servidor
export const instant = false;

export const metadata: Metadata = { title: "Configuración" };

export default async function SettingsPage() {
  await requireAdmin();
  const settings = await getSettings();
  return (
    <div className="max-w-3xl space-y-6">
      <h1 className="text-2xl font-bold uppercase">Configuración</h1>
      <SettingsForm settings={settings} />
    </div>
  );
}
