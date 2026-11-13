"use client";

import Image from "next/image";
import Link from "next/link";
import { useId, useRef, useState } from "react";
import { ChevronDownIcon, CloseIcon, MenuIcon, UserIcon, WhatsAppIcon } from "@/components/ui/icons";
import type { NavSection, StoreSettings } from "@/lib/data/types";
import { whatsappLink } from "@/lib/format";

/**
 * Menú mobile: panel lateral con acordeón (estilo Tate).
 * Usa <dialog> nativo: atrapa el foco, cierra con Escape y bloquea el fondo.
 */
export function MobileMenu({ sections, settings }: { sections: NavSection[]; settings: StoreSettings }) {
  const ref = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState<string | null>(null);
  const baseId = useId();

  const close = () => ref.current?.close();


  return (
    <>
      <button
        type="button"
        onClick={() => ref.current?.showModal()}
        className="flex size-11 shrink-0 items-center justify-center rounded-full transition-colors hover:bg-white/15 lg:hidden"
        aria-label="Abrir menú"
        aria-haspopup="dialog"
      >
        <MenuIcon size={26} />
      </button>

      <dialog
        ref={ref}
        aria-label="Menú"
        // Cerrar al tocar afuera o al elegir un link
        onClick={(e) => (e.target === ref.current || (e.target as HTMLElement).closest("a")) && close()}
        className="m-0 h-dvh max-h-dvh w-[86vw] max-w-sm bg-blanco p-0 text-azul backdrop:bg-azul/50 open:animate-[slide-in_200ms_ease-out] lg:hidden"
      >
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between border-b border-azul/15 px-4 py-2">
            <Image src="/brand/logo-principal.png" alt="Albertito Calzados" width={651} height={308} className="h-auto w-[96px]" />
            <button
              type="button"
              onClick={close}
              className="flex size-11 items-center justify-center rounded-full hover:bg-azul/5"
              aria-label="Cerrar menú"
            >
              <CloseIcon />
            </button>
          </div>

          <nav aria-label="Secciones" className="flex-1 overflow-y-auto">
            <ul>
              {sections.map((s) => {
                const panelId = `${baseId}-${s.slug}`;
                const isOpen = open === s.slug;
                if (s.children.length === 0) {
                  return (
                    <li key={s.id} className="border-b border-azul/10">
                      <Link
                        href={s.href}
                        className={`flex min-h-14 items-center px-5 text-base font-bold uppercase tracking-wide ${s.kind === "offers" ? "text-rojo" : ""}`}
                      >
                        {s.name}
                      </Link>
                    </li>
                  );
                }
                return (
                  <li key={s.id} className="border-b border-azul/10">
                    <button
                      type="button"
                      onClick={() => setOpen(isOpen ? null : s.slug)}
                      aria-expanded={isOpen}
                      aria-controls={panelId}
                      className="flex min-h-14 w-full items-center justify-between px-5 text-left text-base font-bold uppercase tracking-wide"
                    >
                      {s.name}
                      <ChevronDownIcon className={`transition-transform ${isOpen ? "rotate-180" : ""}`} />
                    </button>
                    <ul id={panelId} hidden={!isOpen} className="pb-2">
                      <li>
                        <Link href={s.href} className="flex min-h-11 items-center px-8 text-sm font-semibold underline underline-offset-4">
                          Ver todo {s.name}
                        </Link>
                      </li>
                      {s.children.map((c) => (
                        <li key={c.id}>
                          <Link href={c.href} className="flex min-h-11 items-center px-8 text-sm">
                            {c.name}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </li>
                );
              })}
            </ul>

            <ul className="mt-2 px-5 py-3 text-sm">
              <li>
                <Link href="/cuenta" className="flex min-h-11 items-center gap-3 font-medium">
                  <UserIcon size={20} /> Mi cuenta
                </Link>
              </li>
              <li>
                <a
                  href={whatsappLink(settings.whatsapp.number, "¡Hola! Tengo una consulta.")}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex min-h-11 items-center gap-3 font-medium"
                >
                  <WhatsAppIcon size={20} /> Escribinos por WhatsApp
                </a>
              </li>
            </ul>
          </nav>
        </div>
      </dialog>
    </>
  );
}
