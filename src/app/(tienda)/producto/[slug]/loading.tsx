export default function Loading() {
  return (
    <div className="mx-auto max-w-tienda animate-pulse px-4 py-6 lg:px-6" aria-busy="true" aria-label="Cargando">
      <div className="h-4 w-56 rounded bg-azul/10" />
      <div className="mt-5 grid gap-8 lg:grid-cols-[1.15fr_1fr] lg:gap-12">
        <div className="aspect-square rounded-lg bg-azul/5" />
        <div className="space-y-4">
          <div className="h-6 w-32 rounded bg-azul/10" />
          <div className="h-9 w-3/4 rounded bg-azul/10" />
          <div className="h-9 w-40 rounded bg-azul/10" />
          <div className="h-28 rounded-lg bg-azul/5" />
          <div className="h-14 rounded-md bg-azul/10" />
        </div>
      </div>
    </div>
  );
}
