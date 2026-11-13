"use client";

import { useActionState, useState } from "react";
import { btnSecondary, Field, FormMessage, inputCls, SubmitButton, ActionForm } from "@/components/admin/ui";
import type { AdminFallbackRate } from "@/lib/admin/repo";
import type { ShippingConfig } from "@/lib/orders/live";
import { saveShippingAction, type ActionState } from "../../actions";

type Rate = Omit<AdminFallbackRate, "id"> & { key: string };

export function ShippingForm({ config, rates }: { config: ShippingConfig; rates: AdminFallbackRate[] }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(saveShippingAction, null);
  const [list, setList] = useState<Rate[]>(rates.map((r) => ({ ...r, key: r.id })));
  const e = state?.errors ?? {};
  const update = (key: string, patch: Partial<Rate>) => setList((l) => l.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  const num = (v: string) => Number(v.replace(/\D/g, "")) || 0;

  return (
    <ActionForm dispatch={action} pending={pending} className="space-y-8">
      <input type="hidden" name="rates" value={JSON.stringify(list)} />

      <section className="space-y-4 rounded-xl border border-azul/15 p-4 sm:p-6">
        <h2 className="text-lg font-bold uppercase">Origen y caja estándar</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <Field label="CP de origen (local)" htmlFor="s-cp" error={e.originCp}>
            <input id="s-cp" name="originCp" inputMode="numeric" maxLength={4} defaultValue={config.originCp} className={inputCls} />
          </Field>
          <Field label="Guardar cotizaciones (horas)" htmlFor="s-cache" hint="Para no consultar la API en cada clic.">
            <input id="s-cache" name="cacheHours" inputMode="numeric" defaultValue={config.cacheHours} className={inputCls} />
          </Field>
        </div>
        <p className="text-sm font-semibold">Caja de zapatos estándar (se usa si el producto no tiene medidas propias)</p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Field label="Peso (g)" htmlFor="s-w">
            <input id="s-w" name="weightG" inputMode="numeric" defaultValue={config.defaultBox.weightG} className={inputCls} />
          </Field>
          <Field label="Largo (cm)" htmlFor="s-l">
            <input id="s-l" name="l" inputMode="numeric" defaultValue={config.defaultBox.l} className={inputCls} />
          </Field>
          <Field label="Ancho (cm)" htmlFor="s-wd">
            <input id="s-wd" name="w" inputMode="numeric" defaultValue={config.defaultBox.w} className={inputCls} />
          </Field>
          <Field label="Alto (cm)" htmlFor="s-h">
            <input id="s-h" name="h" inputMode="numeric" defaultValue={config.defaultBox.h} className={inputCls} />
          </Field>
        </div>
      </section>

      <section className="space-y-4 rounded-xl border border-azul/15 p-4 sm:p-6">
        <h2 className="text-lg font-bold uppercase">Tarifas de respaldo por zona</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left">
                <th className="p-2">Zona</th>
                <th className="p-2">CP desde</th>
                <th className="p-2">CP hasta</th>
                <th className="p-2">Servicio</th>
                <th className="p-2">Precio ($)</th>
                <th className="p-2">Días</th>
                <th className="p-2">
                  <span className="sr-only">Quitar</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {list.map((r) => (
                <tr key={r.key} className="border-t border-azul/10">
                  <td className="p-1">
                    <input aria-label="Zona" value={r.zone} onChange={(ev) => update(r.key, { zone: ev.target.value })} className="h-10 w-40 rounded border border-azul/30 px-2" />
                  </td>
                  <td className="p-1">
                    <input aria-label="CP desde" inputMode="numeric" value={r.cpFrom || ""} onChange={(ev) => update(r.key, { cpFrom: num(ev.target.value) })} className="h-10 w-20 rounded border border-azul/30 px-2" />
                  </td>
                  <td className="p-1">
                    <input aria-label="CP hasta" inputMode="numeric" value={r.cpTo || ""} onChange={(ev) => update(r.key, { cpTo: num(ev.target.value) })} className="h-10 w-20 rounded border border-azul/30 px-2" />
                  </td>
                  <td className="p-1">
                    <select aria-label="Servicio" value={r.service} onChange={(ev) => update(r.key, { service: ev.target.value as Rate["service"] })} className="h-10 rounded border border-azul/30 px-2">
                      <option value="domicilio">Domicilio</option>
                      <option value="sucursal">Sucursal</option>
                    </select>
                  </td>
                  <td className="p-1">
                    <input aria-label="Precio" inputMode="numeric" value={r.price || ""} onChange={(ev) => update(r.key, { price: num(ev.target.value) })} className="h-10 w-24 rounded border border-azul/30 px-2" />
                  </td>
                  <td className="p-1">
                    <input aria-label="Días" inputMode="numeric" value={r.etaDays ?? ""} onChange={(ev) => update(r.key, { etaDays: num(ev.target.value) || null })} className="h-10 w-14 rounded border border-azul/30 px-2" />
                  </td>
                  <td className="p-1">
                    <button type="button" onClick={() => setList((l) => l.filter((x) => x.key !== r.key))} aria-label={`Quitar ${r.zone}`} className="px-2 text-rojo">
                      ✕
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <button
          type="button"
          onClick={() => setList((l) => [...l, { key: crypto.randomUUID(), zone: "", cpFrom: 0, cpTo: 0, service: "domicilio", price: 0, etaDays: null }])}
          className={btnSecondary}
        >
          + Agregar tarifa
        </button>
      </section>

      <div className="flex flex-wrap items-center gap-3">
        <SubmitButton>Guardar envíos</SubmitButton>
        <FormMessage state={state} />
      </div>
    </ActionForm>
  );
}
