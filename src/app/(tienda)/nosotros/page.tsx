import type { Metadata } from "next";
import { ContentView } from "@/components/content/ContentView";
import { ABOUT_PAGE } from "@/lib/content/pages";
import { getSettings } from "@/lib/data/layout";

export const metadata: Metadata = { title: "Nosotros", description: ABOUT_PAGE.description, alternates: { canonical: "/nosotros" } };

export default async function AboutPage() {
  const { store } = await getSettings();
  return <ContentView page={ABOUT_PAGE} store={store} crumbs={[{ name: "Nosotros", href: "/nosotros" }]} />;
}
