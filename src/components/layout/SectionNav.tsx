"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ChevronDownIcon, ChevronRightIcon } from "@/components/ui/icons";
import type { NavSection } from "@/lib/data/types";

const OPEN_DELAY = 120;
const CLOSE_DELAY = 180;

/**
 * Barra de secciones (blanca, texto azul, OFERTAS en rojo), siempre visible.
 * Desktop: mega menú al pasar el mouse o al usar el botón de flecha (teclado / touch).
 * Mobile: las 5 secciones en una fila deslizable; las subsecciones están en el menú lateral.
 */
export function SectionNav({ sections }: { sections: NavSection[] }) {
  const [openSlug, setOpenSlug] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const schedule = (slug: string | null, delay: number) => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setOpenSlug(slug), delay);
  };


  useEffect(() => {
    if (!openSlug) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpenSlug(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [openSlug]);


  return (
    <nav aria-label="Secciones" className="relative border-b border-azul/15 bg-blanco" onMouseLeave={() => schedule(null, CLOSE_DELAY)}>
      <ul className="no-scrollbar mx-auto flex max-w-tienda items-stretch justify-between overflow-x-auto px-1 sm:justify-center sm:gap-2 sm:px-2 lg:gap-6">
        {sections.map((s) => {
          const hasMenu = s.kind === "offers" || s.children.length > 0;
          const open = openSlug === s.slug;
          return (
            <li
              key={s.id}
              className="flex shrink-0 items-center"
              onMouseEnter={() => (hasMenu ? schedule(s.slug, OPEN_DELAY) : schedule(null, CLOSE_DELAY))}
            >
              <Link
                href={s.href}
                // La sección activa la marca cada página con <ActiveSection> (ver globals.css)
                data-section={s.slug}
                className={`relative flex h-11 items-center px-1.5 text-xs font-bold uppercase max-[374px]:px-1 max-[374px]:text-[11px] min-[400px]:px-2 min-[400px]:text-[13px] sm:px-3 sm:tracking-wide lg:text-sm ${
                  s.kind === "offers" ? "text-rojo" : "text-azul"
                } after:absolute after:inset-x-2 after:bottom-0 after:h-[3px] after:rounded-full after:transition-transform ${
                  s.kind === "offers" ? "after:bg-rojo" : "after:bg-azul"
                } ${open ? "after:scale-x-100" : "after:scale-x-0"}`}
              >
                {s.name}
              </Link>
              {hasMenu && (
                <button
                  type="button"
                  onClick={() => setOpenSlug(open ? null : s.slug)}
                  aria-expanded={open}
                  aria-controls={`mega-${s.slug}`}
                  aria-label={`Ver subsecciones de ${s.name}`}
                  className="-ml-2 hidden size-8 items-center justify-center rounded-full text-azul hover:bg-azul/5 lg:flex"
                >
                  <ChevronDownIcon size={16} className={`transition-transform ${open ? "rotate-180" : ""}`} />
                </button>
              )}
            </li>
          );
        })}
      </ul>

      {sections.map((s) => (
        <MegaMenu
          key={s.id}
          section={s}
          sections={sections}
          open={openSlug === s.slug}
          onEnter={() => schedule(s.slug, 0)}
          onClose={() => setOpenSlug(null)}
        />
      ))}
    </nav>
  );
}

function MegaMenu({
  section,
  sections,
  open,
  onEnter,
  onClose,
}: {
  section: NavSection;
  sections: NavSection[];
  open: boolean;
  onEnter: () => void;
  onClose: () => void;
}) {
  const isOffers = section.kind === "offers";
  const offerFilters = sections.filter((s) => s.kind === "section");

  return (
    <div
      id={`mega-${section.slug}`}
      hidden={!open}
      onMouseEnter={onEnter}
      className="absolute inset-x-0 top-full z-40 hidden border-t border-azul/10 bg-blanco shadow-[0_12px_24px_-12px_rgba(33,54,129,0.25)] lg:block [&[hidden]]:hidden"
    >
      <div className="mx-auto grid max-w-tienda grid-cols-[1fr_1.2fr_1fr] gap-12 px-10 py-10">
        {/* Columna 1: subsecciones */}
        <div>
          <p className="mb-4 text-xs font-bold uppercase tracking-[0.15em] text-gris-tinta">
            {isOffers ? "Ofertas por sección" : section.name}
          </p>
          <ul className="space-y-1">
            <li>
              <Link href={section.href} onClick={onClose} className="flex min-h-10 items-center gap-1 text-base font-bold text-azul hover:underline">
                Ver todo {isOffers ? "en ofertas" : section.name} <ChevronRightIcon size={16} />
              </Link>
            </li>
            {isOffers
              ? offerFilters.map((f) => (
                  <li key={f.id}>
                    <Link href={`/ofertas?seccion=${f.slug}`} onClick={onClose} className="flex min-h-10 items-center text-base text-azul hover:underline">
                      {f.name}
                    </Link>
                  </li>
                ))
              : section.children.map((c) => (
                  <li key={c.id}>
                    <Link href={c.href} onClick={onClose} className="flex min-h-10 items-center text-base text-azul hover:underline">
                      {c.name}
                    </Link>
                  </li>
                ))}
          </ul>
        </div>

        {/* Columna 2: Buscá por talle */}
        <div>
          {section.sizeRange.length > 0 && (
            <>
              <p className="mb-4 text-xs font-bold uppercase tracking-[0.15em] text-gris-tinta">Buscá por talle</p>
              <ul className="grid grid-cols-5 gap-2">
                {section.sizeRange.map((size) => (
                  <li key={size}>
                    <Link
                      href={`${section.href}?talle=${size}`}
                      onClick={onClose}
                      className="flex h-11 items-center justify-center rounded-md border border-azul/25 text-sm font-semibold text-azul transition-colors hover:border-azul hover:bg-azul hover:text-blanco"
                    >
                      {size}
                    </Link>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>

        {/* Columna 3: promo destacada */}
        <div>
          {section.promo && (
            <Link href={section.promo.link} onClick={onClose} className="group block overflow-hidden rounded-lg bg-rojo text-blanco">
              {section.promo.image && (
                <Image
                  src={section.promo.image}
                  alt=""
                  width={600}
                  height={600}
                  className="aspect-[4/3] w-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
              )}
              <span className="block px-5 py-4 font-campana text-xl uppercase leading-tight">{section.promo.title}</span>
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

