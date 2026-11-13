"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { btnSecondary, Field, FormMessage, inputCls, SubmitButton, Toggle, uploadFile, ActionForm } from "@/components/admin/ui";
import type { AdminColor, AdminProduct, AdminVariant } from "@/lib/admin/repo";
import { saveProductAction, type ActionState } from "../../../actions";

type Tree = { id: string; name: string; slug: string; children: { id: string; name: string }[] }[];

const slugify = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

const SIZE_PRESETS: Record<string, string> = {
  hombre: "39-45",
  mujer: "35-40",
  ninos: "26-35",
  alpargatas: "35-45",
};

/** "35-40" o "35,36,38" o "27/28, 29/30" → lista de talles */
function parseSizes(input: string): string[] {
  const out: string[] = [];
  for (const part of input.split(/[,\s]+/).filter(Boolean)) {
    const m = part.match(/^(\d{1,2})-(\d{1,2})$/);
    if (m && Number(m[2]) >= Number(m[1]) && Number(m[2]) - Number(m[1]) <= 25) {
      for (let i = Number(m[1]); i <= Number(m[2]); i++) out.push(String(i));
    } else out.push(part);
  }
  return [...new Set(out)];
}

const sortSizes = (xs: string[]) => [...xs].sort((a, b) => (Number(a.split(/[/-]/)[0]) || 0) - (Number(b.split(/[/-]/)[0]) || 0));

function ColorImages({ color, onChange, productName }: { color: AdminColor; onChange: (c: AdminColor) => void; productName: string }) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(0);
  const [over, setOver] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Las fotos se suben una por una y se agregan en orden
  const addFiles = async (files: FileList | File[]) => {
    const list = [...files].filter((f) => f.type.startsWith("image/")).slice(0, 12);
    setError(null);
    let images = [...color.images];
    for (const f of list) {
      setBusy((n) => n + 1);
      try {
        const r = await uploadFile(f, "productos", 1600);
        images = [...images, { url: r.url, alt: `${productName} ${color.name}`.trim() }];
        onChange({ ...color, images });
      } catch (e) {
        setError(e instanceof Error ? e.message : "No se pudo subir una foto.");
      } finally {
        setBusy((n) => n - 1);
      }
    }
  };

  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= color.images.length) return;
    const images = [...color.images];
    [images[i], images[j]] = [images[j], images[i]];
    onChange({ ...color, images });
  };

  return (
    <div>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setOver(false);
          void addFiles(e.dataTransfer.files);
        }}
        className={`rounded-md border-2 border-dashed p-3 ${over ? "border-azul bg-azul/5" : "border-azul/30"}`}
      >
        <ul className="flex flex-wrap gap-2">
          {color.images.map((img, i) => (
            <li key={img.url} className="w-24">
              <span className="relative block aspect-square overflow-hidden rounded border border-azul/10">
                <Image src={img.url} alt="" fill sizes="96px" className="object-contain" />
                {i === 0 && <span className="absolute left-1 top-1 rounded bg-azul px-1 text-[10px] font-bold text-blanco">PRINCIPAL</span>}
              </span>
              <span className="mt-1 flex justify-between text-xs">
                <button type="button" onClick={() => move(i, -1)} disabled={i === 0} aria-label="Mover a la izquierda" className="px-1 disabled:opacity-20">
                  ◀
                </button>
                <button type="button" onClick={() => onChange({ ...color, images: color.images.filter((_, k) => k !== i) })} className="font-semibold text-rojo underline">
                  Quitar
                </button>
                <button type="button" onClick={() => move(i, 1)} disabled={i === color.images.length - 1} aria-label="Mover a la derecha" className="px-1 disabled:opacity-20">
                  ▶
                </button>
              </span>
            </li>
          ))}
          <li className="flex w-24 flex-col items-center justify-center rounded border border-azul/20 text-center text-xs text-gris-tinta aspect-square">
            {busy > 0 ? `Subiendo ${busy}…` : "Arrastrá fotos acá"}
          </li>
        </ul>
        <input ref={input} type="file" accept="image/*" multiple className="sr-only" tabIndex={-1} onChange={(e) => e.target.files && void addFiles(e.target.files)} />
        <button type="button" onClick={() => input.current?.click()} className={`${btnSecondary} mt-3`}>
          Elegir fotos
        </button>
      </div>
      {error && <p className="mt-1 text-sm font-semibold text-rojo">{error}</p>}
    </div>
  );
}

