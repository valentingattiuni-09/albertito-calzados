import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/admin/auth";
import { listCategories, listProducts } from "@/lib/admin/repo";
import { ProductsList } from "./ProductsList";

// Panel: depende de la sesión, la navegación puede esperar al servidor
export const instant = false;

export const metadata: Metadata = { title: "Productos" };

export default async function ProductsPage({ searchParams }: PageProps<"/admin/productos">) {
  await requireAdmin();
  const [products, categories, sp] = await Promise.all([listProducts(), listCategories(), searchParams]);
  const sections = categories.filter((c) => c.parentId === null && c.kind === "section");
  return (
    <div className="max-w-5xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold uppercase">Productos</h1>
        <Link href="/admin/productos/nuevo" className="inline-flex h-11 items-center rounded-md bg-rojo px-5 text-sm font-bold uppercase text-blanco">
          + Nuevo producto
        </Link>
      </div>
      <ProductsList products={products} sections={sections.map((s) => ({ id: s.id, name: s.name }))} initialFilter={typeof sp.filtro === "string" ? sp.filtro : ""} />
    </div>
  );
}
