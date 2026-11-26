"use client";

import { StoreUnavailable } from "@/components/layout/StoreUnavailable";

/** Si una página de la tienda no puede leer sus datos (por ejemplo, el back office no responde), una página amable en vez del error de Next. */
export default function TiendaError({ error }: { error: Error & { digest?: string } }) {
  // Solo con el back office (DATA_SOURCE=backoffice). En modo demo el error sigue como siempre (se pasa al manejo por defecto de Next).
  if (process.env.NEXT_PUBLIC_DATA_SOURCE !== "backoffice") throw error;
  return <StoreUnavailable />;
}
