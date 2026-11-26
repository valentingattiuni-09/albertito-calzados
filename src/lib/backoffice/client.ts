import "server-only";
import { createBackofficeHttp } from "./http";
import { isBackoffice } from "./source";

/**
 * Cliente de la API del back office. SOLO SERVIDOR: la clave (STORE_API_KEY) nunca llega al navegador
 * (no tiene prefijo NEXT_PUBLIC_ y este módulo importa "server-only").
 */
let http: ReturnType<typeof createBackofficeHttp> | null = null;

export function backoffice() {
  if (!isBackoffice()) throw new Error("El cliente del back office solo se usa con DATA_SOURCE=backoffice");
  if (!http) {
    const baseUrl = process.env.BACKOFFICE_API_URL;
    const apiKey = process.env.STORE_API_KEY;
    if (!baseUrl || !apiKey) throw new Error("Con DATA_SOURCE=backoffice hacen falta BACKOFFICE_API_URL y STORE_API_KEY");
    http = createBackofficeHttp({ baseUrl, apiKey, timeoutMs: Number(process.env.BACKOFFICE_TIMEOUT_MS) || 4000, retries: 2 });
  }
  return http;
}
