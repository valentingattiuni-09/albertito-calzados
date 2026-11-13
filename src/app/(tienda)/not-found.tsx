import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-tienda px-4 py-20 text-center lg:px-6">
      <p className="font-campana text-6xl text-rojo">404</p>
      <h1 className="mt-4 text-2xl font-bold uppercase">No encontramos esta página</h1>
      <p className="mt-2 text-gris-tinta">Puede que se haya movido. Seguí buscando tu par.</p>
      <Link
        href="/"
        className="mt-8 inline-flex h-12 items-center rounded-md bg-rojo px-6 text-sm font-bold uppercase text-blanco"
      >
        Volver al inicio
      </Link>
    </div>
  );
}
