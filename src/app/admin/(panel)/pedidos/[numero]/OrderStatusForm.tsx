"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect } from "react";
import { Field, FormMessage, inputCls, SubmitButton, ActionForm } from "@/components/admin/ui";
import { updateOrderAction, type ActionState } from "../../../actions";

const OPTIONS = [
  ["pendiente", "Pendiente (esperando pago)"],
  ["pagado", "Pagado · para preparar"],
  ["enviado", "Enviado"],
  ["entregado", "Entregado"],
  ["cancelado", "Cancelado"],
] as const;

export function OrderStatusForm({ id, status, trackingCode }: { id: string; status: string; trackingCode: string | null }) {
  const router = useRouter();
  const [state, action, pending] = useActionState<ActionState, FormData>(updateOrderAction, null);
  useEffect(() => {
    if (state?.ok) router.refresh();
  }, [state, router]);

  return (
    <ActionForm dispatch={action} pending={pending} className="space-y-4 rounded-xl border-2 border-azul p-4">
      <h2 className="font-bold uppercase">Estado del pedido</h2>
      <input type="hidden" name="id" value={id} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Estado" htmlFor="o-status">
          <select id="o-status" name="status" defaultValue={status} className={inputCls}>
            {OPTIONS.map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Número de seguimiento" htmlFor="o-track" error={state?.errors?.trackingCode} hint="Obligatorio para marcar “Enviado”.">
          <input id="o-track" name="trackingCode" defaultValue={trackingCode ?? ""} className={inputCls} />
        </Field>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <SubmitButton>Actualizar</SubmitButton>
        <FormMessage state={state} />
      </div>
      <p className="text-xs text-gris-tinta">El aviso por mail al cliente al cambiar de estado se conecta en la Fase 6, junto con el back office.</p>
    </ActionForm>
  );
}
