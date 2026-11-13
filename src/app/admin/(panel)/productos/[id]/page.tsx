import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/admin/auth";
import { getProduct, listCategories, type AdminProduct } from "@/lib/admin/repo";
import { ProductForm } from "./ProductForm";

// Panel: depende de la sesión, la navegación puede esperar al servidor
export const instant = false;

export const metadata: Metadata = { title: "Producto" };

const EMPTY: AdminProduct = {
  id: "",
  name: "",
  slug: "",
  line: "diario",
  basePrice: 0,
  salePrice: null,
  isOffer: false,
  saleStartsAt: null,
  saleEndsAt: null,
  isNew: true,
  isFeatured: false,
  active: true,
  categoryIds: [],
  skuBase: null,
  description: "",
  specs: { Material: "", Suela: "", Origen: "Argentina" },
  weightG: null,
  box: null,
  colors: [],
  variants: [],
};

export default async function ProductEditPage({ params, searchParams }: PageProps<"/admin/productos/[id]">) {
  await requireAdmin();
  const [{ id }, sp, categories] = await Promise.all([params, searchParams, listCategories()]);
  const product = id === "nuevo" ? EMPTY : await getProduct(id);
  if (!product) notFound();

  const tree = categories
    .filter((c) => c.parentId === null && c.kind === "section")
    .sort((a, b) => a.order - b.order)
    .map((s) => ({
      id: s.id,
      name: s.name,
      slug: s.slug,
      children: categories.filter((c) => c.parentId === s.id).sort((a, b) => a.order - b.order).map((c) => ({ id: c.id, name: c.name })),
    }));

  return (
    <div className="max-w-5xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href="/admin/productos" className="text-sm underline">
            ← Productos
          </Link>
          <h1 className="mt-1 text-2xl font-bold uppercase">{product.id ? product.name : "Nuevo producto"}</h1>
        </div>
        {product.id && (
          <Link href={`/producto/${product.slug}`} target="_blank" className="text-sm font-semibold underline">
            Ver en la tienda
          </Link>
        )}
      </div>
      {sp.nuevo === "1" && <p className="rounded-md border border-azul/30 px-3 py-2 text-sm font-semibold">Producto creado. Ya está en la tienda.</p>}
      <ProductForm product={product} tree={tree} />
    </div>
  );
}
