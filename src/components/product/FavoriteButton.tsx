"use client";

import { HeartIcon } from "@/components/ui/icons";
import { toggleFavorite, useFavorites } from "@/lib/favorites";

export function FavoriteButton({ productId, productName, className = "" }: { productId: string; productName: string; className?: string }) {
  const active = useFavorites().includes(productId);
  return (
    <button
      type="button"
      onClick={() => toggleFavorite(productId)}
      aria-pressed={active}
      aria-label={active ? `Sacar ${productName} de favoritos` : `Guardar ${productName} en favoritos`}
      className={`flex size-11 items-center justify-center rounded-full bg-blanco/90 text-rojo transition-transform hover:scale-110 ${className}`}
    >
      <HeartIcon size={22} fill={active ? "currentColor" : "none"} />
    </button>
  );
}
