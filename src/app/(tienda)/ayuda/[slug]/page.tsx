import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ContentView } from "@/components/content/ContentView";
import { HELP_PAGES } from "@/lib/content/pages";
import { getSettings } from "@/lib/data/layout";

export function generateStaticParams() {
  return Object.keys(HELP_PAGES).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps<"/ayuda/[slug]">): Promise<Metadata> {
  const page = HELP_PAGES[(await params).slug];
  return page ? { title: page.title, description: page.description, alternates: { canonical: `/ayuda/${(await params).slug}` } } : {};
}

export default async function HelpPage({ params }: PageProps<"/ayuda/[slug]">) {
  const { slug } = await params;
  const page = HELP_PAGES[slug];
  if (!page) notFound();
  const { store } = await getSettings();
  return <ContentView page={page} store={store} crumbs={[{ name: "Ayuda", href: `/ayuda/${slug}` }, { name: page.title, href: `/ayuda/${slug}` }]} />;
}
