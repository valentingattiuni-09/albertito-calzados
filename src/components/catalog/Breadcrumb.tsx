import Link from "next/link";

export type Crumb = { name: string; href: string };

/** Breadcrumb visible + datos estructurados BreadcrumbList. */
export function Breadcrumb({ items }: { items: Crumb[] }) {
  const all = [{ name: "Inicio", href: "/" }, ...items];
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: all.map((c, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: c.name,
      item: new URL(c.href, siteUrl).toString(),
    })),
  };

  return (
    <nav aria-label="Estás en" className="text-sm">
      <ol className="flex flex-wrap items-center gap-1 text-gris-tinta">
        {all.map((c, i) => {
          const last = i === all.length - 1;
          return (
            <li key={c.href} className="flex items-center gap-1">
              {last ? (
                <span aria-current="page" className="font-medium text-azul">
                  {c.name}
                </span>
              ) : (
                <>
                  <Link href={c.href} className="hover:text-azul hover:underline">
                    {c.name}
                  </Link>
                  <span aria-hidden>/</span>
                </>
              )}
            </li>
          );
        })}
      </ol>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
    </nav>
  );
}
