/** Esqueleto mientras carga una sección o subsección (también es el límite de Suspense). */
export default function Loading() {
  return (
    <div className="mx-auto max-w-tienda animate-pulse px-4 py-6 lg:px-6" aria-busy="true" aria-label="Cargando">
      <div className="h-4 w-40 rounded bg-azul/10" />
      <div className="mt-5 h-8 w-64 rounded bg-azul/10" />
      <div className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 8 }, (_, i) => (
          <div key={i} className="aspect-square rounded-lg bg-azul/5" />
        ))}
      </div>
    </div>
  );
}
