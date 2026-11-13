import { Suspense } from "react";
import { AnalyticsScripts } from "@/components/analytics/AnalyticsScripts";
import { CartDrawer } from "@/components/cart/CartDrawer";
import { NewsletterPopup } from "@/components/home/NewsletterPopup";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { WhatsAppFab } from "@/components/layout/WhatsAppFab";
import { getPaymentPromos, getSettings } from "@/lib/data/layout";

export default async function TiendaLayout({ children }: LayoutProps<"/">) {
  const [{ newsletterPopup }, promos] = await Promise.all([getSettings(), getPaymentPromos()]);
  return (
    <>
      <a
        href="#contenido"
        className="sr-only z-50 bg-azul px-4 py-3 text-blanco focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:rounded-md"
      >
        Saltar al contenido
      </a>
      <SiteHeader />
      <main id="contenido" className="flex-1">
        {children}
      </main>
      <SiteFooter />
      <WhatsAppFab />
      <AnalyticsScripts />
      <Suspense fallback={null}>
        <CartDrawer promos={promos} />
        {newsletterPopup.enabled && (
          <NewsletterPopup title={newsletterPopup.title} text={newsletterPopup.text} delaySeconds={newsletterPopup.delaySeconds} />
        )}
      </Suspense>
    </>
  );
}
