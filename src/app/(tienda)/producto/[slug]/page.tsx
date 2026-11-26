import type { Metadata } from "next";
import { isBackoffice } from "@/lib/backoffice/source";
import { CHECKOUT_CLOSED_MESSAGE } from "@/lib/backoffice/guard";
import { notFound } from "next/navigation";
import { Breadcrumb, type Crumb } from "@/components/catalog/Breadcrumb";
import { ActiveSection } from "@/components/layout/ActiveSection";
import { ProductCard } from "@/components/product/ProductCard";
import { ProductView } from "@/components/product/ProductView";
import { getCatalog, getProductBySlug } from "@/lib/data/catalog";
import { siteUrl as getSiteUrl } from "@/lib/site";
import { getNavigation, getPaymentPromos, getSettings } from "@/lib/data/layout";
import type { NavSection, NavSubsection, ProductDetail } from "@/lib/data/types";

export async function generateStaticParams() {
  const catalog = await getCatalog();
  const params = catalog.map((p) => ({ slug: p.slug }));
  // Cache Components exige al menos un resultado: si todavía no hay datos (o el build corrió sin la API del back office), un valor de relleno que da 404
  return params.length ? params : [{ slug: "_sin-datos" }];
}

/** Sección y subsección del producto (para breadcrumb, guía de talles y relacionados). */
function placement(p: ProductDetail, nav: NavSection[]): { section?: NavSection; sub?: NavSubsection } {
  for (const s of nav) {
    const sub = s.children.find((c) => p.categoryIds.includes(c.id));
    if (sub) return { section: s, sub };
    if (p.categoryIds.includes(s.id)) return { section: s };
  }
  return {};
}

export async function generateMetadata({ params }: PageProps<"/producto/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const p = await getProductBySlug(slug);
  if (!p) return {};
  const image = p.media.find((m) => m.type === "image")?.url;
  return {
    title: p.name,
    description: p.description.slice(0, 160),
    alternates: { canonical: `/producto/${p.slug}` },
    openGraph: { title: p.name, description: p.description.slice(0, 160), images: image ? [{ url: image }] : undefined },
  };
}

export default async function ProductPage({ params, searchParams }: PageProps<"/producto/[slug]">) {
  const { slug } = await params;
  const [p, promos, settings, nav, catalog, sp] = await Promise.all([
    getProductBySlug(slug),
    getPaymentPromos(),
    getSettings(),
    getNavigation(),
    getCatalog(),
    searchParams,
  ]);
  if (!p) notFound();

  const { section, sub } = placement(p, nav);
  const crumbs: Crumb[] = [];
  if (section) crumbs.push({ name: section.name, href: section.href });
  if (sub) crumbs.push({ name: sub.name, href: sub.href });
  crumbs.push({ name: p.name, href: `/producto/${p.slug}` });

  const requested = typeof sp.color === "string" ? sp.color : "";
  const initialColor = p.colors.some((c) => c.slug === requested) ? requested : (p.colors[0]?.slug ?? "");

  const groupId = sub?.id ?? section?.id;
  const related = catalog.filter((x) => x.id !== p.id && groupId && x.categoryIds.includes(groupId)).slice(0, 8);

  const siteUrl = getSiteUrl();
  const inStock = p.variants.some((v) => v.stock > 0);
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: p.name,
    sku: p.skuBase ?? undefined,
    description: p.description,
    image: p.media.filter((m) => m.type === "image").map((m) => new URL(m.url, siteUrl).toString()),
    brand: { "@type": "Brand", name: "Albertito Calzados" },
    color: p.colors.map((c) => c.name).join(", "),
    offers: {
      "@type": "Offer",
      url: new URL(`/producto/${p.slug}`, siteUrl).toString(),
      priceCurrency: "ARS",
      price: p.price,
      availability: inStock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      itemCondition: "https://schema.org/NewCondition",
    },
  };

  return (
    <div className="mx-auto max-w-tienda px-4 py-6 lg:px-6">
      <ActiveSection slug={section?.slug} />
      <Breadcrumb items={crumbs} />
      <div className="mt-5">
        <ProductView
          product={p}
          promos={promos}
          initialColor={initialColor}
          whatsappNumber={settings.whatsapp.number}
          taxFactor={settings.tax.factor}
          kids={section?.slug === "ninos"}
          storeAddress={`${settings.store.address}, ${settings.store.city}`}
          checkoutClosed={isBackoffice() ? CHECKOUT_CLOSED_MESSAGE : undefined}
        />
      </div>

      {/* Descripción, especificaciones y cambios */}
      <div className="mt-12 max-w-3xl divide-y divide-azul/15 border-y border-azul/15">
        <details open className="group py-2">
          <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between text-base font-bold uppercase">
            Descripción <span aria-hidden className="text-xl group-open:rotate-45 transition-transform">+</span>
          </summary>
          <p className="pb-4 leading-relaxed">{p.description}</p>
        </details>
        {Object.keys(p.specs).length > 0 && (
          <details className="group py-2">
            <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between text-base font-bold uppercase">
              Especificaciones <span aria-hidden className="text-xl group-open:rotate-45 transition-transform">+</span>
            </summary>
            <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 pb-4 text-sm">
              {Object.entries(p.specs).map(([k, v]) => (
                <div key={k} className="contents">
                  <dt className="font-semibold">{k}</dt>
                  <dd>{v}</dd>
                </div>
              ))}
            </dl>
          </details>
        )}
        <details className="group py-2">
          <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between text-base font-bold uppercase">
            Cambios y devoluciones <span aria-hidden className="text-xl group-open:rotate-45 transition-transform">+</span>
          </summary>
          <div className="space-y-2 pb-4 text-sm leading-relaxed">
            <p>Cambiá gratis en el local de {settings.store.address}, {settings.store.city}, dentro de los 30 días.</p>
            <p>El par tiene que estar sin uso, con su caja y etiqueta.</p>
            <p>Si compraste online, tenés 10 días para arrepentirte desde que lo recibís.</p>
          </div>
        </details>
      </div>

      {related.length > 0 && (
        <section className="mt-14" aria-labelledby="relacionados">
          <h2 id="relacionados" className="text-xl font-bold uppercase sm:text-2xl">
            También te puede gustar
          </h2>
          <ul className="no-scrollbar -mx-4 mt-5 flex snap-x gap-4 overflow-x-auto px-4 lg:mx-0 lg:grid lg:grid-cols-4 lg:overflow-visible lg:px-0">
            {related.map((r) => (
              <li key={r.id} className="w-[44vw] shrink-0 snap-start sm:w-[30vw] lg:w-auto">
                <ProductCard product={r} promos={promos} sizes="(min-width: 1024px) 22vw, 44vw" />
              </li>
            ))}
          </ul>
        </section>
      )}

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
    </div>
  );
}
