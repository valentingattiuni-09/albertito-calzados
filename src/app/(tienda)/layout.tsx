import { Suspense } from "react";
import { connection } from "next/server";
import { AnalyticsScripts } from "@/components/analytics/AnalyticsScripts";
import { CartDrawer } from "@/components/cart/CartDrawer";
import { NewsletterPopup } from "@/components/home/NewsletterPopup";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { WhatsAppFab } from "@/components/layout/WhatsAppFab";
import { getPaymentPromos, getSettings } from "@/lib/data/layout";
import { hasSupabase } from "@/lib/supabase/clients";
import { isBackoffice } from "@/lib/backoffice/source";
import { CHECKOUT_CLOSED_MESSAGE, checkoutEnabled } from "@/lib/backoffice/guard";
import { getNavigation } from "@/lib/data/layout";
import { StoreUnavailable } from "@/components/layout/StoreUnavailable";

export default async function TiendaLayout({ children }: LayoutProps<"/">) {
  const backoffice = isBackoffice();
  // Si el back office no responde y no hay copia, el error NO se atrapa acá: así Next conserva la última versión buena de la página
  // (una revalidación que falla no la reemplaza) y, si no hay ninguna, app/error.tsx muestra la página amable («Estamos actualizando la tienda»).
  const [{ newsletterPopup }, promos, nav] = await Promise.all([getSettings(), getPaymentPromos(), backoffice ? getNavigation() : undefined]);
  // Con el back office, una tienda sin secciones nunca es válida: es un build que corrió sin la API y todavía no pudo leerla.
  // Se muestra la página amable; la revalidación la reemplaza apenas la API responde.
  if (backoffice && nav?.length === 0) {
    return (
      <>
        <StoreUnavailable />
        {/* Marca la respuesta como dinámica (lo pide Next para las páginas con metadata en tiempo de ejecución, como /buscar) */}
        <Suspense fallback={null}>
          <RuntimeMarker />
        </Suspense>
      </>
    );
  }
  return (
    <>
      <a
        href="#contenido"
        className="sr-only z-50 bg-azul px-4 py-3 text-blanco focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:rounded-md"
      >
        Saltar al contenido
      </a>
      {/* Con el back office (fase B) se compra de verdad: sin aviso. En el modo demo sin Supabase, el aviso de siempre. */}
      {!backoffice && !hasSupabase && (
        <p className="bg-blanco px-4 py-1.5 text-center text-xs font-medium text-azul">Versión de prueba: los pagos y los envíos son simulados. No se cobra nada.</p>
      )}
      <SiteHeader />
      <main id="contenido" className="flex-1">
        {children}
      </main>
      <SiteFooter />
      <WhatsAppFab />
      <AnalyticsScripts />
      <Suspense fallback={null}>
        <CartDrawer promos={promos} checkoutClosed={checkoutEnabled(backoffice) ? undefined : CHECKOUT_CLOSED_MESSAGE} />
        {newsletterPopup.enabled && (
          <NewsletterPopup title={newsletterPopup.title} text={newsletterPopup.text} delaySeconds={newsletterPopup.delaySeconds} />
        )}
      </Suspense>
    </>
  );
}

async function RuntimeMarker() {
  await connection();
  return null;
}
