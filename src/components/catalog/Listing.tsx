import Form from "next/form";
import Link from "next/link";
import { CloseIcon } from "@/components/ui/icons";
import { ProductCard } from "@/components/product/ProductCard";
import {
  applyFilters,
  buildFacets,
  LINES,
  PAGE_SIZE,
  sortProducts,
  toQuery,
  withColor,
  withSize,
  type Facets,
  type Filters,
  type SortKey,
} from "@/lib/catalog/filters";
import type { PaymentPromo, ProductCard as Card } from "@/lib/data/types";
import { formatPrice } from "@/lib/format";
import { MobileFilters } from "./MobileFilters";
import { SortSelect } from "./SortSelect";

export type LinkOption = { name: string; href: string; active: boolean };

type Props = {
  basePath: string;
  products: Card[]; // conjunto base de la página (ya acotado a la sección o búsqueda)
  filters: Filters;
  promos: PaymentPromo[];
  /** Links a subsecciones (en una sección) */
  subsections?: LinkOption[];
  /** Filtro por sección (en /ofertas y /buscar) */
  sections?: { slug: string; name: string; id: string }[];
  /** Parámetros que se conservan siempre (ej. q en /buscar) */
  keep?: Record<string, string>;
  relevance?: boolean;
  hideOnSaleFilter?: boolean;
  empty?: React.ReactNode;
};

