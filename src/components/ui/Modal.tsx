"use client";

import { useRef } from "react";
import { CloseIcon } from "./icons";

/**
 * Modal con <dialog> nativo (foco atrapado, Escape, fondo inerte).
 * `trigger` es el contenido del botón que lo abre.
 */
export function Modal({
  title,
  trigger,
  triggerClassName,
  children,
}: {
  title: string;
  trigger: React.ReactNode;
  triggerClassName?: string;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  return (
    <>
      <button type="button" onClick={() => ref.current?.showModal()} className={triggerClassName}>
        {trigger}
      </button>
      <dialog
        ref={ref}
        aria-label={title}
        onClick={(e) => e.target === ref.current && ref.current?.close()}
        className="m-auto w-[min(36rem,calc(100vw-2rem))] max-h-[85dvh] rounded-xl bg-blanco p-0 text-azul backdrop:bg-azul/50"
      >
        <div className="flex max-h-[85dvh] flex-col">
          <div className="flex items-center justify-between border-b border-azul/15 py-2 pl-5 pr-2">
            <h2 className="text-base font-bold uppercase">{title}</h2>
            <button
              type="button"
              onClick={() => ref.current?.close()}
              className="flex size-11 items-center justify-center rounded-full"
              aria-label="Cerrar"
            >
              <CloseIcon />
            </button>
          </div>
          <div className="overflow-y-auto p-5">{children}</div>
        </div>
      </dialog>
    </>
  );
}
