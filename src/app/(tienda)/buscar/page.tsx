import type { Metadata } from "next";
import { Breadcrumb } from "@/components/catalog/Breadcrumb";
import { Listing } from "@/components/catalog/Listing";
import { ProductCard } from "@/components/product/ProductCard";
import { parseFilters } from "@/lib/catalog/filters";
import { getCatalog, searchProducts } from "@/lib/data/catalog";
import { getNavigation, getPaymentPromos } from "@/lib/data/layout";

export async function generateMetadata({ searchParams }: PageProps<"/buscar">): Promise<Metadata> {
  const q = (await searchParams).q;
  return {
    title: typeof q === "string" && q ? `Resultados para “${q.slice(0, 60)}”` : "Buscar",
    robots: { index: false, follow: true },
  };
}

export default async function SearchPage({ searchParams }: PageProps<"/buscar">) {
  const sp = await searchParams;
  const q = (typeof sp.q === "string" ? sp.q : "").trim().slice(0, 80);
  const [found, promos, nav, catalog] = await Promise.all([searchProducts(q), getPaymentPromos(), getNavigation(), getCatalog()]);
  const filters = parseFilters(sp);
  // Sin texto pero con filtros (ej. "Ver todos en talle 38" del home): todo el catálogo filtrado
  const browsing = !q && (filters.sizes.length > 0 || filters.colors.length > 0 || filters.onSale || filters.line !== null);
  const results = browsing ? catalog : found;
  const sections = nav.filter((s) => s.kind === "section").map((s) => ({ slug: s.slug, name: s.name, id: s.id }));

  // Sin resultados: los más vendidos para seguir mirando
  const suggestions = [...catalog].sort((a, b) => b.soldCount - a.soldCount).slice(0, 8);
  const empty = (
    <div className="py-10">
      <p className="text-xl font-bold uppercase">No encontramos eso, pero mirá estos</p>
      <p className="mt-1 text-gris-tinta">Probá con otra palabra, como “zapas”, “ojotas” o “colegial”.</p>
      <ul className="mt-6 grid grid-cols-2 gap-x-3 gap-y-8 sm:gap-x-5 lg:grid-cols-4">
        {suggestions.map((p) => (
          <li key={p.id}>
            <ProductCard product={p} promos={promos} />
          </li>
        ))}
      </ul>
    </div>
  );

  return (
    <div className="mx-auto max-w-tienda px-4 py-6 lg:px-6">
      <Breadcrumb items={[{ name: "Buscar", href: q ? `/buscar?q=${encodeURIComponent(q)}` : "/buscar" }]} />
      <h1 className="mt-4 text-2xl font-bold uppercase sm:text-3xl">
        {q ? <>Resultados para “{q}”</> : browsing && filters.sizes.length === 1 ? `Talle ${filters.sizes[0]}` : browsing ? "Todos los productos" : "¿Qué estás buscando?"}
      </h1>
      {q && (
        <p className="mt-1 text-sm text-gris-tinta">
          {results.length} {results.length === 1 ? "producto" : "productos"}
        </p>
      )}

      {!q && !browsing ? (
        <p className="mt-4 text-gris-tinta">Escribí en el buscador qué par estás buscando.</p>
      ) : results.length === 0 ? (
        empty
      ) : (
        <Listing
          basePath="/buscar"
          products={results}
          filters={filters}
          promos={promos}
          sections={sections}
          keep={q ? { q } : {}}
          relevance={Boolean(q)}
          empty={empty}
        />
      )}
    </div>
  );
}
