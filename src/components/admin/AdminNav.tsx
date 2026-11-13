"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ADMIN_SECTIONS } from "./sections";


/** Menú del panel: fila deslizable en el celular, columna en desktop. */
export function AdminNav() {
  const pathname = usePathname();
  const isActive = (href: string) => (href === "/admin" ? pathname === "/admin" : pathname.startsWith(href));
  return (
    <nav aria-label="Panel">
      <ul className="no-scrollbar flex gap-1 overflow-x-auto px-3 py-2 lg:flex-col lg:overflow-visible lg:px-0 lg:py-0">
        {ADMIN_SECTIONS.map((s) => (
          <li key={s.href} className="shrink-0">
            <Link
              href={s.href}
              aria-current={isActive(s.href) ? "page" : undefined}
              className={`flex min-h-11 items-center rounded-md px-3 text-sm font-semibold ${
                isActive(s.href) ? "bg-azul text-blanco" : "hover:bg-azul/5"
              }`}
            >
              {s.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
