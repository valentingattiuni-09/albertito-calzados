"use client";

import { useRef } from "react";
import { CloseIcon, FilterIcon } from "@/components/ui/icons";

/**
 * Panel inferior de filtros en mobile. El contenido (links) lo arma el servidor.
 * Queda abierto mientras se eligen filtros; el botón de abajo muestra cuántos productos quedan.
 */
export function MobileFilters({ count, total, children }: { count: number; total: number; children: React.ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);

  return (
    <>
      <button
        type="button"
        onClick={() => ref.current?.showModal()}
        className="flex h-11 items-center gap-2 rounded-md border border-azul/25 px-4 text-sm font-semibold lg:hidden"
      >
        <FilterIcon size={18} /> Filtrar{count > 0 ? ` (${count})` : ""}
      </button>
      <dialog
        ref={ref}
        aria-label="Filtros"
        onClick={(e) => e.target === ref.current && ref.current?.close()}
        className="mx-0 mb-0 mt-auto max-h-[85dvh] w-full max-w-none rounded-t-2xl bg-blanco p-0 text-azul backdrop:bg-azul/50 lg:hidden"
      >
        <div className="flex max-h-[85dvh] flex-col">
          <div className="flex items-center justify-between border-b border-azul/15 px-4 py-2">
            <p className="text-base font-bold uppercase">Filtrar</p>
            <button
              type="button"
              onClick={() => ref.current?.close()}
              className="flex size-11 items-center justify-center rounded-full"
              aria-label="Cerrar filtros"
            >
              <CloseIcon />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto px-4 py-4">{children}</div>
          <div className="border-t border-azul/15 p-4 [padding-bottom:max(1rem,env(safe-area-inset-bottom))]">
            <button
              type="button"
              onClick={() => ref.current?.close()}
              className="h-12 w-full rounded-md bg-rojo text-base font-bold uppercase text-blanco"
            >
              Ver {total} {total === 1 ? "producto" : "productos"}
            </button>
          </div>
        </div>
      </dialog>
    </>
  );
}
