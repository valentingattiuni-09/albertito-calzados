"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import type { ProductMedia } from "@/lib/data/types";

/**
 * Galería de la ficha: swipe en mobile (scroll-snap), miniaturas + zoom al pasar el mouse en desktop.
 * Los videos se cargan recién cuando se muestran (preload="none").
 */
export function Gallery({ media, name }: { media: ProductMedia[]; name: string }) {
  const [index, setIndex] = useState(0);
  const [zoom, setZoom] = useState<{ x: number; y: number } | null>(null);
  const track = useRef<HTMLDivElement>(null);
  const current = Math.min(index, media.length - 1);

  const goTo = (i: number) => {
    setIndex(i);
    const el = track.current;
    if (el) el.scrollTo({ left: el.clientWidth * i, behavior: "smooth" });
  };

  if (media.length === 0) return <div className="aspect-square rounded-lg border border-azul/10" />;

  return (
    <div className="lg:grid lg:grid-cols-[5rem_1fr] lg:gap-4">
      {/* Miniaturas (desktop) */}
      <ul className="hidden max-h-[36rem] flex-col gap-3 overflow-y-auto lg:flex" aria-label="Fotos">
        {media.map((m, i) => (
          <li key={m.url}>
            <button
              type="button"
              onClick={() => goTo(i)}
              aria-label={`Ver foto ${i + 1} de ${media.length}`}
              aria-current={i === current}
              className={`relative block aspect-square w-full overflow-hidden rounded-md border-2 ${
                i === current ? "border-azul" : "border-azul/10 hover:border-azul/40"
              }`}
            >
              {m.type === "video" ? (
                <span className="flex h-full items-center justify-center text-xs font-bold">VIDEO</span>
              ) : (
                <Image src={m.url} alt="" fill sizes="80px" className="object-contain" />
              )}
            </button>
          </li>
        ))}
      </ul>

      <div className="relative">
        <div
          ref={track}
          onScroll={(e) => {
            const el = e.currentTarget;
            const i = Math.round(el.scrollLeft / el.clientWidth);
            if (i !== index) setIndex(i);
          }}
          className="no-scrollbar flex snap-x snap-mandatory overflow-x-auto rounded-lg border border-azul/10"
          aria-roledescription="carrusel"
        >
          {media.map((m, i) => (
            <div
              key={m.url}
              className="relative aspect-square w-full shrink-0 snap-center overflow-hidden"
              aria-label={`Foto ${i + 1} de ${media.length}`}
              onMouseMove={(e) => {
                if (m.type === "video" || window.matchMedia("(hover: none)").matches) return;
                const r = e.currentTarget.getBoundingClientRect();
                setZoom({ x: ((e.clientX - r.left) / r.width) * 100, y: ((e.clientY - r.top) / r.height) * 100 });
              }}
              onMouseLeave={() => setZoom(null)}
            >
              {m.type === "video" ? (
                <video src={m.url} controls playsInline preload="none" className="h-full w-full object-contain" />
              ) : (
                <Image
                  src={m.url}
                  alt={m.alt || name}
                  fill
                  priority={i === 0}
                  sizes="(min-width: 1024px) 45vw, 100vw"
                  className="object-contain transition-transform duration-150"
                  style={
                    zoom && i === current
                      ? { transform: "scale(2)", transformOrigin: `${zoom.x}% ${zoom.y}%`, cursor: "zoom-in" }
                      : undefined
                  }
                />
              )}
            </div>
          ))}
        </div>

        {/* Puntitos (mobile) */}
        {media.length > 1 && (
          <div className="mt-3 flex justify-center gap-1.5 lg:hidden">
            {media.map((m, i) => (
              <button
                key={m.url}
                type="button"
                onClick={() => goTo(i)}
                aria-label={`Ver foto ${i + 1}`}
                className="flex size-6 items-center justify-center"
              >
                <span className={`block size-2 rounded-full ${i === current ? "bg-azul" : "bg-azul/25"}`} />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
