import type { Metadata } from "next";
import { Breadcrumb } from "@/components/catalog/Breadcrumb";
import { WithdrawalForm } from "./WithdrawalForm";

export const metadata: Metadata = {
  title: "Botón de arrepentimiento",
  description: "Revocá tu compra online dentro de los 10 días corridos desde la entrega.",
  alternates: { canonical: "/arrepentimiento" },
};

export default function WithdrawalPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-6 lg:px-6">
      <Breadcrumb items={[{ name: "Botón de arrepentimiento", href: "/arrepentimiento" }]} />
      <h1 className="mt-4 text-3xl font-bold uppercase">Botón de arrepentimiento</h1>
      <div className="mt-4 space-y-3 leading-relaxed">
        <p>
          Si compraste online, tenés <strong>10 días corridos</strong> desde que recibiste el producto para arrepentirte, sin dar motivos (Ley 24.240, art. 34, y
          Resolución 424/2020).
        </p>
        <p>Completá el formulario. Te damos un código de trámite al instante y te contactamos dentro de las 24 h hábiles.</p>
        <p className="text-sm italic text-gris-tinta">El producto tiene que estar sin uso, con su caja y etiqueta. El costo de la devolución corre por nuestra cuenta.</p>
      </div>
      <WithdrawalForm />
    </div>
  );
}
