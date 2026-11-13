"use client";

import { useEffect } from "react";

/**
 * Marca la sección activa en la barra de secciones (subrayado) sin que el header dependa de la URL:
 * cada página de sección, subsección o producto dice a qué sección pertenece.
 */
export function ActiveSection({ slug }: { slug: string | null | undefined }) {
  useEffect(() => {
    if (!slug) return;
    const root = document.documentElement;
    root.dataset.activeSection = slug;
    const link = document.querySelector<HTMLAnchorElement>(`header [data-section="${CSS.escape(slug)}"]`);
    link?.setAttribute("aria-current", "true");
    return () => {
      if (root.dataset.activeSection === slug) delete root.dataset.activeSection;
      link?.removeAttribute("aria-current");
    };
  }, [slug]);
  return null;
}
