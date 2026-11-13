"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { SORTS, type SortKey } from "@/lib/catalog/filters";

export function SortSelect({ value, includeRelevance = false }: { value: SortKey | "relevancia"; includeRelevance?: boolean }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const options = includeRelevance ? [{ key: "relevancia", label: "Más relevantes" }, ...SORTS] : SORTS;

  return (
    <label className="flex items-center gap-2 text-sm">
      <span className="hidden text-gris-tinta sm:inline">Ordenar por</span>
      <select
        value={value}
        onChange={(e) => {
          const next = new URLSearchParams(params);
          const v = e.target.value;
          if (v === (includeRelevance ? "relevancia" : "nuevos")) next.delete("orden");
          else next.set("orden", v);
          next.delete("pagina");
          const qs = next.toString();
          router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
        }}
        className="h-11 rounded-md border border-azul/25 bg-blanco px-3 pr-8 text-sm font-medium text-azul"
        aria-label="Ordenar por"
      >
        {options.map((o) => (
          <option key={o.key} value={o.key}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}
