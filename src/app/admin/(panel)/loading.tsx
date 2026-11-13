/** Límite de Suspense de cada pantalla del panel (cada una verifica la sesión y lee datos en vivo). */
export default function Loading() {
  return (
    <div className="max-w-4xl animate-pulse space-y-4" aria-busy="true" aria-label="Cargando">
      <div className="h-8 w-56 rounded bg-azul/10" />
      <div className="h-24 rounded-xl bg-azul/5" />
      <div className="h-24 rounded-xl bg-azul/5" />
    </div>
  );
}
