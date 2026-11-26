import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { isBackoffice } from "@/lib/backoffice/source";

/**
 * Refresca la sesión de Supabase (cookies) en /admin y /cuenta.
 * El control de rol (admin) se hace en el servidor de cada página del panel.
 */
export async function proxy(request: NextRequest) {
  // Con el back office, el panel /admin y la API /api/admin/* de la tienda no existen: el catálogo se administra en el back office
  const isAdminPath = request.nextUrl.pathname === "/admin" || request.nextUrl.pathname.startsWith("/admin/") || request.nextUrl.pathname.startsWith("/api/admin/");
  if (isBackoffice() && !isAdminPath) return NextResponse.next();
  if (isBackoffice()) return new NextResponse("No encontrado", { status: 404, headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" } });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return NextResponse.next();

  let response = NextResponse.next({ request });
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (list) => {
        list.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        list.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });
  const { data } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  if (path.startsWith("/admin") && !path.startsWith("/admin/ingresar") && !data.user) {
    const login = request.nextUrl.clone();
    login.pathname = "/admin/ingresar";
    login.search = "";
    return NextResponse.redirect(login);
  }
  return response;
}

export const config = {
  matcher: ["/admin", "/admin/:path*", "/cuenta/:path*", "/api/admin/:path*"],
};
