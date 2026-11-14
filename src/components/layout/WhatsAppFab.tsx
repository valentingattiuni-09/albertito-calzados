import { WhatsAppIcon } from "@/components/ui/icons";
import { getSettings } from "@/lib/data/layout";
import { whatsappLink } from "@/lib/format";

/** Botón flotante de WhatsApp, abajo a la derecha en todo el sitio. */
export async function WhatsAppFab() {
  const { whatsapp } = await getSettings();
  return (
    <a
      href={whatsappLink(whatsapp.number, "¡Hola! Tengo una consulta.")}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Escribinos por WhatsApp"
      className="wa-fab fixed bottom-4 right-4 z-30 flex size-14 items-center justify-center rounded-full bg-whatsapp text-blanco shadow-lg shadow-azul/25 hover:bg-whatsapp-oscuro transition-transform hover:scale-105 [bottom:max(1rem,env(safe-area-inset-bottom))] lg:bottom-6 lg:right-6"
    >
      <WhatsAppIcon size={30} />
    </a>
  );
}
