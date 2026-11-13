"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeftIcon, ChevronRightIcon } from "@/components/ui/icons";
import type { HomeBanner } from "@/lib/data/home";

const INTERVAL = 6000;

/**
 * Hero en carrusel: imagen (desktop/mobile) o video por banner, autoplay con botón de pausa,
 * se frena al pasar el mouse o enfocar, y no se mueve solo si el sistema pide "reducir movimiento".
 */
export function Hero({ banners }: { banners: HomeBanner[] }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [hovering, setHovering] = useState(false);
  const [reduced, setReduced] = useState(false);
  const track = useRef<HTMLDivElement>(null);
  const count = banners.length;

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  const goTo = useCallback(
    (i: number) => {
      const next = (i + count) % count;
      const el = track.current;
      if (el) el.scrollTo({ left: el.clientWidth * next, behavior: reduced ? "auto" : "smooth" });
      setIndex(next);
    },
    [count, reduced],
  );

  useEffect(() => {
    if (count < 2 || paused || hovering || reduced) return;
    const t = setTimeout(() => goTo(index + 1), INTERVAL);
    return () => clearTimeout(t);
  }, [index, paused, hovering, reduced, count, goTo]);

  if (count === 0) return null;

  return (
    <section
      aria-roledescription="carrusel"
      aria-label="Promociones destacadas"
      className="relative"
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
      onFocusCapture={() => setHovering(true)}
      onBlurCapture={() => setHovering(false)}
    >
      <div
        ref={track}
        onScroll={(e) => {
          const el = e.currentTarget;
          const i = Math.round(el.scrollLeft / el.clientWidth);
          if (i !== index) setIndex(i);
        }}
        className="no-scrollbar flex snap-x snap-mandatory overflow-x-auto bg-rojo"
      >
        {banners.map((b, i) => {
          const media = b.videoUrl ? (
            <video
              src={b.videoUrl}
              muted
              loop
              playsInline
              autoPlay={i === index && !reduced}
              preload={i === 0 ? "metadata" : "none"}
              poster={b.imageDesktop ?? undefined}
              className="aspect-square w-full object-cover md:aspect-[8/3]"
              aria-label={b.alt}
            />
          ) : (
            <picture>
              {b.imageMobile && <source media="(max-width: 767px)" srcSet={b.imageMobile} />}
              <Image
                src={b.imageDesktop ?? b.imageMobile ?? ""}
                alt={b.alt}
                width={1600}
                height={600}
                priority={i === 0}
                fetchPriority={i === 0 ? "high" : "auto"}
                sizes="100vw"
                className="aspect-square w-full object-cover md:aspect-[8/3]"
              />
            </picture>
          );
          return (
            <div
              key={b.id}
              role="group"
              aria-roledescription="diapositiva"
              aria-label={`${i + 1} de ${count}`}
              aria-hidden={i !== index}
              className="w-full shrink-0 snap-center"
            >
              {b.link ? (
                <Link href={b.link} tabIndex={i === index ? 0 : -1} className="block">
                  {media}
                </Link>
              ) : (
                media
              )}
            </div>
          );
        })}
      </div>

      {count > 1 && (
        <>
          <button
            type="button"
            onClick={() => goTo(index - 1)}
            aria-label="Banner anterior"
            className="absolute left-3 top-1/2 hidden size-11 -translate-y-1/2 items-center justify-center rounded-full bg-blanco/90 text-azul shadow md:flex"
          >
            <ChevronLeftIcon />
          </button>
          <button
            type="button"
            onClick={() => goTo(index + 1)}
            aria-label="Banner siguiente"
            className="absolute right-3 top-1/2 hidden size-11 -translate-y-1/2 items-center justify-center rounded-full bg-blanco/90 text-azul shadow md:flex"
          >
            <ChevronRightIcon />
          </button>

          <div className="absolute inset-x-0 bottom-3 flex items-center justify-center gap-1">
            {banners.map((b, i) => (
              <button
                key={b.id}
                type="button"
                onClick={() => goTo(i)}
                aria-label={`Ir al banner ${i + 1}`}
                aria-current={i === index}
                className="flex size-7 items-center justify-center"
              >
                <span className={`block h-2 rounded-full bg-blanco transition-all ${i === index ? "w-6" : "w-2 opacity-60"}`} />
              </button>
            ))}
            {!reduced && (
              <button
                type="button"
                onClick={() => setPaused((p) => !p)}
                aria-label={paused ? "Reanudar el carrusel" : "Pausar el carrusel"}
                className="ml-1 flex size-7 items-center justify-center rounded-full bg-blanco/90 text-azul"
              >
                {paused ? (
                  <svg viewBox="0 0 16 16" className="size-3" fill="currentColor" aria-hidden>
                    <path d="M4 2l10 6-10 6z" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 16 16" className="size-3" fill="currentColor" aria-hidden>
                    <path d="M4 2h3v12H4zM9 2h3v12H9z" />
                  </svg>
                )}
              </button>
            )}
          </div>
        </>
      )}
    </section>
  );
}