export function ProductForm({ product, tree }: { product: AdminProduct; tree: Tree }) {
  const router = useRouter();
  const [state, action, pending] = useActionState<ActionState, FormData>(saveProductAction, null);
  const [p, setP] = useState<AdminProduct>(product);
  const [slugTouched, setSlugTouched] = useState(Boolean(product.id));
  const initialSizes = useMemo(() => sortSizes([...new Set(product.variants.map((v) => v.size))]), [product.variants]);
  const [sizesText, setSizesText] = useState(initialSizes.join(", "));
  const [specRows, setSpecRows] = useState<[string, string][]>(Object.entries(product.specs).length ? Object.entries(product.specs) : [["Material", ""]]);
  const e = state?.errors ?? {};

  useEffect(() => {
    if (state?.ok) router.refresh();
  }, [state, router]);

  const set = <K extends keyof AdminProduct>(k: K, v: AdminProduct[K]) => setP((x) => ({ ...x, [k]: v }));
  const sizes = useMemo(() => sortSizes(parseSizes(sizesText)), [sizesText]);
  const skuPrefix = (p.skuBase || slugify(p.name).slice(0, 12) || "ALB").toUpperCase();

  // Variante de un color y talle (la crea si no existe)
  const variantOf = (colorId: string, size: string): AdminVariant | undefined => p.variants.find((v) => v.colorId === colorId && v.size === size);
  const setStock = (color: AdminColor, size: string, stock: number) =>
    setP((x) => {
      const exists = x.variants.find((v) => v.colorId === color.id && v.size === size);
      const variants = exists
        ? x.variants.map((v) => (v === exists ? { ...v, stock } : v))
        : [...x.variants, { id: crypto.randomUUID(), colorId: color.id, size, stock, sku: `${skuPrefix}-${color.slug.slice(0, 3).toUpperCase()}-${size}` }];
      return { ...x, variants };
    });
  const setSku = (v: AdminVariant, sku: string) => setP((x) => ({ ...x, variants: x.variants.map((y) => (y.id === v.id ? { ...y, sku } : y)) }));

  // Al guardar solo van los talles de la lista (y sus variantes)
  const payload = useMemo(() => {
    const variants = p.colors.flatMap((c) =>
      sizes.map(
        (s) => variantOf(c.id, s) ?? { id: crypto.randomUUID(), colorId: c.id, size: s, stock: 0, sku: `${skuPrefix}-${c.slug.slice(0, 3).toUpperCase()}-${s}` },
      ),
    );
    return JSON.stringify({ ...p, specs: Object.fromEntries(specRows.filter(([k, v]) => k.trim() && v.trim())), variants });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [p, sizes, specRows, skuPrefix]);

  const toggleCat = (id: string, on: boolean, sectionId?: string) => {
    let ids = on ? [...new Set([...p.categoryIds, id])] : p.categoryIds.filter((x) => x !== id);
    // Elegir una subsección marca su sección
    if (on && sectionId) ids = [...new Set([...ids, sectionId])];
    set("categoryIds", ids);
    if (on && !sizesText) {
      const sec = tree.find((s) => s.id === (sectionId ?? id));
      if (sec && SIZE_PRESETS[sec.slug]) setSizesText(SIZE_PRESETS[sec.slug]);
    }
  };

  const addColor = () =>
    set("colors", [...p.colors, { id: crypto.randomUUID(), name: "", slug: "", hex: "#1f1f1f", images: [] }]);
  const updateColor = (c: AdminColor) => setP((x) => ({ ...x, colors: x.colors.map((y) => (y.id === c.id ? c : y)) }));

  const totalStock = p.variants.filter((v) => sizes.includes(v.size) && p.colors.some((c) => c.id === v.colorId)).reduce((n, v) => n + (v.stock || 0), 0);

  return (
    <ActionForm dispatch={action} pending={pending} className="space-y-8">
      <input type="hidden" name="payload" value={payload} />

      {/* Datos */}
      <section className="space-y-4 rounded-xl border border-azul/15 p-4 sm:p-6">
        <h2 className="text-lg font-bold uppercase">Datos</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Nombre" htmlFor="pr-name" error={e.name}>
            <input
              id="pr-name"
              value={p.name}
              onChange={(ev) => {
                set("name", ev.target.value);
                if (!slugTouched) set("slug", slugify(ev.target.value));
              }}
              className={inputCls}
            />
          </Field>
          <Field label="URL" htmlFor="pr-slug" error={e.slug} hint={`albertitocalzados.com.ar/producto/${p.slug || "…"}`}>
            <input
              id="pr-slug"
              value={p.slug}
              onChange={(ev) => {
                setSlugTouched(true);
                set("slug", slugify(ev.target.value));
              }}
              className={inputCls}
            />
          </Field>
          <Field label="Precio ($)" htmlFor="pr-price" error={e.basePrice} hint="Con IVA, sin centavos. La oferta se carga en “Ofertas”.">
            <input id="pr-price" inputMode="numeric" value={p.basePrice || ""} onChange={(ev) => set("basePrice", Number(ev.target.value.replace(/\D/g, "")))} className={inputCls} />
          </Field>
          <Field label="Línea" htmlFor="pr-line">
            <select id="pr-line" value={p.line} onChange={(ev) => set("line", ev.target.value as AdminProduct["line"])} className={inputCls}>
              <option value="diario">De todos los días</option>
              <option value="seleccion">Selección Albertito</option>
            </select>
          </Field>
          <Field label="Código (SKU base)" htmlFor="pr-sku" hint="Opcional. Se usa para armar el SKU de cada talle.">
            <input id="pr-sku" value={p.skuBase ?? ""} onChange={(ev) => set("skuBase", ev.target.value.toUpperCase())} className={inputCls} />
          </Field>
          <div className="flex flex-col justify-end">
            <Toggle label="Nuevo (badge NUEVO)" checked={p.isNew} onChange={(v) => set("isNew", v)} />
            <Toggle label="Destacado" checked={p.isFeatured} onChange={(v) => set("isFeatured", v)} />
            <Toggle label="Visible en la tienda" checked={p.active} onChange={(v) => set("active", v)} />
          </div>
        </div>
        <Field label="Descripción" htmlFor="pr-desc">
          <textarea id="pr-desc" rows={4} value={p.description} onChange={(ev) => set("description", ev.target.value)} className={`${inputCls} h-auto py-2`} />
        </Field>
        <fieldset>
          <legend className="mb-2 text-sm font-semibold">Especificaciones</legend>
          <div className="space-y-2">
            {specRows.map(([k, v], i) => (
              <div key={i} className="flex gap-2">
                <input aria-label="Nombre" value={k} onChange={(ev) => setSpecRows((r) => r.map((x, j) => (j === i ? [ev.target.value, x[1]] : x)))} className={`${inputCls} w-40`} placeholder="Material" />
                <input aria-label="Valor" value={v} onChange={(ev) => setSpecRows((r) => r.map((x, j) => (j === i ? [x[0], ev.target.value] : x)))} className={inputCls} placeholder="Cuero" />
                <button type="button" onClick={() => setSpecRows((r) => r.filter((_, j) => j !== i))} aria-label="Quitar" className="px-2 text-rojo">
                  ✕
                </button>
              </div>
            ))}
            <button type="button" onClick={() => setSpecRows((r) => [...r, ["", ""]])} className="text-sm font-semibold underline">
              + Agregar dato
            </button>
          </div>
        </fieldset>
      </section>

      {/* Secciones */}
      <section className="space-y-3 rounded-xl border border-azul/15 p-4 sm:p-6">
        <h2 className="text-lg font-bold uppercase">Secciones</h2>
        {e.categoryIds && <p className="text-sm font-semibold text-rojo">{e.categoryIds}</p>}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {tree.map((s) => (
            <fieldset key={s.id}>
              <legend className="sr-only">{s.name}</legend>
              <label className="flex min-h-10 items-center gap-2 font-bold uppercase">
                <input type="checkbox" checked={p.categoryIds.includes(s.id)} onChange={(ev) => toggleCat(s.id, ev.target.checked)} className="size-5 accent-azul" />
                {s.name}
              </label>
              {s.children.map((c) => (
                <label key={c.id} className="flex min-h-10 items-center gap-2 pl-6 text-sm">
                  <input type="checkbox" checked={p.categoryIds.includes(c.id)} onChange={(ev) => toggleCat(c.id, ev.target.checked, s.id)} className="size-5 accent-azul" />
                  {c.name}
                </label>
              ))}
            </fieldset>
          ))}
        </div>
      </section>

      {/* Colores y fotos */}
      <section className="space-y-4 rounded-xl border border-azul/15 p-4 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-bold uppercase">Colores y fotos</h2>
          <button type="button" onClick={addColor} className={btnSecondary}>
            + Agregar color
          </button>
        </div>
        <p className="text-sm text-gris-tinta">Fotos cuadradas, fondo blanco, zapato a 45°. La primera es la principal; la segunda se ve al pasar el mouse.</p>
        {e.colors && <p className="text-sm font-semibold text-rojo">{e.colors}</p>}
        {p.colors.map((c) => (
          <div key={c.id} className="space-y-3 rounded-lg border border-azul/15 p-3">
            <div className="flex flex-wrap items-end gap-2">
              <Field label="Color" htmlFor={`c-${c.id}`} className="min-w-40 flex-1">
                <input
                  id={`c-${c.id}`}
                  value={c.name}
                  onChange={(ev) => updateColor({ ...c, name: ev.target.value, slug: slugify(ev.target.value) })}
                  placeholder="Negro"
                  className={inputCls}
                />
              </Field>
              <label className="text-sm font-semibold">
                Muestra
                <input type="color" value={c.hex} onChange={(ev) => updateColor({ ...c, hex: ev.target.value })} className="mt-1 block h-11 w-16 cursor-pointer rounded border border-azul/30" />
              </label>
              <button
                type="button"
                onClick={() => confirm(`¿Quitar el color ${c.name || ""} con sus fotos y stock?`) && setP((x) => ({ ...x, colors: x.colors.filter((y) => y.id !== c.id), variants: x.variants.filter((v) => v.colorId !== c.id) }))}
                className="h-11 px-2 text-sm font-semibold text-rojo underline"
              >
                Quitar color
              </button>
            </div>
            <ColorImages color={c} onChange={updateColor} productName={p.name} />
          </div>
        ))}
      </section>

      {/* Talles y stock */}
      <section className="space-y-4 rounded-xl border border-azul/15 p-4 sm:p-6">
        <h2 className="text-lg font-bold uppercase">Talles y stock</h2>
        <Field label="Talles" htmlFor="pr-sizes" hint="Rango “35-40” o lista “35, 36, 38”. Talles dobles: “27/28”." error={e.variants}>
          <input id="pr-sizes" value={sizesText} onChange={(ev) => setSizesText(ev.target.value)} className={inputCls} placeholder="35-40" />
        </Field>
        {p.colors.length > 0 && sizes.length > 0 ? (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr>
                    <th className="sticky left-0 bg-blanco p-2 text-left">Talle</th>
                    {p.colors.map((c) => (
                      <th key={c.id} className="p-2 text-left">
                        <span className="inline-flex items-center gap-1">
                          <span className="size-3 rounded-full border border-azul/20" style={{ backgroundColor: c.hex }} />
                          {c.name || "Color"}
                        </span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sizes.map((s) => (
                    <tr key={s} className="border-t border-azul/10">
                      <th scope="row" className="sticky left-0 bg-blanco p-2 text-left font-semibold">
                        {s}
                      </th>
                      {p.colors.map((c) => (
                        <td key={c.id} className="p-1">
                          <input
                            aria-label={`Stock ${c.name} talle ${s}`}
                            inputMode="numeric"
                            value={variantOf(c.id, s)?.stock ?? 0}
                            onChange={(ev) => setStock(c, s, Number(ev.target.value.replace(/\D/g, "")) || 0)}
                            onFocus={(ev) => ev.target.select()}
                            className="h-10 w-16 rounded border border-azul/30 px-2 text-center"
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-sm">Stock total: <strong>{totalStock}</strong> pares</p>
            <details className="text-sm">
              <summary className="min-h-11 cursor-pointer py-2 font-semibold">Ver y editar SKUs</summary>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {p.variants
                  .filter((v) => sizes.includes(v.size) && p.colors.some((c) => c.id === v.colorId))
                  .map((v) => (
                    <label key={v.id} className="flex items-center gap-2">
                      <span className="w-24 shrink-0 text-xs">
                        {p.colors.find((c) => c.id === v.colorId)?.name} {v.size}
                      </span>
                      <input value={v.sku} onChange={(ev) => setSku(v, ev.target.value.toUpperCase())} className="h-9 w-full rounded border border-azul/30 px-2 text-xs" />
                    </label>
                  ))}
              </div>
              <p className="mt-2 text-xs text-gris-tinta">Los talles sin cargar se crean con stock 0 y SKU automático al guardar.</p>
            </details>
          </>
        ) : (
          <p className="text-sm text-gris-tinta">Agregá al menos un color y los talles para cargar el stock.</p>
        )}
      </section>

      {/* Envío */}
      <section className="space-y-4 rounded-xl border border-azul/15 p-4 sm:p-6">
        <h2 className="text-lg font-bold uppercase">Caja (para cotizar envíos)</h2>
        <p className="text-sm text-gris-tinta">Si lo dejás vacío se usa la caja estándar de “Envíos”.</p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Field label="Peso (gramos)" htmlFor="pr-w">
            <input id="pr-w" inputMode="numeric" value={p.weightG ?? ""} onChange={(ev) => set("weightG", Number(ev.target.value.replace(/\D/g, "")) || null)} className={inputCls} />
          </Field>
          {(["l", "w", "h"] as const).map((k) => (
            <Field key={k} label={`${k === "l" ? "Largo" : k === "w" ? "Ancho" : "Alto"} (cm)`} htmlFor={`pr-${k}`}>
              <input
                id={`pr-${k}`}
                inputMode="numeric"
                value={p.box?.[k] ?? ""}
                onChange={(ev) => set("box", { l: p.box?.l ?? 0, w: p.box?.w ?? 0, h: p.box?.h ?? 0, [k]: Number(ev.target.value.replace(/\D/g, "")) || 0 })}
                className={inputCls}
              />
            </Field>
          ))}
        </div>
      </section>

      <div className="sticky bottom-0 z-10 -mx-3 flex flex-wrap items-center gap-3 border-t border-azul/15 bg-blanco px-3 py-3 lg:-mx-8 lg:px-8">
        <SubmitButton>{p.id ? "Guardar cambios" : "Crear producto"}</SubmitButton>
        <FormMessage state={state} />
      </div>
    </ActionForm>
  );
}
