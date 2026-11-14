"use client";

import { Modal } from "@/components/ui/Modal";
import type { PaymentPromo } from "@/lib/data/types";
import { formatPrice } from "@/lib/format";
import { installmentOptions } from "@/lib/pricing";

/** Cuotas en la ficha: "Hasta 5 cuotas sin interés", lista de opciones y modal con todos los medios de pago. */
export function PaymentsInfo({ price, promos }: { price: number; promos: PaymentPromo[] }) {
  const options = installmentOptions(price, promos);
  if (options.length === 0) return null;
  const max = options[0];

  return (
    <div className="rounded-lg border border-azul/15 p-4">
      <p className="text-base font-bold">
        Hasta {max.installments} cuotas sin interés de {formatPrice(max.amount)}
      </p>
      <ul className="mt-2 space-y-1 text-sm">
        {options.map((o) => (
          <li key={o.promo.id}>
            {o.installments} cuotas sin interés de {formatPrice(o.amount)} con {o.promo.label}
          </li>
        ))}
      </ul>
      <Modal
        title="Medios de pago"
        triggerClassName="mt-2 inline-flex min-h-11 items-center text-sm font-semibold underline underline-offset-4"
        trigger="Ver medios de pago"
      >
        <ul className="divide-y divide-azul/10">
          {promos.map((p) => (
            <li key={p.id} className="flex items-center justify-between gap-4 py-3">
              <div>
                <p className="font-semibold">{p.label}</p>
                {p.minAmount > 0 && <p className="text-xs text-gris-tinta">Compra mínima {formatPrice(p.minAmount)}</p>}
              </div>
              <p className="text-right text-sm font-bold">
                {p.installments} {p.interestFree ? "cuotas sin interés" : "cuotas"}
                {price >= p.minAmount && (
                  <span className="block font-normal">de {formatPrice(Math.ceil(price / p.installments))}</span>
                )}
              </p>
            </li>
          ))}
          <li className="py-3 text-sm">También podés pagar con débito o en 1 pago con crédito.</li>
        </ul>
      </Modal>
    </div>
  );
}
