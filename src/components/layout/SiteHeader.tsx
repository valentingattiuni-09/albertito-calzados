import { getNavigation, getPaymentPromos, getSettings, getTopbarMessages } from "@/lib/data/layout";
import { InstallmentsBar } from "./InstallmentsBar";
import { MainBar } from "./MainBar";
import { SectionNav } from "./SectionNav";

/** Header fijo de tres niveles: cuotas (azul) · barra principal (roja) · secciones (blanca). */
export async function SiteHeader() {
  const [sections, promos, messages, settings] = await Promise.all([
    getNavigation(),
    getPaymentPromos(),
    getTopbarMessages(),
    getSettings(),
  ]);

  return (
    <header className="sticky top-0 z-40">
      <InstallmentsBar promos={promos} messages={messages} />
      <MainBar sections={sections} settings={settings} />
      <SectionNav sections={sections} />
    </header>
  );
}
