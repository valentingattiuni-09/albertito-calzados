"use client";

import Link from "next/link";
import { useActionState, useEffect, useId, startTransition } from "react";
import { subscribeNewsletter, type NewsletterState } from "@/app/actions/newsletter";
import { analytics } from "@/lib/analytics";

const PREFERENCES = [
  ["hombre", "Hombre"],
  ["mujer", "Mujer"],
  ["nino", "Niño"],
  ["familia", "Toda la familia"],
] as const;

/** Formulario completo de newsletter (bloque del home y popup). */
export function NewsletterForm({
  source,
  onSuccess,
  dark = false,
}: {
  source: "home" | "popup";
  onSuccess?: () => void;
  dark?: boolean;
}) {
  const id = useId();
  const [state, action, pending] = useActionState<NewsletterState, FormData>(subscribeNewsletter, null);

  useEffect(() => {
    if (state?.ok) {
      analytics.subscribe(source);
      onSuccess?.();
    }
  }, [state, onSuccess, source]);

  if (state?.ok) {
    return (
      <p role="status" className="text-lg font-bold">
        {state.message} Te vamos a avisar antes que a nadie.
      </p>
    );
  }

  const field = `h-12 w-full rounded-md border px-3 text-base ${dark ? "border-blanco bg-blanco text-azul" : "border-azul/30 bg-blanco text-azul"} placeholder:text-gris-tinta`;

  return (
    <form
      action={action}
      // Que un error de validación no borre lo que la persona escribió (React resetea los <form action>)
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        startTransition(() => action(fd));
      }} className="space-y-4">
      <input type="hidden" name="source" value={source} />
      <div>
        <label htmlFor={`${id}-email`} className="mb-1 block text-sm font-semibold">
          Tu mail
        </label>
        <input id={`${id}-email`} name="email" type="email" required autoComplete="email" placeholder="nombre@mail.com" className={field} />
      </div>

      <fieldset>
        <legend className="mb-2 text-sm font-semibold">¿Para quién comprás?</legend>
        <div className="grid grid-cols-2 gap-2">
          {PREFERENCES.map(([value, label]) => (
            <label
              key={value}
              className={`flex min-h-11 cursor-pointer items-center gap-2 rounded-md border px-3 text-sm has-[:checked]:font-semibold ${
                dark ? "border-blanco/50 has-[:checked]:bg-blanco has-[:checked]:text-azul" : "border-azul/25 has-[:checked]:border-azul has-[:checked]:bg-azul has-[:checked]:text-blanco"
              }`}
            >
              <input type="radio" name="preference" value={value} className="sr-only" />
              {label}
            </label>
          ))}
        </div>
      </fieldset>

      <div>
        <label htmlFor={`${id}-birth`} className="mb-1 block text-sm font-semibold">
          Fecha de nacimiento <span className="font-normal">(opcional, para tu regalo de cumple)</span>
        </label>
        <input id={`${id}-birth`} name="birth_date" type="date" max="2020-12-31" className={field} />
      </div>

      <label className="flex items-start gap-2 text-sm">
        <input type="checkbox" name="terms" required className="mt-0.5 size-5 shrink-0 accent-rojo" />
        <span>
          Acepto los{" "}
          <Link href="/legales/terminos-y-condiciones" className="underline" target="_blank">
            términos
          </Link>{" "}
          y la{" "}
          <Link href="/legales/privacidad" className="underline" target="_blank">
            política de privacidad
          </Link>
          .
        </span>
      </label>

      {state && !state.ok && (
        <p role="alert" className="text-sm font-bold">
          {state.message}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="h-12 w-full rounded-md bg-rojo text-base font-bold uppercase text-blanco transition-opacity disabled:opacity-60"
      >
        {pending ? "Enviando…" : "Quiero enterarme"}
      </button>
    </form>
  );
}
