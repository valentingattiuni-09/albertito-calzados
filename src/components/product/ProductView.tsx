"use client";

import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ShippingQuoter } from "@/components/shipping/ShippingQuoter";
import { MinusIcon, PlusIcon, WhatsAppIcon } from "@/components/ui/icons";
import { analytics } from "@/lib/analytics";
import { addToCart } from "@/lib/cart/store";
import type { PaymentPromo, ProductDetail } from "@/lib/data/types";
import { formatPrice, whatsappLink } from "@/lib/format";
import { priceWithoutTaxes } from "@/lib/pricing";
import { FavoriteButton } from "./FavoriteButton";
import { Gallery } from "./Gallery";
import { PaymentsInfo } from "./PaymentsInfo";
import { LineBadge } from "./ProductCard";
import { SizeGuide } from "./SizeGuide";

type Props = {
  product: ProductDetail;
  promos: PaymentPromo[];
  initialColor: string;
  whatsappNumber: string;
  taxFactor: number;
  kids: boolean;
  storeAddress: string;
  /** Fase A con el back office: compras y cotización de envío apagadas (se muestra este aviso) */
  checkoutClosed?: string;
};

export function ProductView({ product: p, promos, initialColor, whatsappNumber, taxFactor, kids, storeAddress, checkoutClosed }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const [color, setColor] = useState(initialColor);
  const [size, setSize] = useState<string | null>(null);
  const [qty, setQty] = useState(1);
  const [sizeError, setSizeError] = useState(false);
  const [added, setAdded] = useState(false);
  const sizesRef = useRef<HTMLFieldSetElement>(null);

  const colorInfo = p.colors.find((c) => c.slug === color) ?? p.colors[0];
  const media = p.media.filter((m) => m.colorSlug === colorInfo?.slug || m.colorSlug === null);
  const variants = p.variants.filter((v) => v.colorSlug === colorInfo?.slug).sort((a, b) => a.sizeSort - b.sizeSort);
  const variant = variants.find((v) => v.size === size) ?? null;
  const maxQty = Math.min(variant?.stock ?? 10, 10);

  // Analítica: vista de producto (una vez por producto)
  useEffect(() => {
    analytics.viewItem({ id: p.skuBase ?? p.id, name: p.name, price: p.price, category: p.line });
  }, [p.id, p.name, p.price, p.skuBase, p.line]);

  useEffect(() => {
    if (!added) return;
    const t = setTimeout(() => setAdded(false), 2500);
    return () => clearTimeout(t);
  }, [added]);

  const chooseColor = (slug: string) => {
    setColor(slug);
    // Si el talle elegido no tiene stock en el nuevo color, se limpia
    const v = p.variants.find((x) => x.colorSlug === slug && x.size === size);
    if (!v || v.stock === 0) setSize(null);
    setQty(1);
    router.replace(`${pathname}?color=${slug}`, { scroll: false });
  };

  const add = () => {
    if (!variant) {
      setSizeError(true);
      sizesRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      sizesRef.current?.querySelector<HTMLButtonElement>("button:not([disabled])")?.focus({ preventScroll: true });
      return;
    }
    addToCart(
      {
        variantId: variant.id,
        productId: p.id,
        slug: p.slug,
        name: p.name,
        colorName: colorInfo?.name ?? "",
        colorSlug: colorInfo?.slug ?? "",
        size: variant.size,
        price: p.price,
        image: media.find((m) => m.type === "image")?.url ?? null,
        qty,
      },
      variant.stock,
    );
    analytics.addToCart({ id: variant.sku, name: p.name, price: p.price, quantity: qty, variant: `${colorInfo?.name ?? ""} ${variant.size}` });
    setAdded(true);
  };

  const waText = `¡Hola! Me interesa ${p.name}${colorInfo ? ` color ${colorInfo.name.toLowerCase()}` : ""}${size ? ` talle ${size}` : ""}.`;
  const outOfStock = variants.every((v) => v.stock === 0);

  return (
    <>
      <div className="grid gap-8 lg:grid-cols-[1.15fr_1fr] lg:gap-12">
        <Gallery key={colorInfo?.slug} media={media} name={p.name} />

        <div>
          <div className="flex items-start justify-between gap-3">
            <div>
              <LineBadge line={p.line} />
              <h1 className="mt-3 text-2xl font-bold uppercase leading-tight sm:text-3xl">{p.name}</h1>
              <p className="mt-1 text-xs text-gris-tinta">Código: {variant?.sku ?? p.skuBase}</p>
            </div>
            <FavoriteButton productId={p.id} productName={p.name} className="shrink-0 border border-azul/15" />
          </div>

          {/* Precio */}
          <div className="mt-5">
            <div className="flex flex-wrap items-baseline gap-x-3">
              <span className={`text-3xl font-bold ${p.onSale ? "text-rojo" : ""}`}>{formatPrice(p.price)}</span>
              {p.onSale && (
                <>
                  <span className="text-lg text-gris-tinta line-through">
                    <span className="sr-only">Antes </span>
                    {formatPrice(p.basePrice)}
                  </span>
                  <span className="rounded bg-rojo px-2 py-1 text-sm font-bold text-blanco">-{p.discountPct}%</span>
                </>
              )}
            </div>
            <p className="mt-1 text-xs italic text-gris-tinta">
              Precio sin impuestos nacionales: {formatPrice(priceWithoutTaxes(p.price, taxFactor))}
            </p>
          </div>

          <div className="mt-5">
            <PaymentsInfo price={p.price} promos={promos} />
          </div>

          {/* Color */}
          {p.colors.length > 0 && (
            <fieldset className="mt-6">
              <legend className="text-sm font-semibold">
                Color: <span className="font-normal">{colorInfo?.name}</span>
              </legend>
              <div className="mt-2 flex flex-wrap gap-2">
                {p.colors.map((c) => {
                  const thumb = p.media.find((m) => m.colorSlug === c.slug && m.type === "image");
                  const active = c.slug === colorInfo?.slug;
                  return (
                    <button
                      key={c.slug}
                      type="button"
                      onClick={() => chooseColor(c.slug)}
                      aria-pressed={active}
                      aria-label={c.name}
                      title={c.name}
                      className={`relative size-16 overflow-hidden rounded-md border-2 ${active ? "border-azul" : "border-azul/15 hover:border-azul/50"}`}
                    >
                      {thumb ? (
                        <Image src={thumb.url} alt="" fill sizes="64px" className="object-contain" />
                      ) : (
                        <span className="absolute inset-2 rounded-full" style={{ backgroundColor: c.hex }} />
                      )}
                    </button>
                  );
                })}
              </div>
            </fieldset>
          )}

          {/* Talle */}
          <fieldset ref={sizesRef} className="mt-6" aria-describedby={sizeError ? "size-error" : undefined}>
            <div className="flex items-center justify-between">
              <legend className="text-sm font-semibold">Elegí tu talle</legend>
              <SizeGuide kids={kids} />
            </div>
            <div
              className={`mt-2 grid grid-cols-5 gap-2 rounded-lg sm:grid-cols-6 ${sizeError ? "ring-2 ring-rojo ring-offset-4" : ""}`}
            >
              {variants.map((v) => {
                const none = v.stock === 0;
                const active = v.size === size;
                return (
                  <button
                    key={v.id}
                    type="button"
                    disabled={none}
                    onClick={() => {
                      setSize(v.size);
                      setSizeError(false);
                      setQty((q) => Math.min(q, v.stock));
                    }}
                    aria-pressed={active}
                    aria-label={none ? `Talle ${v.size}, sin stock` : `Talle ${v.size}`}
                    className={`relative flex h-12 items-center justify-center rounded-md border text-sm font-semibold transition-colors ${
                      none
                        ? "cursor-not-allowed border-azul/10 text-gris-tinta/60 line-through"
                        : active
                          ? "border-azul bg-azul text-blanco"
                          : "border-azul/30 hover:border-azul"
                    }`}
                  >
                    {v.size}
                  </button>
                );
              })}
            </div>
            {sizeError && (
              <p id="size-error" role="alert" className="mt-3 text-sm font-bold text-rojo">
                Elegí tu talle
              </p>
            )}
            {variant && variant.stock <= 2 && (
              <p className="mt-3 text-sm font-semibold">¡Queda{variant.stock === 1 ? " 1 par" : `n ${variant.stock} pares`} en tu talle!</p>
            )}
          </fieldset>

          {/* Cantidad + agregar */}
          <div className="mt-6 flex gap-3">
            <div className="flex h-14 items-center rounded-md border border-azul/30" role="group" aria-label="Cantidad">
              <button
                type="button"
                onClick={() => setQty((q) => Math.max(1, q - 1))}
                disabled={qty <= 1}
                className="flex size-12 items-center justify-center disabled:opacity-30"
                aria-label="Restar uno"
              >
                <MinusIcon size={18} />
              </button>
              <span className="w-8 text-center text-base font-bold" aria-live="polite">
                {qty}
              </span>
              <button
                type="button"
                onClick={() => setQty((q) => Math.min(maxQty, q + 1))}
                disabled={qty >= maxQty}
                className="flex size-12 items-center justify-center disabled:opacity-30"
                aria-label="Sumar uno"
              >
                <PlusIcon size={18} />
              </button>
            </div>
            <button
              type="button"
              onClick={add}
              disabled={outOfStock}
              className="h-14 flex-1 rounded-md bg-rojo text-base font-bold uppercase tracking-wide text-blanco transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {outOfStock ? "Sin stock en este color" : added ? "¡Agregado!" : "Agregar al carrito"}
            </button>
          </div>
          <p className="sr-only" role="status">
            {added ? `${p.name} talle ${size} agregado al carrito` : ""}
          </p>

          <a
            href={whatsappLink(whatsappNumber, waText)}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 flex h-12 items-center justify-center gap-2 rounded-md bg-whatsapp text-sm font-bold text-blanco hover:bg-whatsapp-oscuro"
          >
            <WhatsAppIcon size={20} /> Consultá por WhatsApp
          </a>

          {/* Envío: con el talle elegido cotiza esa variante; si no, el producto */}
          <div className="mt-6">
            {checkoutClosed ? (
              <p role="note" className="text-sm font-medium">{checkoutClosed}</p>
            ) : (
              <ShippingQuoter request={variant ? { items: [{ variantId: variant.id, qty }] } : { productId: p.id, qty }} />
            )}
            <p className="mt-2 text-xs text-gris-tinta">Retiro gratis en el local: {storeAddress}.</p>
          </div>
        </div>
      </div>

      {/* Barra fija inferior en mobile */}
      <div data-sticky-buy className="fixed inset-x-0 bottom-0 z-30 flex items-center gap-3 border-t border-azul/15 bg-blanco px-4 py-3 [padding-bottom:max(0.75rem,env(safe-area-inset-bottom))] lg:hidden">
        <div className="min-w-0">
          <p className={`text-lg font-bold leading-tight ${p.onSale ? "text-rojo" : ""}`}>{formatPrice(p.price)}</p>
          <p className="truncate text-xs text-gris-tinta">{size ? `Talle ${size}` : "Elegí tu talle"}</p>
        </div>
        <button
          type="button"
          onClick={add}
          disabled={outOfStock}
          className="h-12 flex-1 rounded-md bg-rojo text-sm font-bold uppercase text-blanco disabled:opacity-50"
        >
          {added ? "¡Agregado!" : "Agregar al carrito"}
        </button>
      </div>
    </>
  );
}
