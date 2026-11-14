"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { CloseIcon } from "@/components/ui/icons";
import { NewsletterForm } from "./NewsletterForm";

const KEY = "albertito:newsletter-hide-until";
const DAYS_HIDDEN = 30;
// No interrumpir mientras compra o en el panel
const SKIP = ["/checkout", "/cuenta", "/admin"];

function hiddenUntil(): number {
  try {
    return Number(localStorage.getItem(KEY) ?? 0);
  } catch {
    return Number.MAX_SAFE_INTEGER; // sin storage: no molestar
  }
}

/** ?newsletter=1 en la URL lo muestra siempre (para mostrarlo en una demo aunque ya se haya cerrado). */
const forced = () => new URLSearchParams(window.location.search).get("newsletter") === "1";

function hideFor30Days() {
  try {
    localStorage.setItem(KEY, String(Date.now() + DAYS_HIDDEN * 86400000));
  } catch {
    /* sin storage */
  }
}

/**
 * Popup "Enterate antes que nadie": a los ~5 s de la primera visita o al intentar salir (desktop).
 * Si se cierra o se suscribe, no vuelve por 30 días. En mobile es una hoja inferior fácil de cerrar.
 */
export function NewsletterPopup({ title, text, delaySeconds }: { title: string; text: string; delaySeconds: number }) {
  const ref = useRef<HTMLDialogElement>(null);
  const shown = useRef(false);
  const [done, setDone] = useState(false);
  const open = useCallback(() => {
    const skip = SKIP.some((p) => window.location.pathname.startsWith(p));
    if (shown.current || skip || (!forced() && Date.now() < hiddenUntil())) return;
    if (document.querySelector("dialog[open]")) return; // no tapar otro modal
    shown.current = true;
    ref.current?.showModal();
  }, []);

  useEffect(() => {
    if (!forced() && Date.now() < hiddenUntil()) return;
    const t = setTimeout(open, forced() ? 1000 : Math.max(2, delaySeconds) * 1000);
    // Intención de salida: el mouse sale por arriba de la ventana (solo con mouse)
    const onLeave = (e: MouseEvent) => {
      if (e.clientY <= 0 && !e.relatedTarget && window.matchMedia("(hover: hover)").matches) open();
    };
    document.addEventListener("mouseout", onLeave);
    return () => {
      clearTimeout(t);
      document.removeEventListener("mouseout", onLeave);
    };
  }, [open, delaySeconds]);

  const close = () => ref.current?.close();
  const onSuccess = useCallback(() => {
    hideFor30Days();
    setDone(true);
  }, []);

  return (
    <dialog
      ref={ref}
      aria-labelledby="newsletter-popup-title"
      onClose={hideFor30Days}
      onClick={(e) => e.target === ref.current && close()}
      className="mx-0 mb-0 mt-auto max-h-[80dvh] w-full max-w-none overflow-hidden rounded-t-2xl bg-blanco p-0 text-azul backdrop:bg-azul/40 sm:m-auto sm:max-w-3xl sm:rounded-2xl"
    >
      <div className="grid max-h-[80dvh] sm:grid-cols-[1fr_1.3fr]">
        <div className="relative hidden bg-rojo sm:block">
          <Image src="/brand/logo-sobre-rojo.png" alt="" width={488} height={231} className="absolute left-1/2 top-1/2 w-[70%] -translate-x-1/2 -translate-y-1/2" />
        </div>
        <div className="overflow-y-auto p-5 sm:p-8">
          <div className="flex items-start justify-between gap-4">
            <h2 id="newsletter-popup-title" className="font-campana text-2xl uppercase leading-tight sm:text-3xl">
              {title}
            </h2>
            <button
              type="button"
              onClick={close}
              aria-label="Cerrar"
              className="-mr-2 -mt-2 flex size-11 shrink-0 items-center justify-center rounded-full hover:bg-azul/5"
            >
              <CloseIcon />
            </button>
          </div>
          <p className="mb-5 mt-1">{text}</p>
          <NewsletterForm source="popup" onSuccess={onSuccess} />
          <button type="button" onClick={close} className="mt-3 min-h-11 w-full text-sm font-semibold underline underline-offset-4">
            {done ? "Cerrar" : "Ahora no"}
          </button>
        </div>
      </div>
    </dialog>
  );
}
