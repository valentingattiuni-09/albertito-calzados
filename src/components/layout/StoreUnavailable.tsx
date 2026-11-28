import { whatsappLink } from "@/lib/format";

/**
 * Página amable cuando la tienda no puede leer el catálogo (API del back office caída y sin copia en memoria todavía).
 * El WhatsApp sale de NEXT_PUBLIC_STORE_WHATSAPP (no del back office, que es justamente lo que no responde).
 */
export function StoreUnavailable({ whatsapp = process.env.NEXT_PUBLIC_STORE_WHATSAPP ?? "" }: { whatsapp?: string }) {
  return (
    <main id="contenido" className="mx-auto flex min-h-[70vh] max-w-xl flex-col items-center justify-center gap-4 px-4 py-16 text-center">
      <p className="text-2xl font-bold uppercase">Estamos actualizando la tienda.</p>
      <p className="text-base">Volvé en unos minutos.</p>
      {whatsapp && (
        <a href={whatsappLink(whatsapp, "Hola, quería hacer una consulta")} className="inline-flex min-h-12 items-center rounded-md bg-whatsapp px-5 font-bold text-blanco hover:bg-whatsapp-oscuro">
          Escribinos por WhatsApp
        </a>
      )}
    </main>
  );
}
