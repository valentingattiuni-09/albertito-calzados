import type { Metadata } from "next";
import { Breadcrumb } from "@/components/catalog/Breadcrumb";
import { ClockIcon, InstagramIcon, PinIcon, WhatsAppIcon } from "@/components/ui/icons";
import { getSettings } from "@/lib/data/layout";
import { whatsappLink } from "@/lib/format";

export const metadata: Metadata = { title: "Contacto", description: "Escribinos por WhatsApp o pasá por el local.", alternates: { canonical: "/contacto" } };

export default async function ContactPage() {
  const { store, whatsapp } = await getSettings();
  const items = [
    { icon: <WhatsAppIcon size={22} />, label: `WhatsApp ${whatsapp.display}`, href: whatsappLink(whatsapp.number, "¡Hola! Tengo una consulta.") },
    { icon: <InstagramIcon size={22} />, label: `@${store.instagram}`, href: `https://instagram.com/${store.instagram}` },
    { icon: <PinIcon size={22} />, label: `${store.address}, ${store.city}, ${store.province}`, href: `https://maps.google.com/?q=${encodeURIComponent(`${store.address}, ${store.city}, ${store.province}`)}` },
    { icon: <ClockIcon size={22} />, label: store.hoursDetail, href: null },
  ];
  return (
    <div className="mx-auto max-w-3xl px-4 py-6 lg:px-6">
      <Breadcrumb items={[{ name: "Contacto", href: "/contacto" }]} />
      <h1 className="mt-4 text-3xl font-bold uppercase">Contacto</h1>
      <p className="mt-2 text-lg">Escribinos o pasá por el local. Te ayudamos a encontrar tu par.</p>
      <ul className="mt-8 space-y-3">
        {items.map((it) => (
          <li key={it.label}>
            {it.href ? (
              <a href={it.href} target="_blank" rel="noopener noreferrer" className="flex min-h-14 items-center gap-3 rounded-lg border border-azul/15 px-4 font-semibold hover:border-azul">
                {it.icon} {it.label}
              </a>
            ) : (
              <p className="flex min-h-14 items-center gap-3 rounded-lg border border-azul/15 px-4">
                {it.icon} {it.label}
              </p>
            )}
          </li>
        ))}
      </ul>
      {store.email && (
        <p className="mt-6 text-sm">
          Mail:{" "}
          <a href={`mailto:${store.email}`} className="font-semibold underline">
            {store.email}
          </a>
        </p>
      )}
    </div>
  );
}
