"use client";

import Image from "next/image";
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
import type { AdminBanner } from "@/lib/admin/repo";
import { deleteAction, reorderAction, saveBannerAction, toggleAction, type ActionState } from "../../actions";

const fmt = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString("es-AR", { timeZone: "America/Argentina/Buenos_Aires" }) : null);

function BannerForm({ banner, onDone }: { banner?: AdminBanner; onDone: () => void }) {
  const router = useRouter();
  const [state, action, pending] = useActionState<ActionState, FormData>(saveBannerAction, null);
  useEffect(() => {
    if (state?.ok) {
      router.refresh();
      onDone();
    }
  }, [state, router, onDone]);
  const e = state?.errors ?? {};

  return (
    <ActionForm dispatch={action} pending={pending} className="space-y-4 rounded-xl border-2 border-azul p-4 sm:p-6">
      <h2 className="text-lg font-bold uppercase">{banner ? "Editar banner" : "Nuevo banner"}</h2>
      {banner && <input type="hidden" name="id" value={banner.id} />}
      <div className="grid gap-4 md:grid-cols-[2fr_1fr]">
        <MediaInput name="imageDesktop" label="Imagen desktop (1600 × 600)" defaultValue={banner?.imageDesktop} folder="banners" error={e.imageDesktop} aspect="aspect-[8/3]" maxSide={2400} />
        <MediaInput name="imageMobile" label="Imagen mobile (800 × 800)" defaultValue={banner?.imageMobile} folder="banners" aspect="aspect-square" hint="Si no subís, se usa la de desktop." />
      </div>
      <MediaInput name="videoUrl" label="Video (opcional, reemplaza la imagen)" defaultValue={banner?.videoUrl} accept="video/mp4,video/webm" folder="banners" hint="MP4 corto y liviano (menos de 10 MB). La imagen se usa como portada." />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Título" htmlFor="b-title" error={e.title}>
          <input id="b-title" name="title" defaultValue={banner?.title} className={inputCls} aria-invalid={!!e.title} />
        </Field>
        <Field label="Link (a dónde lleva)" htmlFor="b-link" error={e.link} hint="Ej: /ofertas o /mujer/verano">
          <input id="b-link" name="link" defaultValue={banner?.link ?? ""} placeholder="/ofertas" className={inputCls} aria-invalid={!!e.link} />
        </Field>
      </div>
      <Field label="Texto alternativo (qué dice el banner)" htmlFor="b-alt" hint="Para lectores de pantalla y Google.">
        <input id="b-alt" name="alt" defaultValue={banner?.alt} className={inputCls} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Desde (opcional)" htmlFor="b-start">
          <input id="b-start" name="startsAt" type="datetime-local" defaultValue={toLocalInput(banner?.startsAt)} className={inputCls} />
        </Field>
        <Field label="Hasta (opcional)" htmlFor="b-end" error={e.endsAt}>
          <input id="b-end" name="endsAt" type="datetime-local" defaultValue={toLocalInput(banner?.endsAt)} className={inputCls} />
        </Field>
      </div>
      <Toggle name="active" label="Activo" defaultChecked={banner?.active ?? true} />
      <FormMessage state={state} />
      <div className="flex flex-wrap gap-2">
        <SubmitButton>Guardar banner</SubmitButton>
        <button type="button" onClick={onDone} className={btnSecondary}>
          Cancelar
        </button>
      </div>
    </ActionForm>
  );
}

export function BannersManager({ banners }: { banners: AdminBanner[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState<string | "new" | null>(null);
  const done = () => setEditing(null);

  return (
    <div className="space-y-4">
      {editing === "new" ? (
        <BannerForm onDone={done} />
      ) : (
        <button type="button" onClick={() => setEditing("new")} className={btnPrimary}>
          + Nuevo banner
        </button>
      )}

      {banners.length === 0 && <p className="text-sm text-gris-tinta">Todavía no hay banners.</p>}

      <SortableList
        label="Banners"
        items={banners}
        onReorder={(ids) => reorderAction("home_banners", ids)}
        render={(b) =>
          editing === b.id ? (
            <BannerForm banner={b} onDone={done} />
          ) : (
            <div className="flex flex-wrap items-center gap-3">
              <span className="relative aspect-[8/3] w-24 shrink-0 overflow-hidden rounded bg-azul/5 sm:w-32">
                {b.imageDesktop && <Image src={b.imageDesktop} alt="" fill sizes="128px" className="object-cover" />}
              </span>
              <div className="min-w-0 flex-1 basis-40">
                <p className="truncate font-semibold">{b.title}</p>
                <p className="truncate text-xs text-gris-tinta">
                  {b.link || "Sin link"}
                  {(b.startsAt || b.endsAt) && ` · ${fmt(b.startsAt) ?? "ya"} → ${fmt(b.endsAt) ?? "sin fin"}`}
                </p>
              </div>
              <InstantToggle
                label="Activo"
                checked={b.active}
                onToggle={async (v) => {
                  await toggleAction("home_banners", b.id, v);
                  router.refresh();
                }}
              />
              <button type="button" onClick={() => setEditing(b.id)} className="inline-flex h-9 items-center rounded px-2 text-sm font-semibold underline">
                Editar
              </button>
              <DeleteButton
                what={`el banner “${b.title}”`}
                onDelete={async () => {
                  await deleteAction("home_banners", b.id);
                  router.refresh();
                }}
              />
            </div>
          )
        }
      />
    </div>
  );
}
