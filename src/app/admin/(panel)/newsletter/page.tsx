import type { Metadata } from "next";
import { requireAdmin } from "@/lib/admin/auth";
import { listSubscribers } from "@/lib/admin/repo";

// Panel: depende de la sesión, la navegación puede esperar al servidor
export const instant = false;

export const metadata: Metadata = { title: "Newsletter" };

const PREF: Record<string, string> = { hombre: "Hombre", mujer: "Mujer", nino: "Niño", familia: "Toda la familia" };

export default async function NewsletterPage() {
  await requireAdmin();
  const subs = await listSubscribers();
  const counts = Object.entries(PREF).map(([k, label]) => ({ label, n: subs.filter((s) => s.preference === k).length }));

  return (
    <div className="max-w-5xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold uppercase">Newsletter</h1>
          <p className="mt-1 text-sm text-gris-tinta">{subs.length} suscriptores</p>
        </div>
        {/* Descarga directa: no es navegación de la app */}
        <a href="/api/admin/newsletter.csv" download className="inline-flex h-11 items-center rounded-md bg-rojo px-5 text-sm font-bold uppercase text-blanco">
          Descargar CSV
        </a>
      </div>

      <ul className="flex flex-wrap gap-2">
        {counts.map((c) => (
          <li key={c.label} className="rounded-full border border-azul/20 px-3 py-1 text-sm">
            {c.label}: <strong>{c.n}</strong>
          </li>
        ))}
      </ul>

      {subs.length === 0 ? (
        <p className="text-sm text-gris-tinta">Todavía no hay suscriptores.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-azul/15">
          <table className="min-w-full text-sm">
            <thead className="text-left">
              <tr className="border-b border-azul/15">
                <th className="p-3">Mail</th>
                <th className="p-3">Para quién compra</th>
                <th className="p-3">Cumpleaños</th>
                <th className="p-3">Desde</th>
                <th className="p-3">Fecha</th>
              </tr>
            </thead>
            <tbody>
              {subs.map((s) => (
                <tr key={s.id} className="border-b border-azul/10 last:border-0">
                  <td className="p-3 font-medium">{s.email}</td>
                  <td className="p-3">{s.preference ? PREF[s.preference] : "—"}</td>
                  <td className="p-3">{s.birthDate ? s.birthDate.split("-").reverse().slice(0, 2).join("/") : "—"}</td>
                  <td className="p-3">{s.source}</td>
                  <td className="p-3">{new Date(s.createdAt).toLocaleDateString("es-AR", { timeZone: "America/Argentina/Buenos_Aires" })}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
