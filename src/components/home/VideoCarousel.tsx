"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ChevronLeftIcon, ChevronRightIcon, CloseIcon, PlayIcon } from "@/components/ui/icons";
import type { HomeVideo } from "@/lib/data/home";
import { formatPrice } from "@/lib/format";

/** Convierte un link de reel/post de Instagram en su URL de embed. */
function instagramEmbed(url: string): string | null {
  const m = url.match(/instagram\.com\/(?:[\w.]+\/)?(reel|reels|p|tv)\/([\w-]+)/i);
  if (!m) return null;
  const kind = m[1].toLowerCase() === "p" ? "p" : "reel";
  return `https://www.instagram.com/${kind}/${m[2]}/embed`;
}

function Player({ video }: { video: HomeVideo }) {
  if (video.source === "instagram" && video.instagramUrl) {
    const src = instagramEmbed(video.instagramUrl);
    if (src)
      return (
        <iframe
          src={src}
          title={video.caption ?? "Video de Instagram"}
          className="h-full w-full bg-blanco"
          allow="autoplay; encrypted-media"
          loading="lazy"
        />
      );
  }
  if (video.mediaUrl)
    return (
      <video
        key={video.id}
        src={video.mediaUrl}
        poster={video.thumbnail ?? undefined}
        autoPlay
        controls
        playsInline
        className="h-full w-full bg-black object-contain"
      />
    );
  // Sin video cargado (modo demo): portada
  return video.thumbnail ? (
    <Image src={video.thumbnail} alt={video.caption ?? ""} fill sizes="400px" className="object-cover" />
  ) : null;
}

/**
 * "Mirá cómo quedan": carrusel de videos verticales 9:16. Al tocar uno se abre un modal
 * con el video, flechas para pasar y botón "Ver producto". Los videos solo se cargan al abrirlos.
 */
export function VideoCarousel({ videos }: { videos: HomeVideo[] }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [current, setCurrent] = useState<number | null>(null);

  const open = (i: number) => {
    setCurrent(i);
    dialog.current?.showModal();
  };
  const close = () => dialog.current?.close();
  const move = (dir: 1 | -1) => setCurrent((c) => (c === null ? c : (c + dir + videos.length) % videos.length));

  useEffect(() => {
    const d = dialog.current;
    if (!d) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") move(1);
      if (e.key === "ArrowLeft") move(-1);
    };
    const onClose = () => setCurrent(null);
    d.addEventListener("keydown", onKey);
    d.addEventListener("close", onClose);
    return () => {
      d.removeEventListener("keydown", onKey);
      d.removeEventListener("close", onClose);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videos.length]);

  if (videos.length === 0) return null;
  const video = current !== null ? videos[current] : null;

  return (
    <>
      <ul className="no-scrollbar -mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-px-4 px-4 pb-2 lg:mx-0 lg:gap-4 lg:px-0">
        {videos.map((v, i) => (
          <li key={v.id} className="w-[40vw] shrink-0 snap-start sm:w-[28vw] lg:w-[calc((100%-5*1rem)/6)]">
            <button
              type="button"
              onClick={() => open(i)}
              className="group relative block aspect-[9/16] w-full overflow-hidden rounded-lg bg-azul text-left"
              aria-label={`Ver video${v.caption ? `: ${v.caption}` : ""}${v.product ? `, ${v.product.name}` : ""}`}
            >
              {v.thumbnail && (
                <Image
                  src={v.thumbnail}
                  alt=""
                  fill
                  sizes="(min-width: 1024px) 16vw, 40vw"
                  className="object-cover transition-transform duration-300 group-hover:scale-105"
                />
              )}
              <span className="absolute left-1/2 top-1/2 flex size-14 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-blanco/90 text-rojo shadow-lg">
                <PlayIcon size={26} />
              </span>
              {v.product && (
                <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-3 pb-3 pt-10 text-sm font-semibold leading-tight text-blanco">
                  {v.product.name}
                </span>
              )}
            </button>
          </li>
        ))}
      </ul>

      <dialog
        ref={dialog}
        aria-label="Video"
        onClick={(e) => e.target === dialog.current && close()}
        className="m-auto h-dvh max-h-none w-full max-w-none bg-transparent p-0 backdrop:bg-black/80 sm:h-[min(90dvh,52rem)] sm:w-auto"
      >
        {video && (
          <div className="relative flex h-full items-center justify-center gap-4 sm:px-16">
            <div className="relative flex h-full w-full flex-col overflow-hidden bg-black sm:aspect-[9/16] sm:w-auto sm:rounded-xl">
              <div className="relative flex-1">
                <Player video={video} />
              </div>
              {video.product && (
                <div className="flex items-center gap-3 bg-blanco p-3 text-azul [padding-bottom:max(0.75rem,env(safe-area-inset-bottom))]">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{video.product.name}</p>
                    <p className="text-sm">
                      <span className={`font-bold ${video.product.onSale ? "text-rojo" : ""}`}>{formatPrice(video.product.price)}</span>
                      {video.product.onSale && (
                        <span className="ml-2 text-xs text-gris-tinta line-through">{formatPrice(video.product.basePrice)}</span>
                      )}
                    </p>
                  </div>
                  <Link
                    href={`/producto/${video.product.slug}`}
                    onClick={close}
                    className="inline-flex h-11 shrink-0 items-center rounded-md bg-rojo px-4 text-sm font-bold uppercase text-blanco"
                  >
                    Ver producto
                  </Link>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={close}
              aria-label="Cerrar video"
              className="absolute right-3 top-3 flex size-11 items-center justify-center rounded-full bg-blanco text-azul shadow sm:right-0 sm:top-0"
            >
              <CloseIcon />
            </button>
            {videos.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={() => move(-1)}
                  aria-label="Video anterior"
                  className="absolute left-2 top-1/2 flex size-11 -translate-y-1/2 items-center justify-center rounded-full bg-blanco/90 text-azul shadow sm:left-0"
                >
                  <ChevronLeftIcon />
                </button>
                <button
                  type="button"
                  onClick={() => move(1)}
                  aria-label="Video siguiente"
                  className="absolute right-2 top-1/2 flex size-11 -translate-y-1/2 items-center justify-center rounded-full bg-blanco/90 text-azul shadow sm:right-0"
                >
                  <ChevronRightIcon />
                </button>
              </>
            )}
            <p className="sr-only" aria-live="polite">
              Video {current! + 1} de {videos.length}
            </p>
          </div>
        )}
      </dialog>
    </>
  );
}