export function Listing({ basePath, products, filters, promos, subsections, sections, keep = {}, relevance, hideOnSaleFilter, empty }: Props) {
  const sectionIds = new Map((sections ?? []).map((s) => [s.slug, s.id]));
  const facets = buildFacets(products);
  const filtered = applyFilters(products, filters, sectionIds);
  const sortKey: SortKey | "relevancia" = filters.sort ?? (relevance ? "relevancia" : "nuevos");
  const sorted = sortProducts(filtered, sortKey);
  const visible = sorted.slice(0, filters.page * PAGE_SIZE);

  const href = (f: Partial<Filters>) => `${basePath}${toQuery({ ...filters, ...f }, keep)}`;
  const active = activeChips(filters, facets, sections ?? [], href);

  const options = (
    <FilterOptions
      filters={filters}
      facets={facets}
      href={href}
      basePath={basePath}
      keep={keep}
      subsections={subsections}
      sections={sections}
      hideOnSaleFilter={hideOnSaleFilter}
    />
  );

  return (
    <div className="mt-6 lg:grid lg:grid-cols-[15rem_1fr] lg:gap-10">
      <aside className="hidden lg:block" aria-label="Filtros">
        {options}
      </aside>

      <div>
        <div className="flex items-center justify-between gap-3 border-b border-azul/10 pb-4">
          <MobileFilters count={active.length} total={filtered.length}>
            {options}
          </MobileFilters>
          <p className="hidden text-sm text-gris-tinta lg:block" aria-live="polite">
            {filtered.length} {filtered.length === 1 ? "producto" : "productos"}
          </p>
          <SortSelect value={sortKey} includeRelevance={relevance} />
        </div>

        {active.length > 0 && (
          <ul className="mt-4 flex flex-wrap items-center gap-2" aria-label="Filtros aplicados">
            {active.map((chip) => (
              <li key={chip.label}>
                <Link
                  href={chip.remove}
                  scroll={false}
                  className="inline-flex h-9 items-center gap-1.5 rounded-full border border-azul bg-blanco pl-3 pr-2 text-sm font-medium"
                  aria-label={`Quitar filtro ${chip.label}`}
                >
                  {chip.label} <CloseIcon size={14} />
                </Link>
              </li>
            ))}
            <li>
              <Link href={`${basePath}${toQuery({ sort: filters.sort }, keep)}`} scroll={false} className="px-2 text-sm font-semibold underline underline-offset-4">
                Limpiar
              </Link>
            </li>
          </ul>
        )}

        {visible.length === 0 ? (
          (empty ?? (
            <div className="py-16 text-center">
              <p className="text-lg font-bold uppercase">No hay productos con esos filtros</p>
              <p className="mt-1 text-gris-tinta">Probá sacando alguno.</p>
            </div>
          ))
        ) : (
          <>
            <ul className="mt-6 grid grid-cols-2 gap-x-3 gap-y-8 sm:gap-x-5 lg:grid-cols-3 xl:grid-cols-4">
              {visible.map((p, i) => (
                <li key={p.id}>
                  <ProductCard product={p} promos={promos} priority={i < 4} />
                </li>
              ))}
            </ul>
            <div className="mt-10 flex flex-col items-center gap-3">
              <p className="text-sm text-gris-tinta">
                Viendo {visible.length} de {filtered.length}
              </p>
              {visible.length < filtered.length && (
                <Link
                  href={href({ page: filters.page + 1 })}
                  scroll={false}
                  className="inline-flex h-12 items-center rounded-md border-2 border-azul px-8 text-sm font-bold uppercase hover:bg-azul hover:text-blanco"
                >
                  Ver más
                </Link>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className="border-b border-azul/10 py-5 first:pt-0">
      <legend className="mb-3 text-xs font-bold uppercase tracking-[0.15em] text-gris-tinta">{title}</legend>
      {children}
    </fieldset>
  );
}

function CheckLink({ href, checked, children, count }: { href: string; checked: boolean; children: React.ReactNode; count?: number }) {
  return (
    <Link
      href={href}
      scroll={false}
      role="checkbox"
      aria-checked={checked}
      className="flex min-h-11 items-center gap-3 text-sm lg:min-h-9"
    >
      <span
        aria-hidden
        className={`flex size-5 shrink-0 items-center justify-center rounded border-2 ${checked ? "border-azul bg-azul" : "border-azul/40"}`}
      >
        {checked && (
          <svg viewBox="0 0 16 16" className="size-3 text-blanco" fill="none" stroke="currentColor" strokeWidth="3">
            <path d="m3 8 3 3 7-7" />
          </svg>
        )}
      </span>
      <span className="flex-1">{children}</span>
      {count !== undefined && <span className="text-xs text-gris-tinta">{count}</span>}
    </Link>
  );
}

function FilterOptions({
  filters,
  facets,
  href,
  basePath,
  keep,
  subsections,
  sections,
  hideOnSaleFilter,
}: {
  filters: Filters;
  facets: Facets;
  href: (f: Partial<Filters>) => string;
  basePath: string;
  keep: Record<string, string>;
  subsections?: LinkOption[];
  sections?: { slug: string; name: string }[];
  hideOnSaleFilter?: boolean;
}) {
  // El form de precio conserva el resto de los filtros como campos ocultos
  const hidden = [...new URLSearchParams(toQuery({ ...filters, min: null, max: null, page: 1 }, keep).slice(1))];

  return (
    <div>
      {subsections && subsections.length > 0 && (
        <Group title="Subsección">
          <ul>
            {subsections.map((s) => (
              <li key={s.href}>
                <Link
                  href={`${s.href}${toQuery({ ...filters, page: 1 })}`}
                  aria-current={s.active ? "page" : undefined}
                  className={`flex min-h-11 items-center text-sm lg:min-h-9 ${s.active ? "font-bold underline underline-offset-4" : ""}`}
                >
                  {s.name}
                </Link>
              </li>
            ))}
          </ul>
        </Group>
      )}

      {sections && sections.length > 0 && (
        <Group title="Sección">
          <ul>
            {sections.map((s) => (
              <li key={s.slug}>
                <CheckLink
                  href={href({ section: filters.section === s.slug ? null : s.slug, page: 1 })}
                  checked={filters.section === s.slug}
                >
                  {s.name}
                </CheckLink>
              </li>
            ))}
          </ul>
        </Group>
      )}

      {facets.sizes.length > 0 && (
        <Group title="Talle">
          <ul className="grid grid-cols-5 gap-1.5">
            {facets.sizes.map((s) => {
              const on = filters.sizes.includes(s.value);
              return (
                <li key={s.value}>
                  <Link
                    href={href(withSize(filters, s.value))}
                    scroll={false}
                    role="checkbox"
                    aria-checked={on}
                    aria-label={`Talle ${s.value}`}
                    className={`flex h-11 items-center justify-center rounded-md border text-sm font-semibold transition-colors ${
                      on ? "border-azul bg-azul text-blanco" : "border-azul/25 hover:border-azul"
                    }`}
                  >
                    {s.value}
                  </Link>
                </li>
              );
            })}
          </ul>
        </Group>
      )}

      {facets.colors.length > 0 && (
        <Group title="Color">
          <ul>
            {facets.colors.map((c) => (
              <li key={c.slug}>
                <CheckLink href={href(withColor(filters, c.slug))} checked={filters.colors.includes(c.slug)} count={c.count}>
                  <span className="flex items-center gap-2">
                    <span aria-hidden className="size-4 rounded-full border border-azul/25" style={{ backgroundColor: c.hex }} />
                    {c.name}
                  </span>
                </CheckLink>
              </li>
            ))}
          </ul>
        </Group>
      )}

      {facets.priceMax > 0 && (
        <Group title="Precio">
          <Form action={basePath} scroll={false} className="space-y-2">
            {hidden.map(([k, v]) => (
              <input key={k} type="hidden" name={k} value={v} />
            ))}
            <div className="flex items-center gap-2">
              <label className="flex-1">
                <span className="sr-only">Precio mínimo</span>
                <input
                  name="min"
                  inputMode="numeric"
                  defaultValue={filters.min ?? ""}
                  placeholder={`Desde ${formatPrice(facets.priceMin)}`}
                  className="h-11 w-full rounded-md border border-azul/25 px-2 text-sm placeholder:text-gris-tinta"
                />
              </label>
              <label className="flex-1">
                <span className="sr-only">Precio máximo</span>
                <input
                  name="max"
                  inputMode="numeric"
                  defaultValue={filters.max ?? ""}
                  placeholder={`Hasta ${formatPrice(facets.priceMax)}`}
                  className="h-11 w-full rounded-md border border-azul/25 px-2 text-sm placeholder:text-gris-tinta"
                />
              </label>
            </div>
            <button type="submit" className="h-10 w-full rounded-md border border-azul text-sm font-semibold hover:bg-azul hover:text-blanco">
              Aplicar precio
            </button>
          </Form>
        </Group>
      )}

      <Group title="Línea">
        <ul>
          {facets.lines
            .filter((l) => l.count > 0)
            .map((l) => (
              <li key={l.key}>
                <CheckLink
                  href={href({ line: filters.line === l.key ? null : l.key, page: 1 })}
                  checked={filters.line === l.key}
                  count={l.count}
                >
                  {l.label}
                </CheckLink>
              </li>
            ))}
        </ul>
      </Group>

      {!hideOnSaleFilter && facets.onSaleCount > 0 && (
        <Group title="Precio especial">
          <CheckLink href={href({ onSale: !filters.onSale, page: 1 })} checked={filters.onSale} count={facets.onSaleCount}>
            En oferta
          </CheckLink>
        </Group>
      )}
    </div>
  );
}

function activeChips(
  f: Filters,
  facets: Facets,
  sections: { slug: string; name: string }[],
  href: (f: Partial<Filters>) => string,
): { label: string; remove: string }[] {
  const chips: { label: string; remove: string }[] = [];
  if (f.section) {
    const s = sections.find((x) => x.slug === f.section);
    chips.push({ label: s?.name ?? f.section, remove: href({ section: null, page: 1 }) });
  }
  f.sizes.forEach((s) => chips.push({ label: `Talle ${s}`, remove: href(withSize(f, s)) }));
  f.colors.forEach((c) =>
    chips.push({ label: facets.colors.find((x) => x.slug === c)?.name ?? c, remove: href(withColor(f, c)) }),
  );
  if (f.min || f.max) {
    const label = f.min && f.max ? `${formatPrice(f.min)} a ${formatPrice(f.max)}` : f.min ? `Desde ${formatPrice(f.min)}` : `Hasta ${formatPrice(f.max!)}`;
    chips.push({ label, remove: href({ min: null, max: null, page: 1 }) });
  }
  if (f.line) chips.push({ label: LINES.find((l) => l.key === f.line)!.label, remove: href({ line: null, page: 1 }) });
  if (f.onSale) chips.push({ label: "En oferta", remove: href({ onSale: false, page: 1 }) });
  return chips;
}
