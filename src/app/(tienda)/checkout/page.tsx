import type { Metadata } from "next";
import { CheckoutForm } from "@/components/checkout/CheckoutForm";
import { getPaymentPromos, getSettings } from "@/lib/data/layout";
import { isBackoffice } from "@/lib/backoffice/source";
import { CHECKOUT_CLOSED_MESSAGE } from "@/lib/backoffice/guard";
import { whatsappLink } from "@/lib/format";

export const metadata: Metadata = { title: "Finalizar compra", robots: { index: false } };

export default async function CheckoutPage() {
  const [promos, settings] = await Promise.all([getPaymentPromos(), getSettings()]);
  // Fase A con el back office: compras apagadas hasta la fase B
  if (isBackoffice()) {
    return (
      <div className="mx-auto max-w-tienda px-4 py-6 lg:px-6">
        <h1 className="text-2xl font-bold uppercase sm:text-3xl">Finalizar compra</h1>
        <div role="note" className="mt-6 max-w-xl rounded-md border border-azul/15 p-5">
          <p className="text-base font-medium">{CHECKOUT_CLOSED_MESSAGE}</p>
          {settings.whatsapp.number && (
            <a href={whatsappLink(settings.whatsapp.number, "Hola, quiero hacer un pedido")} className="mt-4 inline-flex min-h-12 items-center rounded-md bg-azul px-5 font-bold text-blanco">
              Escribinos por WhatsApp
            </a>
          )}
        </div>
      </div>
    );
  }
  return (
    <div className="mx-auto max-w-tienda px-4 py-6 lg:px-6">
      <h1 className="text-2xl font-bold uppercase sm:text-3xl">Finalizar compra</h1>
      <div className="mt-6">
        <CheckoutForm promos={promos} storeAddress={`${settings.store.address}, ${settings.store.city}`} />
      </div>
    </div>
  );
}
