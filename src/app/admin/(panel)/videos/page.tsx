import type { Metadata } from "next";
import { requireAdmin } from "@/lib/admin/auth";
import { listProducts, listVideos } from "@/lib/admin/repo";
import { fetchRecentMedia, instagramConfigured } from "@/lib/instagram";
import { VideosManager } from "./VideosManager";

// Panel: depende de la sesión, la navegación puede esperar al servidor
export const instant = false;

export const metadata: Metadata = { title: "Videos" };

export default async function VideosPage() {
  await requireAdmin();
  const [videos, products, recent] = await Promise.all([listVideos(), listProducts(), fetchRecentMedia()]);
  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold uppercase">Videos “Mirá cómo quedan”</h1>
        <p className="mt-1 text-sm text-gris-tinta">
          Subí el video (vertical 9:16, menos de 80 MB) o pegá el link del reel de Instagram. Cada video lleva a un producto.
        </p>
      </div>
      <VideosManager
        videos={videos}
        products={products.filter((p) => p.active).map((p) => ({ id: p.id, name: p.name }))}
        recent={recent}
        instagramReady={instagramConfigured()}
      />
    </div>
  );
}
