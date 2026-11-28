import "server-only";
import { cacheLife } from "next/cache";

/**
 * Durante `next build` la API del back office puede no estar disponible (por ejemplo, al construir la imagen de Docker, que no ve la red
 * interna). En ese caso la lectura devuelve `empty` con una caché corta (30 s), así el build no falla y la página se completa sola apenas
 * la web arranca con la API disponible. En ejecución el error sigue su curso (Next conserva la última versión buena; sin ninguna, la página amable).
 * Llamalo SOLO dentro de una función con "use cache".
 */
export async function orEmptyDuringBuild<T>(read: () => Promise<T>, empty: T, what: string): Promise<T> {
  try {
    return await read();
  } catch (e) {
    if (process.env.NEXT_PHASE !== "phase-production-build") throw e;
    console.warn(`[back office] build sin API (${what}): ${(e as Error).message}. Se completa al arrancar.`);
    // Corto, pero prerenderizable (con «seconds» Next lo trata como dato dinámico y no deja prerenderizar)
    cacheLife({ stale: 30, revalidate: 30, expire: 600 });
    return empty;
  }
}
