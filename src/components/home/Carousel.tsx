"use client";

import { Children, useRef } from "react";
import { ChevronLeftIcon, ChevronRightIcon } from "@/components/ui/icons";

/**
 * Carrusel horizontal liviano (scroll-snap). En mobile se desliza con el dedo;
 * en desktop suma flechas. Los ítems los arma el servidor.
 */
export function Carousel({
  label,
  children,
  itemClassName = "w-[44vw] sm:w-[30vw] lg:w-[calc((100%-3*1.25rem)/4)]",
}: {
  label: string;
  children: React.ReactNode;
  itemClassName?: string;
}) {
  const track = useRef<HTMLUListElement>(null);
  const scroll = (dir: 1 | -1) => {
    const el = track.current;
    if (el) el.scrollBy({ left: dir * el.clientWidth * 0.9, behavior: "smooth" });
  };

  return (
    <div className="relative" role="region" aria-roledescription="carrusel" aria-label={label}>
      <ul ref={track} className="no-scrollbar -mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-px-4 px-4 pb-2 sm:gap-5 lg:mx-0 lg:scroll-px-0 lg:px-0">
        {Children.map(children, (child) => (
          <li className={`shrink-0 snap-start ${itemClassName}`}>{child}</li>
        ))}
      </ul>
      <button
        type="button"
        onClick={() => scroll(-1)}
        aria-label="Anteriores"
        className="absolute -left-5 top-[35%] hidden size-11 items-center justify-center rounded-full border border-azul/15 bg-blanco text-azul shadow-md lg:flex"
      >
        <ChevronLeftIcon />
      </button>
      <button
        type="button"
        onClick={() => scroll(1)}
        aria-label="Siguientes"
        className="absolute -right-5 top-[35%] hidden size-11 items-center justify-center rounded-full border border-azul/15 bg-blanco text-azul shadow-md lg:flex"
      >
        <ChevronRightIcon />
      </button>
    </div>
  );
}
