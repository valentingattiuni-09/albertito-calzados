import Link from "next/link";
import { BenefitsRow, PaymentPromosBlock, SectionCards, SectionTitle, StoryBlock } from "@/components/home/Blocks";
import { Carousel } from "@/components/home/Carousel";
import { Hero } from "@/components/home/Hero";
import { NewsletterForm } from "@/components/home/NewsletterForm";
import { SizeFinder } from "@/components/home/SizeFinder";
import { VideoCarousel } from "@/components/home/VideoCarousel";
import { ProductCard } from "@/components/product/ProductCard";
import { getCatalog } from "@/lib/data/catalog";
import { getHomeBanners, getHomeVideos } from "@/lib/data/home";
import { getNavigation, getPaymentPromos, getSettings } from "@/lib/data/layout";
import type { PaymentPromo, ProductCard as Card } from "@/lib/data/types";

function ProductCarousel({ products, promos, label }: { products: Card[]; promos: PaymentPromo[]; label: string }) {
  return (
    <Carousel label={label}>
      {products.map((p) => (
        <ProductCard key={p.id} product={p} promos={promos} sizes="(min-width: 1024px) 22vw, 44vw" />
      ))}
    </Carousel>
  );
}

const byNewest = (a: Card, b: Card) => b.createdAt.localeCompare(a.createdAt);

export default async function HomePage() {
  const [banners, videos, catalog, promos, nav, settings] = await Promise.all([
    getHomeBanners(),
    getHomeVideos(),
    getCatalog(),
    getPaymentPromos(),
    getNavigation(),
    getSettings(),
  ]);

  const nuevos = catalog.filter((p) => p.isNew).sort(byNewest).slice(0, 12);
  const ofertas = catalog
    .filter((p) => p.onSale)
    .sort((a, b) => Number(b.isFeatured) - Number(a.isFeatured) || b.discountPct - a.discountPct)
    .slice(0, 12);
  const seleccion = catalog.filter((p) => p.line === "seleccion").sort((a, b) => Number(b.isFeatured) - Number(a.isFeatured)).slice(0, 8);

  // Grupos de talles para "Elegí tu talle", desde los rangos de cada sección
  const sizesOf = (slugs: string[]) =>
    [...new Set(nav.filter((s) => slugs.includes(s.slug)).flatMap((s) => s.sizeRange))].sort((a, b) => Number(a) - Number(b));
  const sizeGroups = [
    { label: "Niños", sizes: sizesOf(["ninos"]) },
    { label: "Adultos", sizes: sizesOf(["mujer", "hombre", "alpargatas"]) },
  ].filter((g) => g.sizes.length > 0);

  return (
    <>
      <h1 className="sr-only">Albertito Calzados: calzado para toda la familia en Villa Mercedes, San Luis</h1>

      {/* 1. Hero */}
      <Hero banners={banners} />

      {/* 2. Beneficios */}
      <BenefitsRow promos={promos} />

      <div className="space-y-14 py-10 sm:space-y-20 sm:py-14">
        {/* 3. Productos arriba de todo */}
        {nuevos.length > 0 && (
          <section aria-labelledby="nuevos" className="mx-auto max-w-tienda px-4 lg:px-6">
            <SectionTitle id="nuevos">
              Llegaron los nuevos
            </SectionTitle>
            <ProductCarousel products={nuevos} promos={promos} label="Llegaron los nuevos" />
          </section>
        )}

        {/* 4. Accesos a secciones */}
        <SectionCards sections={nav} />

        {/* 5. Videos */}
        {videos.length > 0 && (
          <section aria-labelledby="videos" className="mx-auto max-w-tienda px-4 lg:px-6">
            <SectionTitle id="videos" href={`https://instagram.com/${settings.store.instagram}`} linkLabel="Más en Instagram">
              Mirá cómo quedan
            </SectionTitle>
            <VideoCarousel videos={videos} />
          </section>
        )}

        {/* 6. Ofertas destacadas */}
        {ofertas.length > 0 && (
          <section aria-labelledby="ofertas-home" className="mx-auto max-w-tienda px-4 lg:px-6">
            <SectionTitle id="ofertas-home" href="/ofertas" className="[&_h2]:text-rojo">
              Ofertas destacadas
            </SectionTitle>
            <ProductCarousel products={ofertas} promos={promos} label="Ofertas destacadas" />
          </section>
        )}

        {/* 7. Medios de pago */}
        <PaymentPromosBlock promos={promos} />

        {/* 8. Elegí tu talle */}
        <section aria-labelledby="talle-home" className="mx-auto max-w-tienda px-4 lg:px-6">
          <SectionTitle id="talle-home">Elegí tu talle</SectionTitle>
          <SizeFinder groups={sizeGroups} promos={promos} />
        </section>

        {/* 9. Selección Albertito */}
        {seleccion.length > 0 && (
          <section aria-labelledby="seleccion" className="mx-auto max-w-tienda px-4 lg:px-6">
            <div className="rounded-xl border-2 border-azul p-4 sm:p-8">
              <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
                <div>
                  <span className="inline-flex items-center rounded bg-azul px-2 py-1 text-xs font-bold uppercase tracking-wide text-blanco">
                    Selección Albertito
                  </span>
                  <h2 id="seleccion" className="mt-3 text-xl font-bold uppercase sm:text-2xl">
                    Pocos modelos, mejor calidad
                  </h2>
                  <p className="mt-1 text-sm">Los pares que elegimos para que te duren más.</p>
                </div>
                <Link href="/buscar?linea=seleccion" className="inline-flex min-h-11 items-center text-sm font-semibold underline underline-offset-4">
                  Ver toda la Selección
                </Link>
              </div>
              <ProductCarousel products={seleccion} promos={promos} label="Selección Albertito" />
            </div>
          </section>
        )}

        {/* 10. Historia */}
        <StoryBlock instagram={settings.store.instagram} address={settings.store.address} city={settings.store.city} />

        {/* 11. Newsletter */}
        <section aria-labelledby="newsletter-home" className="mx-auto max-w-tienda px-4 lg:px-6">
          <div className="grid gap-6 rounded-xl border border-azul/15 p-5 sm:p-8 md:grid-cols-2 md:gap-12">
            <div>
              <h2 id="newsletter-home" className="font-campana text-3xl uppercase leading-tight text-rojo sm:text-4xl">
                {settings.newsletterPopup.title}
              </h2>
              <p className="mt-3 text-lg">{settings.newsletterPopup.text}.</p>
              <p className="mt-2 text-sm text-gris-tinta">Ofertas, lanzamientos y un regalo en tu cumple. Nada más.</p>
            </div>
            <NewsletterForm source="home" />
          </div>
        </section>
      </div>
    </>
  );
}
