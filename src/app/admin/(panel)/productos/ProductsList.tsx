"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { InstantToggle, inputCls } from "@/components/admin/ui";
import type { AdminProductSummary } from "@/lib/admin/repo";
import { formatPrice } from "@/lib/format";
import { toggleProductAction } from "../../actions";

const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

export function ProductsList({
  products,
  sections,
  initialFilter,
}: {
  products: AdminProductSummary[];
  sections: { id: string; name: string }[];
  initialFilter: string;
}) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [section, setSection] = useState("");
  const [filter, setFilter] = useState(initialFilter);

  const list = useMemo(
    () =>
      products.filter(
        (p) =>
          (!q || norm(p.name).includes(norm(q)) || p.slug.includes(norm(q))) &&
          (!section || p.categoryIds.includes(section)) &&
          (filter !== "sin-stock" || (p.active && p.stock === 0)) &&
          (filter !== "inactivos" || !p.active) &&
          (filter !== "seleccion" || p.line === "seleccion"),
      ),
    [products, q, section, filter],
  );

  return (
    <div className="space-y-4">
      <div className="grid gap-2 sm:grid-cols-[1fr_auto_auto]">
        <label>
          <span className="sr-only">Buscar</span>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por nombre…" className={inputCls} />
        </label>
        <label>
          <span className="sr-only">Sección</span>
          <select value={section} onChange={(e) => setSection(e.target.value)} className={inputCls}>
            <option value="">Todas las secciones</option>
            {sections.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className="sr-only">Filtro</span>
          <select value={filter} onChange={(e) => setFilter(e.target.value)} className={inputCls}>
            <option value="">Todos</option>
            <option value="sin-stock">Sin stock</option>
            <option value="inactivos">Ocultos</option>
            <option value="seleccion">Selección Albertito</option>
          </select>
        </label>
      </div>
      <p className="text-sm text-gris-tinta">{list.length} productos</p>

      <ul className="divide-y divide-azul/10 rounded-xl border border-azul/15">
        {list.map((p) => (
          <li key={p.id} className="flex flex-wrap items-center gap-3 p-3">
            <span className="relative size-14 shrink-0 overflow-hidden rounded border border-azul/10">
              {p.image && <Image src={p.image} alt="" fill sizes="56px" className="object-contain" />}
            </span>
            <Link href={`/admin/productos/${p.id}`} className="min-w-0 flex-1">
              <span className="block truncate font-semibold hover:underline">{p.name}</span>
              <span className="text-sm text-gris-tinta">
                {formatPrice(p.isOffer && p.salePrice ? p.salePrice : p.basePrice)}
                {p.isOffer && " · en oferta"} · Stock {p.stock}
                {p.line === "seleccion" && " · Selección"}
              </span>
            </Link>
            {p.stock === 0 && p.active && <span className="rounded bg-rojo px-2 py-0.5 text-xs font-bold text-blanco">SIN STOCK</span>}
            <InstantToggle
              label="Visible"
              checked={p.active}
              onToggle={async (v) => {
                await toggleProductAction(p.id, v);
                router.refresh();
              }}
            />
            <Link href={`/admin/productos/${p.id}`} className="inline-flex h-9 items-center px-2 text-sm font-semibold underline">
              Editar
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
