import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { AdminNav } from "@/components/admin/AdminNav";
import { requireAdmin } from "@/lib/admin/auth";
import { logoutAction } from "../actions";

// El panel depende siempre de la sesión: sus navegaciones pueden esperar al servidor
export const instant = false;

async function Gate({ children }: { children: React.ReactNode }) {
  const admin = await requireAdmin();
  return (
    <>
      <header className="on-dark sticky top-0 z-30 bg-rojo text-blanco">
        <div className="flex h-14 items-center justify-between gap-3 px-3 lg:px-6">
          <Link href="/admin" className="flex items-center gap-2">
            <Image src="/brand/logo-sobre-rojo.png" alt="Albertito" width={488} height={231} className="h-auto w-[92px]" />
            <span className="hidden text-sm font-bold uppercase sm:inline">Panel</span>
          </Link>
          <div className="flex items-center gap-2 text-sm">
            <Link href="/" target="_blank" className="hidden min-h-11 items-center px-2 font-semibold underline sm:flex">
              Ver la tienda
            </Link>
            <span className="hidden max-w-40 truncate md:inline">{admin.email}</span>
            <form action={logoutAction}>
              <button type="submit" className="min-h-11 rounded-md border border-blanco/60 px-3 text-sm font-semibold">
                Salir
              </button>
            </form>
          </div>
        </div>
        {admin.mode === "demo" && (
          <p className="bg-azul px-3 py-1 text-center text-xs">Modo demo: los cambios se guardan en memoria y se pierden al reiniciar el servidor.</p>
        )}
      </header>
      <div className="flex-1 lg:grid lg:grid-cols-[13rem_1fr]">
        <aside className="sticky top-14 z-20 border-b border-azul/10 bg-blanco lg:top-14 lg:h-[calc(100dvh-3.5rem)] lg:border-b-0 lg:border-r lg:p-3">
          <AdminNav />
        </aside>
        <main className="min-w-0 px-3 py-5 lg:px-8 lg:py-8">{children}</main>
      </div>
    </>
  );
}

/** Todo el panel exige login con rol admin (la verificación lee cookies: va dentro de Suspense). */
export default function PanelLayout({ children }: LayoutProps<"/admin">) {
  return (
    <Suspense fallback={<div className="p-8 text-sm text-gris-tinta">Cargando el panel…</div>}>
      <Gate>{children}</Gate>
    </Suspense>
  );
}
