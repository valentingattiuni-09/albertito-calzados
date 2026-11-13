import { NextResponse, type NextRequest } from "next/server";
import { getCatalog } from "@/lib/data/catalog";

/** "Elegí tu talle" del home: productos con stock en un talle (los más vendidos primero). */
export async function GET(req: NextRequest) {
  const size = (req.nextUrl.searchParams.get("talle") ?? "").replace(/[^0-9/]/g, "").slice(0, 6);
  if (!size) return NextResponse.json({ products: [], total: 0 });
  const catalog = await getCatalog();
  const matches = catalog.filter((p) => p.sizesInStock.includes(size)).sort((a, b) => b.soldCount - a.soldCount);
  return NextResponse.json(
    { products: matches.slice(0, 8), total: matches.length },
    { headers: { "Cache-Control": "public, max-age=60" } },
  );
}
