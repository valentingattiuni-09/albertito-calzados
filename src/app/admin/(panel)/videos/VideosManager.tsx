"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState } from "react";
import { btnPrimary, btnSecondary, DeleteButton, Field, FormMessage, InstantToggle, inputCls, MediaInput, SortableList, SubmitButton, Toggle, ActionForm } from "@/components/admin/ui";
import type { AdminVideo } from "@/lib/admin/repo";
import type { InstagramMedia } from "@/lib/instagram";
import { deleteAction, reorderAction, saveVideoAction, toggleAction, type ActionState } from "../../actions";

type ProductOption = { id: string; name: string };

function VideoForm({
  video,
  products,
  preset,
  onDone,
}: {
  video?: AdminVideo;
  products: ProductOption[];
  preset?: Partial<AdminVideo>;
  onDone: () => void;
}) {
  const router = useRouter();
  const [state, action, pending] = useActionState<ActionState, FormData>(saveVideoAction, null);
  const [source, setSource] = useState<"upload" | "instagram">(video?.source ?? preset?.source ?? "upload");
  useEffect(() => {
    if (state?.ok) {
      router.refresh();
      onDone();
    }
  }, [state, router, onDone]);
  const e = state?.errors ?? {};
  const v = { ...preset, ...video };

  return (
    <ActionForm dispatch={action} pending={pending} className="space-y-4 rounded-xl border-2 border-azul p-4 sm:p-6">
      <h2 className="text-lg font-bold uppercase">{video ? "Editar video" : "Nuevo video"}</h2>
      {video && <input type="hidden" name="id" value={video.id} />}
      <fieldset>
        <legend className="mb-2 text-sm font-semibold">¿Cómo lo cargás?</legend>
        <div className="grid grid-cols-2 gap-2">
          {(
            [
              ["upload", "Subir el video"],
              ["instagram", "Link de Instagram"],
            ] as const
          ).map(([val, label]) => (
            <label key={val} className="flex min-h-11 cursor-pointer items-center justify-center rounded-md border border-azul/25 text-sm font-semibold has-[:checked]:border-azul has-[:checked]:bg-azul has-[:checked]:text-blanco">
              <input type="radio" name="source" value={val} checked={source === val} onChange={() => setSource(val)} className="sr-only" />
              {label}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-2">
        {source === "upload" ? (
          <MediaInput name="mediaUrl" label="Video (MP4 vertical)" defaultValue={v.mediaUrl} accept="video/mp4,video/webm,video/quicktime" folder="videos" aspect="aspect-[9/16] max-h-80" error={e.mediaUrl} />
        ) : (
          <Field label="Link del reel o post" htmlFor="v-ig" error={e.instagramUrl} hint="Ej: https://www.instagram.com/reel/ABC123/">
            <input id="v-ig" name="instagramUrl" defaultValue={v.instagramUrl ?? ""} className={inputCls} placeholder="https://www.instagram.com/reel/…" />
          </Field>
        )}
        <MediaInput name="thumbnail" label="Portada (foto vertical)" defaultValue={v.thumbnail} folder="videos" aspect="aspect-[9/16] max-h-80" maxSide={1080} hint="Es lo que se ve antes de tocar el video." />
      </div>

      <Field label="Producto (botón “Ver producto”)" htmlFor="v-prod" error={e.productId}>
        <select id="v-prod" name="productId" defaultValue={v.productId ?? ""} className={inputCls}>
          <option value="">Elegí un producto</option>
          {products.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Texto corto (opcional)" htmlFor="v-cap">
        <input id="v-cap" name="caption" defaultValue={v.caption ?? ""} maxLength={200} className={inputCls} />
      </Field>
      <Toggle name="active" label="Activo" defaultChecked={video?.active ?? true} />
      <FormMessage state={state} />
      <div className="flex flex-wrap gap-2">
        <SubmitButton>Guardar video</SubmitButton>
        <button type="button" onClick={onDone} className={btnSecondary}>
          Cancelar
        </button>
      </div>
    </ActionForm>
  );
}

export function VideosManager({
  videos,
  products,
  recent,
  instagramReady,
}: {
  videos: AdminVideo[];
  products: ProductOption[];
  recent: InstagramMedia[];
  instagramReady: boolean;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState<string | null>(null);
  const [preset, setPreset] = useState<Partial<AdminVideo> | undefined>();
  const done = () => {
    setEditing(null);
    setPreset(undefined);
  };
  const productName = (id: string | null) => products.find((p) => p.id === id)?.name ?? "Sin producto";

  return (
    <div className="space-y-6">
      {editing === "new" ? (
        <VideoForm key={preset?.instagramUrl ?? "new"} products={products} preset={preset} onDone={done} />
      ) : (
        <button type="button" onClick={() => setEditing("new")} className={btnPrimary}>
          + Nuevo video
        </button>
      )}

      <section className="rounded-xl border border-azul/15 p-4">
        <h2 className="text-base font-bold uppercase">Desde Instagram</h2>
        {instagramReady ? (
          recent.length === 0 ? (
            <p className="mt-1 text-sm text-gris-tinta">No pudimos traer los últimos posts. Revisá el token.</p>
          ) : (
            <ul className="no-scrollbar mt-3 flex gap-3 overflow-x-auto">
              {recent.map((m) => (
                <li key={m.id} className="w-28 shrink-0">
                  <span className="relative block aspect-[9/16] overflow-hidden rounded-md bg-azul/5">
                    {m.thumbnailUrl && <Image src={m.thumbnailUrl} alt="" fill sizes="112px" className="object-cover" unoptimized />}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setPreset({ source: "instagram", instagramUrl: m.permalink, caption: m.caption?.slice(0, 120) ?? null });
                      setEditing("new");
                    }}
                    className="mt-1 w-full text-xs font-semibold underline"
                  >
                    Usar este
                  </button>
                </li>
              ))}
            </ul>
          )
        ) : (
          <p className="mt-1 text-sm text-gris-tinta">
            Para traer los últimos reels automáticamente hace falta conectar la cuenta profesional de Instagram (INSTAGRAM_ACCESS_TOKEN). Mientras
            tanto, pegá el link del reel o subí el video.
          </p>
        )}
      </section>

      <SortableList
        label="Videos"
        items={videos}
        onReorder={(ids) => reorderAction("home_videos", ids)}
        render={(v) =>
          editing === v.id ? (
            <VideoForm video={v} products={products} onDone={done} />
          ) : (
            <div className="flex flex-wrap items-center gap-3">
              <span className="relative aspect-[9/16] w-12 shrink-0 overflow-hidden rounded bg-azul/10">
                {v.thumbnail && <Image src={v.thumbnail} alt="" fill sizes="48px" className="object-cover" />}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">{productName(v.productId)}</p>
                <p className="truncate text-xs text-gris-tinta">{v.source === "instagram" ? v.instagramUrl : v.mediaUrl ? "Video subido" : "Sin video (solo portada)"}</p>
              </div>
              <InstantToggle
                label="Activo"
                checked={v.active}
                onToggle={async (val) => {
                  await toggleAction("home_videos", v.id, val);
                  router.refresh();
                }}
              />
              <button type="button" onClick={() => setEditing(v.id)} className="inline-flex h-9 items-center px-2 text-sm font-semibold underline">
                Editar
              </button>
              <DeleteButton
                what="el video"
                onDelete={async () => {
                  await deleteAction("home_videos", v.id);
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
