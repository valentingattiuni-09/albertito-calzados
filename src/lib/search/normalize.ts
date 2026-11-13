/** minúsculas, sin acentos (la ñ se mantiene como n), solo letras y números. */
export function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function tokens(s: string): string[] {
  return normalize(s).split(" ").filter(Boolean);
}

/** Distancia de edición acotada (corta temprano si supera max). */
export function editDistance(a: string, b: string, max: number): number {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    let rowMin = i;
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      rowMin = Math.min(rowMin, cur[j]);
    }
    if (rowMin > max) return max + 1;
    prev = cur;
  }
  return prev[b.length];
}

/**
 * Puntaje de coincidencia de un término contra las palabras de un texto.
 * 3 = palabra exacta · 2 = prefijo · 1 = error de tipeo tolerado · 0 = no coincide
 */
export function termScore(term: string, words: string[]): number {
  let best = 0;
  const maxTypos = term.length >= 7 ? 2 : term.length >= 4 ? 1 : 0;
  for (const w of words) {
    if (w === term) return 3;
    if (w.startsWith(term)) best = Math.max(best, 2);
    else if (maxTypos > 0 && best < 1) {
      // compara contra la palabra completa y contra su prefijo del mismo largo (tipeo a medias)
      const d = Math.min(editDistance(term, w, maxTypos), editDistance(term, w.slice(0, term.length), maxTypos));
      if (d <= maxTypos) best = 1;
    }
  }
  return best;
}
