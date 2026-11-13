import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CategoryPage } from "@/components/catalog/CategoryPage";
import { getNavigation } from "@/lib/data/layout";

export async function generateStaticParams() {
  const sections = await getNavigation();
  return sections.flatMap((s) => s.children.map((c) => ({ seccion: s.slug, subseccion: c.slug })));
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
