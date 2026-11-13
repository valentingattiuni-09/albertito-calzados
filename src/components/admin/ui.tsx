"use client";

import Image from "next/image";
import { createContext, startTransition, useContext, useRef, useState, useTransition } from "react";
import { useFormStatus } from "react-dom";
import type { ActionState } from "@/app/admin/actions";

export const inputCls =
  "h-11 w-full rounded-md border border-azul/30 bg-blanco px-3 text-base text-azul placeholder:text-gris-tinta aria-[invalid=true]:border-rojo disabled:opacity-60";
export const btnPrimary = "inline-flex h-11 items-center justify-center rounded-md bg-rojo px-5 text-sm font-bold uppercase text-blanco disabled:opacity-60";
export const btnSecondary = "inline-flex h-11 items-center justify-center rounded-md border-2 border-azul px-4 text-sm font-bold uppercase text-azul hover:bg-azul hover:text-blanco disabled:opacity-50";

export function Field({
  label,
  htmlFor,
  error,
  hint,
  children,
  className = "",
}: {
  label: string;
  htmlFor?: string;
  error?: string;
  hint?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <label htmlFor={htmlFor} className="mb-1 block text-sm font-semibold">
        {label}
      </label>
      {children}
      {hint && !error && <p className="mt-1 text-xs text-gris-tinta">{hint}</p>}
      {error && <p className="mt-1 text-sm font-semibold text-rojo">{error}</p>}
    </div>
  );
}

/** Interruptor (checkbox) accesible con nombre para formularios. */
export function Toggle({
  name,
  label,
  defaultChecked,
  checked,
  onChange,
}: {
  name?: string;
  label: string;
  defaultChecked?: boolean;
  checked?: boolean;
  onChange?: (v: boolean) => void;
}) {
  return (
    <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm font-medium">
      <input
        type="checkbox"
        name={name}
        role="switch"
        defaultChecked={defaultChecked}
        checked={checked}
        onChange={(e) => onChange?.(e.target.checked)}
        className="peer sr-only"
      />
      <span
        aria-hidden
        className="relative h-6 w-11 shrink-0 rounded-full bg-gris-tinta/40 transition-colors after:absolute after:left-0.5 after:top-0.5 after:size-5 after:rounded-full after:bg-blanco after:transition-transform peer-checked:bg-azul peer-checked:after:translate-x-5 peer-focus-visible:outline peer-focus-visible:outline-3 peer-focus-visible:outline-azul"
      />
      {label}
    </label>
  );
}

const PendingContext = createContext<boolean | null>(null);

/**
 * Formulario de acción que NO se resetea al enviar (React resetea los <form action>):
 * si hay un error de validación, la persona no pierde lo que cargó.
 */
export function ActionForm({
  dispatch,
  pending,
  className,
  children,
}: {
  dispatch: (fd: FormData) => void;
  pending: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <PendingContext.Provider value={pending}>
      <form
        className={className}
        // Sin JavaScript todavía: la acción del servidor funciona igual (POST, nunca GET con datos en la URL)
        action={dispatch}
        // Con JavaScript: se envía a mano para que React no resetee los campos
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          startTransition(() => dispatch(fd));
        }}
      >
        {children}
      </form>
    </PendingContext.Provider>
  );
}

export function SubmitButton({ children, className = btnPrimary }: { children: React.ReactNode; className?: string }) {
  const ctx = useContext(PendingContext);
  const status = useFormStatus();
  const pending = ctx ?? status.pending;
  return (
    <button type="submit" disabled={pending} className={className}>
      {pending ? "Guardando…" : children}
    </button>
  );
}

export function FormMessage({ state }: { state: ActionState }) {
  if (!state) return null;
  return (
    <p role={state.ok ? "status" : "alert"} className={`rounded-md border px-3 py-2 text-sm font-semibold ${state.ok ? "border-azul/30" : "border-rojo text-rojo"}`}>
      {state.message}
    </p>
  );
}

/** datetime-local con la hora de Argentina a partir de un ISO. */
export function toLocalInput(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(new Date(iso).getTime() - 3 * 3600_000);
  return d.toISOString().slice(0, 16);
}

// ---------------------------------------------------------------------------
// Subida de archivos (fotos comprimidas a WebP en el navegador)
// ---------------------------------------------------------------------------
async function compressImage(file: File, maxSide: number): Promise<File> {
  if (!file.type.startsWith("image/") || file.type === "image/gif") return file;
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/webp", 0.85));
  return blob ? new File([blob], file.name.replace(/\.\w+$/, ".webp"), { type: "image/webp" }) : file;
}

export async function uploadFile(file: File, folder: string, maxSide = 1800): Promise<{ url: string; type: string }> {
  const ready = await compressImage(file, maxSide);
  const body = new FormData();
  body.append("file", ready);
  body.append("folder", folder);
  const res = await fetch("/api/admin/upload", { method: "POST", body });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? "No se pudo subir el archivo.");
  return data;
}

/**
 * Campo de foto o video: arrastrar y soltar o elegir archivo; guarda la URL en un input oculto.
 * También acepta pegar una URL.
 */
