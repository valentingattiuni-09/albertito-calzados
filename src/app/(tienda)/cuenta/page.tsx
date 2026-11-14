import type { Metadata } from "next";
import { Breadcrumb } from "@/components/catalog/Breadcrumb";
import { WhatsAppIcon } from "@/components/ui/icons";
import { getSettings } from "@/lib/data/layout";
import { whatsappLink } from "@/lib/format";
import { TrackOrderForm } from "./TrackOrderForm";

export const metadata: Metadata = { title: "Mi cuenta", robots: { index: false } };

/**
 * Mi cuenta. Por ahora: seguimiento de pedido sin cuenta.
 * TODO: login / registro de clientes (Supabase Auth), Mis pedidos, direcciones y favoritos.
 */
export default async function AccountPage() {
  const { whatsapp } = await getSettings();
  return (
    <div className="mx-auto max-w-3xl px-4 py-6 lg:px-6">
      <Breadcrumb items={[{ name: "Mi cuenta", href: "/cuenta" }]} />
      <h1 className="mt-4 text-3xl font-bold uppercase">Mi cuenta</h1>

      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <section aria-labelledby="seguir" className="rounded-xl border-2 border-azul p-5">
          <h2 id="seguir" className="text-lg font-bold uppercase">
            Seguí tu pedido
          </h2>
          <p className="mt-1 text-sm">Con el número que te llegó por mail y el mail de la compra.</p>
          <TrackOrderForm />
        </section>

        <section aria-labelledby="ingresar" className="rounded-xl border border-azul/15 p-5">
          <h2 id="ingresar" className="text-lg font-bold uppercase">
            Tu cuenta
          </h2>
          <p className="mt-2 text-sm leading-relaxed">
            Muy pronto vas a poder crear tu cuenta para ver todos tus pedidos, guardar tus direcciones y tus favoritos.
          </p>
          <p className="mt-2 text-sm leading-relaxed">Mientras tanto, comprá como invitado: es rápido y no hace falta registrarse.</p>
          <a
            href={whatsappLink(whatsapp.number, "¡Hola! Tengo una consulta sobre mi pedido.")}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-5 flex h-12 items-center justify-center gap-2 rounded-md border-2 border-azul text-sm font-bold uppercase"
          >
            <WhatsAppIcon size={20} /> Consultá por WhatsApp
          </a>
        </section>
      </div>
    </div>
  );
}
