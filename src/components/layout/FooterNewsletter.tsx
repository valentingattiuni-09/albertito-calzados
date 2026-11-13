"use client";

import Link from "next/link";
import { useActionState, useEffect, startTransition } from "react";
import { subscribeNewsletter, type NewsletterState } from "@/app/actions/newsletter";
import { analytics } from "@/lib/analytics";

export function FooterNewsletter() {
  const [state, action, pending] = useActionState<NewsletterState, FormData>(subscribeNewsletter, null);
  useEffect(() => {
    if (state?.ok) analytics.subscribe("footer");
  }, [state]);

  if (state?.ok) {
    return (
      <p role="status" className="text-base font-semibold">
        {state.message}
      </p>
    );
  }

  return (
    <form
      action={action}
      // Que un error de validación no borre lo que la persona escribió (React resetea los <form action>)
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        startTransition(() => action(fd));
      }} className="space-y-3">
      <input type="hidden" name="source" value="footer" />
      <div className="flex gap-2">
        <label htmlFor="footer-email" className="sr-only">
          Tu mail
        </label>
        <input
          id="footer-email"
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="Tu mail"
          className="h-11 min-w-0 flex-1 rounded-md border-0 bg-blanco px-3 text-sm text-azul placeholder:text-gris-tinta focus-visible:outline-blanco"
        />
        <button
          type="submit"
          disabled={pending}
          className="h-11 shrink-0 rounded-md bg-rojo px-4 text-sm font-bold uppercase text-blanco transition-opacity disabled:opacity-60"
        >
          {pending ? "…" : "Sumarme"}
        </button>
      </div>
      <label className="flex items-start gap-2 text-xs">
        <input type="checkbox" name="terms" required className="mt-0.5 size-4 accent-rojo" />
        <span>
          Acepto los{" "}
          <Link href="/legales/terminos-y-condiciones" className="underline">
            términos y condiciones
          </Link>
          .
        </span>
      </label>
      {state && !state.ok && (
        <p role="alert" className="text-sm font-semibold">
          {state.message}
        </p>
      )}
    </form>
  );
}
