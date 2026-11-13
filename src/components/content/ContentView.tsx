import { Breadcrumb, type Crumb } from "@/components/catalog/Breadcrumb";
import type { ContentPage, Store } from "@/lib/content/pages";

/** Página de texto (ayuda, legales, nosotros): títulos azules, texto largo azul sobre blanco. */
export function ContentView({ page, store, crumbs, children }: { page: ContentPage; store: Store; crumbs: Crumb[]; children?: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-6 lg:px-6">
      <Breadcrumb items={crumbs} />
      <h1 className="mt-4 text-3xl font-bold uppercase">{page.title}</h1>
      <p className="mt-2 text-lg">{page.description}</p>
      <div className="mt-8 space-y-8 leading-relaxed">
        {page.sections(store).map((s, i) => (
          <section key={i}>
            {s.title && <h2 className="mb-2 text-lg font-bold uppercase">{s.title}</h2>}
            {s.paragraphs?.map((p) => (
              <p key={p} className="mb-3">
                {p}
              </p>
            ))}
            {s.list && (
              <ul className="list-disc space-y-1.5 pl-5">
                {s.list.map((l) => (
                  <li key={l}>{l}</li>
                ))}
              </ul>
            )}
          </section>
        ))}
      </div>
      {children}
    </div>
  );
}
