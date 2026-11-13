"use client";

import { useActionState } from "react";
import { Field, FormMessage, inputCls, SubmitButton, Toggle, ActionForm } from "@/components/admin/ui";
import type { StoreSettings } from "@/lib/data/types";
import { saveSettingsAction, type ActionState } from "../../actions";

export function SettingsForm({ settings }: { settings: StoreSettings }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(saveSettingsAction, null);
  const e = state?.errors ?? {};
  const s = settings;

  return (
    <ActionForm dispatch={action} pending={pending} className="space-y-8">
      <section className="space-y-4 rounded-xl border border-azul/15 p-4 sm:p-6">
        <h2 className="text-lg font-bold uppercase">WhatsApp</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Número (con 549 y característica)" htmlFor="c-wa" error={e.whatsappNumber} hint="Ej: 5492657123456. Se usa en el botón flotante y en las fichas.">
            <input id="c-wa" name="whatsappNumber" inputMode="numeric" defaultValue={s.whatsapp.number} className={inputCls} />
          </Field>
          <Field label="Cómo se muestra" htmlFor="c-wad" hint="Ej: 2657 12-3456">
            <input id="c-wad" name="whatsappDisplay" defaultValue={s.whatsapp.display} className={inputCls} />
          </Field>
        </div>
      </section>

      <section className="space-y-4 rounded-xl border border-azul/15 p-4 sm:p-6">
        <h2 className="text-lg font-bold uppercase">Datos del local</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Dirección" htmlFor="c-addr">
            <input id="c-addr" name="address" defaultValue={s.store.address} className={inputCls} />
          </Field>
          <Field label="Ciudad" htmlFor="c-city">
            <input id="c-city" name="city" defaultValue={s.store.city} className={inputCls} />
          </Field>
          <Field label="Provincia" htmlFor="c-prov">
            <input id="c-prov" name="province" defaultValue={s.store.province} className={inputCls} />
          </Field>
          <Field label="Días (corto)" htmlFor="c-hours">
            <input id="c-hours" name="hours" defaultValue={s.store.hours} className={inputCls} />
          </Field>
          <Field label="Horarios (completo)" htmlFor="c-hoursd" className="sm:col-span-2">
            <input id="c-hoursd" name="hoursDetail" defaultValue={s.store.hoursDetail} className={inputCls} />
          </Field>
          <Field label="Instagram" htmlFor="c-ig">
            <input id="c-ig" name="instagram" defaultValue={s.store.instagram} className={inputCls} />
          </Field>
          <Field label="Mail de contacto" htmlFor="c-mail" className="sm:col-span-2">
            <input id="c-mail" name="email" type="email" defaultValue={s.store.email} className={inputCls} />
          </Field>
        </div>
      </section>

      <section className="space-y-4 rounded-xl border border-azul/15 p-4 sm:p-6">
        <h2 className="text-lg font-bold uppercase">Popup de newsletter</h2>
        <Toggle name="popupEnabled" label="Mostrar el popup" defaultChecked={s.newsletterPopup.enabled} />
        <div className="grid gap-4 sm:grid-cols-[2fr_2fr_1fr]">
          <Field label="Título" htmlFor="c-pt">
            <input id="c-pt" name="popupTitle" maxLength={60} defaultValue={s.newsletterPopup.title} className={inputCls} />
          </Field>
          <Field label="Texto" htmlFor="c-px">
            <input id="c-px" name="popupText" maxLength={120} defaultValue={s.newsletterPopup.text} className={inputCls} />
          </Field>
          <Field label="Aparece a los (seg.)" htmlFor="c-pd">
            <input id="c-pd" name="popupDelay" inputMode="numeric" defaultValue={s.newsletterPopup.delaySeconds} className={inputCls} />
          </Field>
        </div>
      </section>

      <section className="space-y-4 rounded-xl border border-azul/15 p-4 sm:p-6">
        <h2 className="text-lg font-bold uppercase">Impuestos</h2>
        <Field label="Factor para “Precio sin impuestos nacionales”" htmlFor="c-tax" error={e.taxFactor} hint="Precio ÷ factor. Con IVA 21%: 1,21. Consultalo con tu contador.">
          <input id="c-tax" name="taxFactor" inputMode="decimal" defaultValue={String(s.tax.factor).replace(".", ",")} className={`${inputCls} max-w-32`} />
        </Field>
      </section>

      <div className="flex flex-wrap items-center gap-3">
        <SubmitButton>Guardar configuración</SubmitButton>
        <FormMessage state={state} />
      </div>
    </ActionForm>
  );
}
