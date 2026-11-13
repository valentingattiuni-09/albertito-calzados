"use client";

import { useEffect, useRef, useState } from "react";
import { BagIcon } from "@/components/ui/icons";
import { useCartCount } from "@/lib/cart/store";

/** Ícono del carrito con contador. Se anima cuando cambia la cantidad. */
export function CartButton() {
  const count = useCartCount();
  const prev = useRef(count);
  const [bump, setBump] = useState(false);

  useEffect(() => {
    if (count !== prev.current) {
      prev.current = count;
      setBump(true);
      const t = setTimeout(() => setBump(false), 400);
      return () => clearTimeout(t);
    }
  }, [count]);

  return (
    <button
      type="button"
      // El drawer del carrito llega en la Fase 4; escucha este evento.
      onClick={() => window.dispatchEvent(new Event("albertito:open-cart"))}
      className="relative flex size-11 items-center justify-center rounded-full text-blanco transition-colors hover:bg-white/15"
      aria-label={count > 0 ? `Tu carrito: ${count} ${count === 1 ? "producto" : "productos"}` : "Tu carrito está vacío"}
    >
      <BagIcon size={26} />
      {count > 0 && (
        <span
          className={`absolute right-0.5 top-0.5 flex min-w-5 items-center justify-center rounded-full bg-blanco px-1 text-[11px] font-bold leading-5 text-rojo ${bump ? "animate-bump" : ""}`}
          aria-hidden
        >
          {count > 99 ? "99+" : count}
        </span>
      )}
    </button>
  );
}
