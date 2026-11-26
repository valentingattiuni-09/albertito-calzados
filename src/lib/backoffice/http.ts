/**
 * Cliente HTTP de la API del back office, sin dependencias (se testea con node --test inyectando fetch).
 * - Tiempo máximo de espera por intento.
 * - Reintentos SOLO en lecturas (GET), y solo ante corte de red, timeout o 5xx.
 * - Respaldo en memoria: guarda la última respuesta buena de cada lectura; si la API no responde, devuelve esa copia.
 *   Next mantiene lo cacheado con "use cache" mientras vive la entrada, pero si venció o el proceso arrancó de nuevo y la API
 *   está caída, la función tira error: este respaldo cubre ese hueco mientras el proceso tenga una copia.
 */
export class BackofficeUnavailableError extends Error {
  readonly status?: number;
  constructor(message: string, status?: number) {
    super(message);
    this.name = "BackofficeUnavailableError";
    this.status = status;
  }
}

export class BackofficeNotFoundError extends Error {
  constructor(path: string) {
    super(`No existe en el back office: ${path}`);
    this.name = "BackofficeNotFoundError";
  }
}

export type HttpOptions = {
  baseUrl: string;
  apiKey: string;
  timeoutMs: number;
  /** Reintentos de una lectura (además del primer intento) */
  retries: number;
  fetch?: typeof fetch;
  sleep?: (ms: number) => Promise<void>;
  log?: (message: string) => void;
};

export function createBackofficeHttp(opts: HttpOptions) {
  const doFetch = opts.fetch ?? fetch;
  const sleep = opts.sleep ?? ((ms: number) => new Promise((r) => setTimeout(r, ms)));
  const log = opts.log ?? ((m: string) => console.warn(`[back office] ${m}`));
  const base = opts.baseUrl.replace(/\/+$/, "");
  const lastGood = new Map<string, unknown>();

  async function attempt(method: "GET" | "POST", path: string, body?: unknown): Promise<unknown> {
    const signal = AbortSignal.timeout(opts.timeoutMs);
    let res: Response;
    try {
      res = await doFetch(`${base}${path}`, {
        method,
        headers: { "X-Store-Key": opts.apiKey, Accept: "application/json", ...(body ? { "Content-Type": "application/json" } : {}) },
        body: body ? JSON.stringify(body) : undefined,
        signal,
        cache: "no-store",
      });
    } catch (e) {
      const timedOut = (e as Error)?.name === "TimeoutError" || signal.aborted;
      throw new BackofficeUnavailableError(timedOut ? `sin respuesta en ${opts.timeoutMs} ms (${path})` : `sin conexión (${path})`);
    }
    if (res.status === 404) throw new BackofficeNotFoundError(path);
    if (res.status >= 500) throw new BackofficeUnavailableError(`error ${res.status} (${path})`, res.status);
    // 401/403/429/400: no tiene sentido reintentar (clave mal configurada, límite, pedido inválido)
    if (!res.ok) throw new BackofficeUnavailableError(`respuesta ${res.status} (${path})`, res.status);
    return res.json();
  }

  /** Lectura con reintentos y respaldo en memoria. Un 404 no usa el respaldo (lo que no existe, no existe). */
  async function get<T>(path: string): Promise<T> {
    let lastError: unknown;
    for (let i = 0; i <= opts.retries; i++) {
      try {
        const data = await attempt("GET", path);
        lastGood.set(path, data);
        return data as T;
      } catch (e) {
        if (e instanceof BackofficeNotFoundError) throw e;
        lastError = e;
        const retryable = e instanceof BackofficeUnavailableError && (e.status === undefined || e.status >= 500);
        if (!retryable) break;
        if (i < opts.retries) await sleep(150 * (i + 1));
      }
    }
    if (lastGood.has(path)) {
      log(`${(lastError as Error).message}: se sirve la última copia buena`);
      return lastGood.get(path) as T;
    }
    throw lastError;
  }

  /** Escritura o lectura en vivo (POST): un solo intento, sin respaldo (los datos tienen que ser los de ahora). */
  async function post<T>(path: string, body: unknown): Promise<T> {
    return (await attempt("POST", path, body)) as T;
  }

  return { get, post, /** solo para tests */ _lastGood: lastGood };
}
