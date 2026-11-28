"use server";

import { randomInt } from "node:crypto";
import { isBackoffice } from "@/lib/backoffice/source";
import { boWithdraw } from "@/lib/backoffice/checkout";
import { errorAction } from "@/lib/backoffice/checkout-map";
import { getSettings } from "@/lib/data/layout";
import { sendWithdrawalConfirmation } from "@/lib/email";
import { hasSupabase, serviceClient } from "@/lib/supabase/clients";

export type WithdrawalState = { ok: true; code: string } | { ok: false; message: string; field?: string } | null;

const g = globalThis as unknown as { __withdrawals?: unknown[] };

/** Botón de arrepentimiento (Res. 424/2020): registra la solicitud y entrega un código de trámite. */
export async function requestWithdrawal(_prev: WithdrawalState, f: FormData): Promise<WithdrawalState> {
  const v = (k: string, max = 120) => String(f.get(k) ?? "").trim().slice(0, max);
  const data = {
    firstName: v("firstName", 60),
    lastName: v("lastName", 60),
    dni: v("dni", 12).replace(/\D/g, ""),
    email: v("email").toLowerCase(),
    phone: v("phone", 30) || null,
    orderNumber: v("orderNumber", 20).toUpperCase() || null,
    reason: v("reason", 1000) || null,
  };
  if (!data.firstName || !data.lastName) return { ok: false, message: "Completá nombre y apellido.", field: "firstName" };
  if (!/^\d{7,8}$/.test(data.dni)) return { ok: false, message: "Revisá el DNI: 7 u 8 números.", field: "dni" };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(data.email)) return { ok: false, message: "Revisá tu mail.", field: "email" };
  if (data.orderNumber && !/^ALB-\d{6}$/.test(data.orderNumber)) return { ok: false, message: "El número de pedido es como ALB-001234.", field: "orderNumber" };

  // Con el back office: la solicitud se registra allá (siempre, aunque el número no coincida) y el mail con el código lo manda el back office
  if (isBackoffice()) {
    try {
      const res = await boWithdraw(data);
      if (res.status === 201 || res.status === 200) return { ok: true, code: res.body.code };
      return { ok: false, message: res.status === 400 ? "Revisá los datos e intentá de nuevo." : errorAction(res.body, res.status).message };
    } catch {
      const { store, whatsapp } = await getSettings();
      const contact = [store.email && `a ${store.email}`, whatsapp.display && `por WhatsApp al ${whatsapp.display}`].filter(Boolean).join(" o ");
      return { ok: false, message: `No pudimos registrar la solicitud. Probá de nuevo en unos minutos o pedí la revocación ${contact || "en el local"}.` };
    }
  }

  const code = `ARR-${new Date().getFullYear()}-${String(randomInt(0, 1_000_000)).padStart(6, "0")}`;

  try {
    if (hasSupabase) {
      const { error } = await serviceClient().from("withdrawal_requests").insert({
        code,
        order_number: data.orderNumber,
        first_name: data.firstName,
        last_name: data.lastName,
        dni: data.dni,
        email: data.email,
        phone: data.phone,
        reason: data.reason,
      });
      if (error) throw error;
    } else {
      (g.__withdrawals ??= []).push({ code, ...data, createdAt: new Date().toISOString() });
      console.info("[arrepentimiento:demo]", code, data.orderNumber);
    }
    const { store } = await getSettings();
    await sendWithdrawalConfirmation({ code, firstName: data.firstName, email: data.email, orderNumber: data.orderNumber }, store.email || null);
  } catch (e) {
    console.error("[arrepentimiento]", e);
    return { ok: false, message: "No pudimos registrar la solicitud. Probá de nuevo o escribinos por WhatsApp." };
  }
  return { ok: true, code };
}
