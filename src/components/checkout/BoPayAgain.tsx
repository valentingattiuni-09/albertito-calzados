"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { BoPaymentStep, type PaymentRequest, type PayResponse } from "@/components/checkout/BoPaymentStep";

/** Reintento de pago sobre un pedido ya creado (el token está en la cookie: el navegador solo manda el número). */
export function BoPayAgain({ number, total }: { number: string; total: number }) {
  const router = useRouter();
  const [ended, setEnded] = useState(false);
  const submit = (p: PaymentRequest): Promise<PayResponse> =>
    fetch("/api/checkout/pay", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ number, payment: p }) }).then((r) => r.json());
  if (ended)
    return (
      <Link href="/" className="inline-flex h-12 items-center rounded-md bg-rojo px-6 text-sm font-bold uppercase text-blanco">
        Ir a la tienda
      </Link>
    );
  return (
    <BoPaymentStep
      total={total}
      submit={submit}
      onDone={() => router.push(`/checkout/confirmacion/${number}`)}
      onFailure={(r) => {
        if (r.action === "go_confirmation") router.push(`/checkout/confirmacion/${number}`);
        if (r.action === "new_order") setEnded(true);
      }}
    />
  );
}
