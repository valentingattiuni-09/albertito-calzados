"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { analytics } from "@/lib/analytics";
import { POLL_DELAYS_S, purchaseKey, purchaseStatus, resumeStorageKey, type BoStoreStatus } from "@/lib/backoffice/checkout-map";
import { writeCart } from "@/lib/cart/store";

type Purchase = { total: number; shipping: number; items: { sku: string; name: string; price: number; qty: number }[] };

/**
 * Lo que la confirmación hace en el navegador (con el back office):
 *  - canjea el link del mail (#r=…, que el script del <head> ya sacó de la barra) por un token nuevo en la cookie;
 *  - mientras el pedido esté pendiente, consulta el estado (2, 4, 8, 15 y 30 s) y después ofrece «Actualizar»;
 *  - con el pedido pagado o en revisión, vacía el carrito;
 *  - el evento purchase SOLO con el pedido pagado y una sola vez por pedido (aunque se recargue o se vuelva otro día).
 */
export function BoOrderLive({ number, storeStatus, paymentStatus, purchase }: { number: string; storeStatus: BoStoreStatus | null; paymentStatus: string | null; purchase: Purchase | null }) {
  const router = useRouter();
  const [resumeMsg, setResumeMsg] = useState<string | null>(null);
  const [pollDone, setPollDone] = useState(false);
  const seen = useRef(`${storeStatus}|${paymentStatus}`);

  // Canje del link del mail
  useEffect(() => {
    let sig: string | null = null;
    try {
      const key = resumeStorageKey(window.location.pathname);
      sig = sessionStorage.getItem(key);
      if (sig) sessionStorage.removeItem(key);
    } catch {
      /* sin storage */
    }
    if (!sig) return;
    void fetch("/api/checkout/resume", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ number, signature: sig }) })
      .then((r) => r.json())
      .then((d: { ok: boolean; message?: string }) => (d.ok ? router.refresh() : setResumeMsg(d.message ?? "No pudimos abrir el link.")))
      .catch(() => setResumeMsg("No pudimos abrir el link. Revisá tu conexión."));
  }, [number, router]);

  // Consulta periódica mientras esté pendiente (sin un rechazo: ahí la persona decide reintentar)
  useEffect(() => {
    if (storeStatus !== "pendiente" || paymentStatus === "REJECTED") return;
    let cancel = false;
    const timers: ReturnType<typeof setTimeout>[] = [];
    POLL_DELAYS_S.forEach((s, i) =>
      timers.push(
        setTimeout(async () => {
          if (cancel) return;
          try {
            const d = (await fetch(`/api/checkout/status/${number}`, { cache: "no-store" }).then((r) => r.json())) as { storeStatus?: string; payment?: { status: string } | null };
            const now = `${d.storeStatus}|${d.payment?.status ?? null}`;
            if (d.storeStatus && now !== seen.current) {
              seen.current = now;
              router.refresh();
            }
          } catch {
            /* se reintenta en la próxima */
          }
          if (i === POLL_DELAYS_S.length - 1) setPollDone(true);
        }, s * 1000),
      ),
    );
    return () => {
      cancel = true;
      timers.forEach(clearTimeout);
    };
  }, [number, storeStatus, paymentStatus, router]);

  // Pagado o en revisión: el carrito y el pedido en curso ya no hacen falta
  useEffect(() => {
    if (storeStatus && storeStatus !== "pendiente" && storeStatus !== "cancelado") {
      writeCart([]);
      try {
        sessionStorage.removeItem("albertito:orderKey");
      } catch {
        /* sin storage */
      }
    }
  }, [storeStatus]);

  // Analítica: solo pagado, una sola vez por pedido (localStorage sobrevive a otra visita; sessionStorage, si localStorage no está)
  useEffect(() => {
    if (!purchase || !storeStatus || !purchaseStatus(storeStatus)) return;
    const key = purchaseKey(number);
    try {
      if (localStorage.getItem(key) || sessionStorage.getItem(key)) return;
      localStorage.setItem(key, "1");
      sessionStorage.setItem(key, "1");
    } catch {
      /* sin storage: se manda igual, una vez por carga */
    }
    analytics.purchase(number, purchase.total, purchase.shipping, purchase.items.map((i) => ({ id: i.sku, name: i.name, price: i.price, quantity: i.qty })));
  }, [number, storeStatus, purchase]);

  return (
    <>
      {resumeMsg && (
        <p role="alert" className="mt-6 rounded-md border border-rojo/40 p-3 text-sm font-semibold text-rojo">
          {resumeMsg}
        </p>
      )}
      {storeStatus === "pendiente" && paymentStatus !== "REJECTED" && pollDone && (
        <div className="mt-6 text-center">
          <p className="text-sm">Todavía no tenemos la confirmación del pago. Puede tardar unos minutos.</p>
          <button type="button" onClick={() => router.refresh()} className="mt-3 h-12 rounded-md border-2 border-azul px-5 text-sm font-bold uppercase">
            Actualizar
          </button>
        </div>
      )}
    </>
  );
}
