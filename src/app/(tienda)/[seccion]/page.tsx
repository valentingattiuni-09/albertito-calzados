import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CategoryPage } from "@/components/catalog/CategoryPage";
import { getNavigation } from "@/lib/data/layout";

export async function generateStaticParams() {
  const sections = await getNavigation();
  const params = sections.map((s) => ({ seccion: s.slug }));
  // Cache Components exige al menos un resultado: si todavía no hay datos (o el build corrió sin la API del back office), un valor de relleno que da 404
  return params.length ? params : [{ seccion: "_sin-datos" }];
}

export async function generateMetadata({ params }: PageProps<"/[seccion]">): Promise<Metadata> {
  const { seccion } = await params;
  const section = (await getNavigation()).find((s) => s.slug === seccion);
  if (!section) return {};
  const title = section.kind === "offers" ? "Ofertas en calzado" : `Calzado de ${section.name.toLowerCase()}`;
  return {
    title,
    description: `${title} en Albertito Calzados. Cuotas sin interés y envíos a todo el país.`,
    alternates: { canonical: section.href },
  };
}

export default async function SectionPage({ params, searchParams }: PageProps<"/[seccion]">) {
  const { seccion } = await params;
  const sections = await getNavigation();
  const section = sections.find((s) => s.slug === seccion);
  if (!section) notFound();
  return <CategoryPage section={section} allSections={sections} searchParams={searchParams} />;
}
