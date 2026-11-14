import Image from "next/image";
import Link from "next/link";
import type { PaymentPromo, ProductCard as Card } from "@/lib/data/types";
import { formatPrice } from "@/lib/format";
import { bestInstallment } from "@/lib/pricing";
import { FavoriteButton } from "./FavoriteButton";

export function LineBadge({ line, className = "" }: { line: Card["line"]; className?: string }) {
  return line === "seleccion" ? (
    <span className={`inline-flex items-center rounded bg-azul px-2 py-1 text-xs font-bold uppercase leading-none tracking-wide text-blanco ${className}`}>
      Selección Albertito
    </span>
  ) : (
    // Blanco sobre rojo: mínimo 14px bold (manual de marca)
    <span className={`inline-flex items-center rounded bg-rojo px-2 py-1 text-sm font-bold uppercase leading-none text-blanco ${className}`}>
      De todos los días
    </span>
  );
}

/** Tarjeta de producto: igual en todo el sitio. */
export function ProductCard({
  product: p,
  promos,
  priority = false,
  sizes = "(min-width: 1024px) 22vw, 45vw",
}: {
  product: Card;
  promos: PaymentPromo[];
  priority?: boolean;
  sizes?: string;
}) {
  const cuota = bestInstallment(p.price, promos);
  const href = `/producto/${p.slug}`;
  const [img1, img2] = p.images;

  return (
    <article className="group relative flex h-full flex-col">
      <Link href={href} className="flex h-full flex-col rounded-lg focus-visible:outline-offset-4">
        <div className="relative aspect-square overflow-hidden rounded-lg border border-azul/10 bg-blanco">
          {img1 && (
            <Image
              src={img1}
              alt={p.name}
              fill
              sizes={sizes}
              priority={priority}
              className={`object-contain transition-opacity duration-300 ${img2 ? "group-hover:opacity-0" : ""}`}
            />
          )}
          {img2 && (
            <Image src={img2} alt="" fill sizes={sizes} className="object-contain opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
          )}

          <div className="absolute left-2 top-2 flex flex-col items-start gap-1">
            {p.onSale && (
              <span className="rounded bg-rojo px-2 py-1 text-sm font-bold leading-none text-blanco">-{p.discountPct}%</span>
            )}
            {p.isNew && (
              <span className="rounded border border-azul bg-blanco px-2 py-1 text-xs font-bold uppercase leading-none text-azul">Nuevo</span>
            )}
            {p.line === "seleccion" && <LineBadge line="seleccion" />}
          </div>
        </div>

        <div className="flex flex-1 flex-col pt-3">
          <h3 className="line-clamp-2 text-sm font-medium leading-snug text-azul sm:text-[15px]">{p.name}</h3>

          <div className="mt-1.5 flex flex-wrap items-baseline gap-x-2">
            <span className={`text-lg font-bold ${p.onSale ? "text-rojo" : "text-azul"}`}>{formatPrice(p.price)}</span>
            {p.onSale && (
              <span className="text-sm text-gris-tinta line-through">
                <span className="sr-only">Antes </span>
                {formatPrice(p.basePrice)}
              </span>
            )}
          </div>

          {cuota && (
            <p className="mt-0.5 text-[13px] font-medium text-azul">
              {cuota.installments} cuotas sin interés de {formatPrice(cuota.amount)}
            </p>
          )}

          {p.colors.length > 0 && (
            <div className="mt-2 flex items-center gap-1.5">
              <ul className="flex -space-x-0.5" aria-hidden>
                {p.colors.slice(0, 4).map((c) => (
                  <li key={c.slug} className="size-3.5 rounded-full border border-azul/25" style={{ backgroundColor: c.hex }} />
                ))}
              </ul>
              <span className="text-xs text-gris-tinta">
                {p.colors.length === 1 ? "1 color" : `${p.colors.length} colores`}
              </span>
            </div>
          )}

          <span className="mt-3 inline-flex h-11 items-center justify-center rounded-md border border-azul text-sm font-semibold text-azul transition-colors group-hover:bg-azul group-hover:text-blanco">
            Ver producto
          </span>
        </div>
      </Link>

      <FavoriteButton productId={p.id} productName={p.name} className="absolute right-1.5 top-1.5" />
    </article>
  );
}
