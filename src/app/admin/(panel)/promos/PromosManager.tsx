"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState } from "react";
import {
 btnPrimary,
 btnSecondary,
 DeleteButton,
 Field,
 FormMessage,
 InstantToggle,
 inputCls,
 MediaInput,
 SortableList,
 SubmitButton,
 toLocalInput,
 Toggle, ActionForm } from "@/components/admin/ui";
import type { AdminPromo, AdminTopbar } from "@/lib/admin/repo";
import { formatPrice } from "@/lib/format";
import { deleteAction, reorderAction, savePromoAction, saveTopbarAction, toggleAction, type ActionState } from "../../actions";

const PROVIDERS = [
  ["visa", "Visa"],
  ["master", "Mastercard"],
  ["naranja", "Naranja"],
  ["go_cuotas", "Go Cuotas"],
] as const;

function useSaved(state: ActionState, onDone: () => void) {
  const router = useRouter();
  useEffect(() => {
    if (state?.ok) {
      router.refresh();
      onDone();
    }
  }, [state, router, onDone]);
}

function PromoForm({ promo, onDone }: { promo?: AdminPromo; onDone: () => void }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(savePromoAction, null);
  useSaved(state, onDone);
  const e = state?.errors ?? {};
  const [provider, setProvider] = useState(promo?.provider ?? "visa");
  const known = PROVIDERS.find(([v]) => v === provider);

  return (
    <ActionForm dispatch={action} pending={pending} className="space-y-4 rounded-xl border-2 border-azul p-4 sm:p-6">
      <h2 className="text-lg font-bold uppercase">{promo ? "Editar promo" : "Nueva promo"}</h2>
      {promo && <input type="hidden" name="id" value={promo.id} />}
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Medio de pago" htmlFor="p-provider" error={e.provider}>
          <select id="p-provider" name="provider" value={provider} onChange={(ev) => setProvider(ev.target.value)} className={inputCls}>
            {PROVIDERS.map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
            {!known && <option value={provider}>{provider}</option>}
          </select>
        </Field>
        <Field label="Nombre que ve el cliente" htmlFor="p-label" error={e.label}>
          <input id="p-label" name="label" defaultValue={promo?.label ?? known?.[1]} className={inputCls} />
        </Field>
        <Field label="Cuotas" htmlFor="p-inst" error={e.installments}>
          <input id="p-inst" name="installments" type="number" min={1} max={24} defaultValue={promo?.installments ?? 3} className={inputCls} />
        </Field>
        <Field label="Monto mínimo de compra ($)" htmlFor="p-min" error={e.minAmount} hint="0 = sin mínimo">
          <input id="p-min" name="minAmount" inputMode="numeric" defaultValue={promo?.minAmount ?? 0} className={inputCls} />
        </Field>
        <Field label="ID del plan en Payway (opcional)" htmlFor="p-plan">
          <input id="p-plan" name="paywayPlanId" defaultValue={promo?.paywayPlanId ?? ""} className={inputCls} />
        </Field>
        <div className="flex flex-col justify-end">
          <Toggle name="interestFree" label="Sin interés" defaultChecked={promo?.interestFree ?? true} />
          <Toggle name="showInTopbar" label="Mostrar en la barra azul" defaultChecked={promo?.showInTopbar ?? true} />
        </div>
        <Field label="Desde (opcional)" htmlFor="p-start">
          <input id="p-start" name="startsAt" type="datetime-local" defaultValue={toLocalInput(promo?.startsAt)} className={inputCls} />
        </Field>
        <Field label="Hasta (opcional)" htmlFor="p-end">
          <input id="p-end" name="endsAt" type="datetime-local" defaultValue={toLocalInput(promo?.endsAt)} className={inputCls} />
        </Field>
      </div>
      <div className="max-w-xs">
        <MediaInput name="logoUrl" label="Logo de la tarjeta (opcional)" defaultValue={promo?.logoUrl} folder="logos" aspect="aspect-[3/1]" maxSide={600} />
      </div>
      <Toggle name="active" label="Activa" defaultChecked={promo?.active ?? true} />
      <FormMessage state={state} />
      <div className="flex flex-wrap gap-2">
        <SubmitButton>Guardar promo</SubmitButton>
        <button type="button" onClick={onDone} className={btnSecondary}>
          Cancelar
        </button>
      </div>
    </ActionForm>
  );
}

function TopbarForm({ msg, onDone }: { msg?: AdminTopbar; onDone: () => void }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(saveTopbarAction, null);
  useSaved(state, onDone);
  const e = state?.errors ?? {};
  return (
    <ActionForm dispatch={action} pending={pending} className="space-y-3 rounded-xl border-2 border-azul p-4">
      {msg && <input type="hidden" name="id" value={msg.id} />}
      <Field label="Mensaje" htmlFor="t-text" error={e.text}>
        <input id="t-text" name="text" defaultValue={msg?.text} maxLength={120} className={inputCls} placeholder="Envíos a todo el país con Andreani y Correo Argentino" />
      </Field>
      <Field label="Link (opcional)" htmlFor="t-link" error={e.link}>
        <input id="t-link" name="link" defaultValue={msg?.link ?? ""} className={inputCls} placeholder="/ayuda/envios" />
      </Field>
      <Toggle name="active" label="Activo" defaultChecked={msg?.active ?? true} />
      <FormMessage state={state} />
      <div className="flex gap-2">
        <SubmitButton>Guardar</SubmitButton>
        <button type="button" onClick={onDone} className={btnSecondary}>
          Cancelar
        </button>
      </div>
    </ActionForm>
  );
}

export function PromosManager({ promos, topbar }: { promos: AdminPromo[]; topbar: AdminTopbar[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState<string | null>(null);
  const [editingMsg, setEditingMsg] = useState<string | null>(null);
  const done = () => setEditing(null);
  const doneMsg = () => setEditingMsg(null);

  return (
    <div className="space-y-10">
      <section className="space-y-4">
        <h2 className="text-lg font-bold uppercase">Promos de cuotas</h2>
        {editing === "new" ? (
          <PromoForm onDone={done} />
        ) : (
          <button type="button" onClick={() => setEditing("new")} className={btnPrimary}>
            + Nueva promo
          </button>
        )}
        <SortableList
          label="Promos"
          items={promos}
          onReorder={(ids) => reorderAction("payment_promos", ids)}
          render={(p) =>
            editing === p.id ? (
              <PromoForm promo={p} onDone={done} />
            ) : (
              <div className="flex flex-wrap items-center gap-3">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">
                    {p.label} {p.installments} {p.interestFree ? "cuotas sin interés" : "cuotas"}
                  </p>
                  <p className="text-xs text-gris-tinta">
                    {p.minAmount > 0 ? `Desde ${formatPrice(p.minAmount)}` : "Sin mínimo"}
                    {p.showInTopbar ? " · En la barra" : ""}
                  </p>
                </div>
                <InstantToggle
                  label="Activa"
                  checked={p.active}
                  onToggle={async (v) => {
                    await toggleAction("payment_promos", p.id, v);
                    router.refresh();
                  }}
                />
                <button type="button" onClick={() => setEditing(p.id)} className="inline-flex h-9 items-center px-2 text-sm font-semibold underline">
                  Editar
                </button>
                <DeleteButton
                  what={`la promo ${p.label}`}
                  onDelete={async () => {
                    await deleteAction("payment_promos", p.id);
                    router.refresh();
                  }}
                />
              </div>
            )
          }
        />
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-bold uppercase">Otros mensajes de la barra</h2>
          <p className="text-sm text-gris-tinta">Se muestran después de las cuotas (ej. envíos, horarios especiales).</p>
        </div>
        {editingMsg === "new" ? (
          <TopbarForm onDone={doneMsg} />
        ) : (
          <button type="button" onClick={() => setEditingMsg("new")} className={btnSecondary}>
            + Nuevo mensaje
          </button>
        )}
        <SortableList
          label="Mensajes"
          items={topbar}
          onReorder={(ids) => reorderAction("topbar_messages", ids)}
          render={(m) =>
            editingMsg === m.id ? (
              <TopbarForm msg={m} onDone={doneMsg} />
            ) : (
              <div className="flex flex-wrap items-center gap-3">
                <p className="min-w-0 flex-1 text-sm font-medium">{m.text}</p>
                <InstantToggle
                  label="Activo"
                  checked={m.active}
                  onToggle={async (v) => {
                    await toggleAction("topbar_messages", m.id, v);
                    router.refresh();
                  }}
                />
                <button type="button" onClick={() => setEditingMsg(m.id)} className="inline-flex h-9 items-center px-2 text-sm font-semibold underline">
                  Editar
                </button>
                <DeleteButton
                  what="el mensaje"
                  onDelete={async () => {
                    await deleteAction("topbar_messages", m.id);
                    router.refresh();
                  }}
                />
              </div>
            )
          }
        />
      </section>
    </div>
  );
}