export function MediaInput({
  name,
  label,
  defaultValue,
  accept = "image/*",
  folder,
  hint,
  error,
  aspect = "aspect-video",
  maxSide,
}: {
  name: string;
  label: string;
  defaultValue?: string | null;
  accept?: string;
  folder: string;
  hint?: string;
  error?: string;
  aspect?: string;
  maxSide?: number;
}) {
  const [url, setUrl] = useState(defaultValue ?? "");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [over, setOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const isVideo = /\.(mp4|webm|mov)$/i.test(url);

  const handle = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true);
    setErr(null);
    try {
      const r = await uploadFile(file, folder, maxSide);
      setUrl(r.url);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "No se pudo subir.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Field label={label} hint={hint} error={err ?? error}>
      <input type="hidden" name={name} value={url} />
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setOver(false);
          void handle(e.dataTransfer.files[0]);
        }}
        className={`relative flex ${aspect} w-full items-center justify-center overflow-hidden rounded-md border-2 border-dashed ${over ? "border-azul bg-azul/5" : "border-azul/30"}`}
      >
        {url ? (
          isVideo ? (
            <video src={url} className="h-full w-full object-contain" muted controls preload="metadata" />
          ) : (
            <Image src={url} alt="" fill sizes="400px" className="object-contain" />
          )
        ) : (
          <span className="px-4 text-center text-sm text-gris-tinta">{busy ? "Subiendo…" : "Arrastrá el archivo acá o tocá “Elegir archivo”"}</span>
        )}
        {busy && url && <span className="absolute inset-0 flex items-center justify-center bg-blanco/70 text-sm font-semibold">Subiendo…</span>}
      </div>
      <div className="mt-2 flex flex-wrap gap-2">
        <input ref={fileRef} type="file" accept={accept} className="sr-only" onChange={(e) => void handle(e.target.files?.[0])} tabIndex={-1} />
        <button type="button" onClick={() => fileRef.current?.click()} disabled={busy} className={btnSecondary}>
          Elegir archivo
        </button>
        {url && (
          <button type="button" onClick={() => setUrl("")} className="inline-flex h-11 items-center px-3 text-sm font-semibold underline">
            Quitar
          </button>
        )}
      </div>
    </Field>
  );
}

// ---------------------------------------------------------------------------
// Lista ordenable: arrastrar (mouse) o flechas (celular / teclado)
// ---------------------------------------------------------------------------
export function SortableList<T extends { id: string }>({
  items,
  onReorder,
  render,
  label,
}: {
  items: T[];
  onReorder: (ids: string[]) => Promise<void>;
  render: (item: T, index: number) => React.ReactNode;
  label: string;
}) {
  const [list, setList] = useState(items);
  const [dragId, setDragId] = useState<string | null>(null);
  const [pending, start] = useTransition();

  // Si el servidor manda otra lista (después de guardar), se toma esa
  const [prevItems, setPrevItems] = useState(items);
  if (prevItems !== items) {
    setPrevItems(items);
    setList(items);
  }

  const commit = (next: T[]) => {
    setList(next);
    start(() => onReorder(next.map((x) => x.id)));
  };
  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= list.length) return;
    const next = [...list];
    [next[i], next[j]] = [next[j], next[i]];
    commit(next);
  };

  return (
    <ul aria-label={label} className={`space-y-2 ${pending ? "opacity-70" : ""}`}>
      {list.map((item, i) => (
        <li
          key={item.id}
          draggable
          onDragStart={() => setDragId(item.id)}
          onDragOver={(e) => {
            e.preventDefault();
            if (!dragId || dragId === item.id) return;
            const from = list.findIndex((x) => x.id === dragId);
            const next = [...list];
            const [m] = next.splice(from, 1);
            next.splice(i, 0, m);
            setList(next);
          }}
          onDragEnd={() => {
            setDragId(null);
            commit(list);
          }}
          className={`flex items-center gap-2 rounded-lg border border-azul/15 bg-blanco p-2 ${dragId === item.id ? "opacity-50" : ""}`}
        >
          <span aria-hidden className="hidden cursor-grab select-none px-1 text-gris-tinta lg:block" title="Arrastrar para ordenar">
            ⋮⋮
          </span>
          <div className="min-w-0 flex-1">{render(item, i)}</div>
          <div className="flex shrink-0 flex-col">
            <button type="button" onClick={() => move(i, -1)} disabled={i === 0} aria-label="Subir" className="flex size-9 items-center justify-center rounded disabled:opacity-20">
              ▲
            </button>
            <button
              type="button"
              onClick={() => move(i, 1)}
              disabled={i === list.length - 1}
              aria-label="Bajar"
              className="flex size-9 items-center justify-center rounded disabled:opacity-20"
            >
              ▼
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
}

/** Interruptor que guarda al instante (activar/desactivar). */
export function InstantToggle({ checked, label, onToggle }: { checked: boolean; label: string; onToggle: (v: boolean) => Promise<void> }) {
  const [value, setValue] = useState(checked);
  const [pending, start] = useTransition();
  return (
    <span className={pending ? "opacity-60" : ""}>
      <Toggle
        label={label}
        checked={value}
        onChange={(v) => {
          setValue(v);
          start(() => onToggle(v));
        }}
      />
    </span>
  );
}

/** Botón borrar con confirmación. */
export function DeleteButton({ onDelete, what }: { onDelete: () => Promise<void>; what: string }) {
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        if (confirm(`¿Borrar ${what}? No se puede deshacer.`)) start(() => onDelete());
      }}
      className="inline-flex h-9 items-center rounded px-2 text-sm font-semibold text-rojo underline disabled:opacity-50"
    >
      Borrar
    </button>
  );
}
