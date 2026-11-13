"use client";

import { useActionState, startTransition } from "react";
import { requestWithdrawal, type WithdrawalState } from "@/app/actions/withdrawal";

const input = "h-12 w-full rounded-md border border-azul/30 bg-blanco px-3 text-base text-azul";

export function WithdrawalForm() {
  const [state, action, pending] = useActionState<WithdrawalState, FormData>(requestWithdrawal, null);

  if (state?.ok) {
    return (
      <div role="status" className="mt-8 rounded-xl border-2 border-azul p-6">
        <p className="text-lg font-bold uppercase">Recibimos tu solicitud</p>
        <p className="mt-2">
          Tu código de trámite es <strong className="text-xl">{state.code}</strong>. Te mandamos una copia por mail.
        </p>
        <p className="mt-2 text-sm">Te contactamos dentro de las 24 h hábiles para coordinar la devolución.</p>
      </div>
    );
  }

  const field = (name: string, label: string, props: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <div>
      <label htmlFor={`arr-${name}`} className="mb-1 block text-sm font-semibold">
        {label}
      </label>
      <input id={`arr-${name}`} name={name} className={input} aria-invalid={state && !state.ok && state.field === name ? true : undefined} {...props} />
    </div>
  );

  return (
    <form
      action={action}
      // Que un error de validación no borre lo que la persona escribió (React resetea los <form action>)
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        startTransition(() => action(fd));
      }} className="mt-8 grid gap-4 sm:grid-cols-2">
      {field("firstName", "Nombre", { required: true, autoComplete: "given-name" })}
      {field("lastName", "Apellido", { required: true, autoComplete: "family-name" })}
      {field("dni", "DNI", { required: true, inputMode: "numeric" })}
      {field("email", "Mail", { required: true, type: "email", autoComplete: "email" })}
      {field("phone", "Teléfono (opcional)", { type: "tel", autoComplete: "tel" })}
      {field("orderNumber", "Número de pedido (si lo tenés)", { placeholder: "ALB-001234" })}
      <div className="sm:col-span-2">
        <label htmlFor="arr-reason" className="mb-1 block text-sm font-semibold">
          Comentario (opcional)
        </label>
        <textarea id="arr-reason" name="reason" rows={3} maxLength={1000} className={`${input} h-auto py-2`} />
      </div>
      {state && !state.ok && (
        <p role="alert" className="text-sm font-bold text-rojo sm:col-span-2">
          {state.message}
        </p>
      )}
      <button type="submit" disabled={pending} className="h-12 rounded-md bg-rojo text-base font-bold uppercase text-blanco disabled:opacity-60 sm:col-span-2">
        {pending ? "Enviando…" : "Enviar solicitud de arrepentimiento"}
      </button>
    </form>
  );
}
