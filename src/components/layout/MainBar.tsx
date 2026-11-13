"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { UserIcon } from "@/components/ui/icons";
import type { NavSection, StoreSettings } from "@/lib/data/types";
import { CartButton } from "./CartButton";
import { MobileMenu } from "./MobileMenu";
import { SearchBox } from "./SearchBox";

/**
 * Barra principal roja: logo a la izquierda; buscador, usuario y carrito a la derecha.
 * En mobile: hamburguesa + logo + buscador + carrito en una sola fila. Al enfocar el
 * buscador se ensancha y tapa el logo para escribir cómodo.
 */
export function MainBar({ sections, settings }: { sections: NavSection[]; settings: StoreSettings }) {
  const [searching, setSearching] = useState(false);

  return (
    <div className="on-dark bg-rojo text-blanco">
      <div className="mx-auto flex h-16 max-w-tienda items-center gap-1 px-2 sm:gap-3 sm:px-4 lg:h-20 lg:px-6">
        <MobileMenu sections={sections} settings={settings} />

        <Link
          href="/"
          aria-label="Albertito Calzados, ir al inicio"
          // Área libre ≈ ancho de la letra O (1/8 del logo) a cada lado
          className={`shrink-0 px-2 py-1.5 lg:px-3 ${searching ? "hidden sm:block" : ""}`}
        >
          <Image
            src="/brand/logo-sobre-rojo.png"
            alt="Albertito Calzados"
            width={488}
            height={231}
            priority
            className="h-auto w-[96px] lg:w-[132px]"
          />
        </Link>

        <div className="flex min-w-0 flex-1 justify-end">
          <div className="w-full max-w-md">
            <SearchBox onFocusChange={setSearching} />
          </div>
        </div>

        <Link
          href="/cuenta"
          className="hidden size-11 items-center justify-center rounded-full transition-colors hover:bg-white/15 sm:flex"
          aria-label="Mi cuenta"
        >
          <UserIcon size={26} />
        </Link>
        <CartButton />
      </div>
    </div>
  );
}
