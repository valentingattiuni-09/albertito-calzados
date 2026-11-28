import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CategoryPage } from "@/components/catalog/CategoryPage";
import { getNavigation } from "@/lib/data/layout";

export async function generateStaticParams() {
  const sections = await getNavigation();
  const params = sections.flatMap((s) => s.children.map((c) => ({ seccion: s.slug, subseccion: c.slug })));
  // Cache Components exige al menos un resultado: si todavía no hay datos (o el build corrió sin la API del back office), un valor de relleno que da 404
  return params.length ? params : [{ seccion: "_sin-datos", subseccion: "_sin-datos" }];
}

async function find(seccion: string, subseccion: string) {
  const sections = await getNavigation();
  const section = sections.find((s) => s.slug === seccion);
  const sub = section?.children.find((c) => c.slug === subseccion);
  return section && sub ? { section, sub, sections } : null;
}

export async function generateMetadata({ params }: PageProps<"/[seccion]/[subseccion]">): Promise<Metadata> {
  const { seccion, subseccion } = await params;
  const found = await find(seccion, subseccion);
  if (!found) return {};
  const title = `${found.section.name} · ${found.sub.name}`;
  return {
    title,
    description: `Calzado ${found.sub.name.toLowerCase()} de ${found.section.name.toLowerCase()} en Albertito Calzados. Cuotas sin interés y envíos a todo el país.`,
    alternates: { canonical: found.sub.href },
  };
}

export default async function SubsectionPage({ params, searchParams }: PageProps<"/[seccion]/[subseccion]">) {
  const { seccion, subseccion } = await params;
  const found = await find(seccion, subseccion);
  if (!found) notFound();
  return <CategoryPage section={found.section} sub={found.sub} allSections={found.sections} searchParams={searchParams} />;
}
