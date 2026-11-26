"use client";

import { StoreUnavailable } from "@/components/layout/StoreUnavailable";

/** Red de seguridad por encima del layout de la tienda (por ejemplo, si el header no pudo leer el menú). */
export default function RootError({ error }: { error: Error & { digest?: string } }) {
  // Solo con el back office (DATA_SOURCE=backoffice). En modo demo el error sigue como siempre (se pasa al manejo por defecto de Next).
  if (process.env.NEXT_PUBLIC_DATA_SOURCE !== "backoffice") throw error;
  return <StoreUnavailable />;
}
