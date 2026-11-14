"use client";

import { startTransition, useActionState } from "react";
import { trackOrder, type TrackState } from "@/app/actions/track-order";

const input = "h-12 w-full rounded-md border border-azul/30 bg-blanco px-3 text-base text-azul";

export function TrackOrderForm() {
  const [state, action, pending] = useActionState<TrackState, FormData>(trackOrder, null);
  return (
    <form
      action={action}
      // Que un error no borre lo escrito
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        startTransition(() => action(fd));
      }}
      className="mt-4 space-y-3"
    >
      <div>
        <label htmlFor="track-number" className="mb-1 block text-sm font-semibold">
          Número de pedido
        </label>
        <input id="track-number" name="number" placeholder="ALB-001234" autoCapitalize="characters" className={input} />
      </div>
      <div>
        <label htmlFor="track-email" className="mb-1 block text-sm font-semibold">
          Mail de la compra
        </label>
        <input id="track-email" name="email" type="email" autoComplete="email" className={input} />
      </div>
      {state && !state.ok && (
        <p role="alert" className="text-sm font-bold text-rojo">
          {state.message}
        </p>
      )}
      <button type="submit" disabled={pending} className="h-12 w-full rounded-md bg-rojo text-base font-bold uppercase text-blanco disabled:opacity-60">
        {pending ? "Buscando…" : "Ver mi pedido"}
      </button>
    </form>
  );
}
