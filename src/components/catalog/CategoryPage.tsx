import Image from "next/image";
import { Breadcrumb } from "@/components/catalog/Breadcrumb";
import { ActiveSection } from "@/components/layout/ActiveSection";
import { Listing } from "@/components/catalog/Listing";
import { parseFilters } from "@/lib/catalog/filters";
import { getCatalog } from "@/lib/data/catalog";
import { getPaymentPromos } from "@/lib/data/layout";
import type { NavSection, NavSubsection } from "@/lib/data/types";

type SP = Record<string, string | string[] | undefined>;

/** Listado de sección, subsección u ofertas (misma grilla y filtros en todos). */
export async function CategoryPage({
  section,
  sub,
  allSections,
  searchParams,
}: {
  section: NavSection;
  sub?: NavSubsection;
  allSections: NavSection[];
  searchParams: Promise<SP>;
}) {
  const [catalog, promos, sp] = await Promise.all([getCatalog(), getPaymentPromos(), searchParams]);
  const filters = parseFilters(sp);
  const isOffers = section.kind === "offers";

  const base = isOffers
    ? catalog.filter((p) => p.onSale)
    : catalog.filter((p) => p.categoryIds.includes(sub?.id ?? section.id));

  const crumbs = [{ name: section.name, href: section.href }];
  if (sub) crumbs.push({ name: sub.name, href: sub.href });
  const banner = sub?.banner ?? section.banner;
  const filterSections = allSections.filter((s) => s.kind === "section").map((s) => ({ slug: s.slug, name: s.name, id: s.id }));

  return (
    <div className="mx-auto max-w-tienda px-4 py-6 lg:px-6">
      <ActiveSection slug={section.slug} />
      <Breadcrumb items={crumbs} />

      {banner && (
        <picture className="mt-4 block overflow-hidden rounded-lg">
          {banner.mobile && <source media="(max-width: 767px)" srcSet={banner.mobile} />}
          <Image src={banner.desktop} alt="" width={1600} height={400} priority className="h-auto w-full" />
        </picture>
      )}

      <div className="mt-4 flex items-baseline gap-3">
        <h1 className={`text-2xl font-bold uppercase sm:text-3xl ${isOffers ? "text-rojo" : ""}`}>
          {sub ? `${section.name} · ${sub.name}` : section.name}
        </h1>
        <span className="text-sm text-gris-tinta lg:hidden">
          {base.length} {base.length === 1 ? "producto" : "productos"}
        </span>
      </div>

      <Listing
        basePath={sub?.href ?? section.href}
        products={base}
        filters={filters}
        promos={promos}
        subsections={
          isOffers
            ? undefined
            : section.children.map((c) => ({ name: c.name, href: c.href, active: c.id === sub?.id }))
        }
        sections={isOffers ? filterSections : undefined}
        hideOnSaleFilter={isOffers}
      />
    </div>
  );
}
