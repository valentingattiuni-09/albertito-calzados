import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ContentView } from "@/components/content/ContentView";
import { LEGAL_PAGES } from "@/lib/content/pages";
import { getSettings } from "@/lib/data/layout";

export function generateStaticParams() {
  return Object.keys(LEGAL_PAGES).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps<"/legales/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const page = LEGAL_PAGES[slug];
  return page ? { title: page.title, description: page.description, alternates: { canonical: `/legales/${slug}` } } : {};
}

export default async function LegalPage({ params }: PageProps<"/legales/[slug]">) {
  const { slug } = await params;
  const page = LEGAL_PAGES[slug];
  if (!page) notFound();
  const { store } = await getSettings();
  return <ContentView page={page} store={store} crumbs={[{ name: page.title, href: `/legales/${slug}` }]} />;
}
