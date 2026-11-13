import type { Metadata } from "next";
import { CheckoutForm } from "@/components/checkout/CheckoutForm";
import { getPaymentPromos, getSettings } from "@/lib/data/layout";

export const metadata: Metadata = { title: "Finalizar compra", robots: { index: false } };

export default async function CheckoutPage() {
  const [promos, settings] = await Promise.all([getPaymentPromos(), getSettings()]);
  return (
    <div className="mx-auto max-w-tienda px-4 py-6 lg:px-6">
      <h1 className="text-2xl font-bold uppercase sm:text-3xl">Finalizar compra</h1>
      <div className="mt-6">
        <CheckoutForm promos={promos} storeAddress={`${settings.store.address}, ${settings.store.city}`} />
      </div>
    </div>
  );
}
