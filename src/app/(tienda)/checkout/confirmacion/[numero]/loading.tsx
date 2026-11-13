export default function Loading() {
  return (
    <div className="mx-auto max-w-3xl animate-pulse px-4 py-10" aria-busy="true" aria-label="Cargando tu pedido">
      <div className="h-40 rounded-xl bg-azul/10" />
      <div className="mt-8 h-64 rounded-xl bg-azul/5" />
    </div>
  );
}
