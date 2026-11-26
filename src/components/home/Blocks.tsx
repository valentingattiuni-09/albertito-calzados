import Image from "next/image";
import Link from "next/link";
import { CardIcon, ChevronRightIcon, InstagramIcon, SwapIcon, TruckIcon } from "@/components/ui/icons";
import { PaymentLogo } from "@/components/ui/PaymentLogo";
import type { NavSection, PaymentPromo } from "@/lib/data/types";
import { formatPrice } from "@/lib/format";

export function SectionTitle({
  id,
  children,
  href,
  linkLabel = "Ver todo",
  className = "",
}: {
  id: string;
  children: React.ReactNode;
  href?: string;
  linkLabel?: string;
  className?: string;
}) {
  return (
    <div className={`mb-5 flex items-end justify-between gap-4 ${className}`}>
      <h2 id={id} className="text-xl font-bold uppercase sm:text-2xl">
        {children}
      </h2>
      {href && (
        <Link href={href} className="inline-flex min-h-11 shrink-0 items-center gap-1 text-sm font-semibold underline-offset-4 hover:underline">
          {linkLabel} <ChevronRightIcon size={16} />
        </Link>
      )}
    </div>
  );
}

/** Fila de beneficios (sale de las promos activas). */
export function BenefitsRow({ promos }: { promos: PaymentPromo[] }) {
  // Agrupa por cantidad de cuotas: "3 S/I con Visa y Mastercard"
  const groups = new Map<number, PaymentPromo[]>();
  promos
    .filter((p) => p.interestFree && p.installments > 1)
    .forEach((p) => groups.set(p.installments, [...(groups.get(p.installments) ?? []), p]));

  const items: { icon: React.ReactNode; title: string; text: React.ReactNode }[] = [
    ...[...groups].sort((a, b) => b[0] - a[0]).map(([n, ps]) => ({
      icon: <CardIcon />,
      title: `${n} cuotas sin interés`,
      text: (
        <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
          {ps.map((p) => (
            <PaymentLogo key={p.id} provider={p.provider} logoUrl={p.logoUrl} label={p.label} className="h-4" compact textClassName="text-xs font-semibold" />
          ))}
        </span>
      ),
    })),
    { icon: <CardIcon />, title: "Pagá en efectivo", text: "Pago Fácil y Rapipago" },
    { icon: <TruckIcon />, title: "Envíos a todo el país", text: "Andreani y Correo Argentino" },
    { icon: <SwapIcon />, title: "Cambiá gratis en el local", text: "Edison 15, Villa Mercedes" },
  ];

  return (
    <section aria-label="Beneficios" className="border-b border-azul/10">
      <ul
        className="no-scrollbar mx-auto flex max-w-tienda snap-x scroll-px-4 gap-5 overflow-x-auto px-4 py-3 lg:grid lg:grid-cols-[repeat(var(--cols),minmax(0,1fr))] lg:gap-4 lg:px-6 lg:py-4"
        style={{ ["--cols" as string]: items.length }}
      >
        {items.map((it) => (
          <li key={it.title} className="flex shrink-0 snap-start items-center gap-3 lg:shrink">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-azul text-blanco">{it.icon}</span>
            <span className="whitespace-nowrap text-[13px] leading-tight lg:whitespace-normal lg:text-sm">
              <strong className="block font-semibold">{it.title}</strong>
              <span className="text-gris-tinta">{it.text}</span>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** 5 tarjetas grandes para entrar a cada sección. */
export function SectionCards({ sections }: { sections: NavSection[] }) {
  return (
    <section aria-labelledby="secciones-home" className="mx-auto max-w-tienda px-4 lg:px-6">
      <SectionTitle id="secciones-home">Elegí tu sección</SectionTitle>
      <ul className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-5">
        {sections.map((s, i) => (
          <li key={s.id} className={i === sections.length - 1 && sections.length % 2 === 1 ? "col-span-2 md:col-span-1" : ""}>
            <Link
              href={s.href}
              className="group relative block aspect-[4/5] overflow-hidden rounded-lg bg-rojo md:aspect-[3/4]"
            >
              <Image
                src={s.promo?.image ?? (s.kind === "offers" ? "/demo/promo-ofertas.svg" : `/demo/promo-${s.slug}.svg`)}
                alt=""
                fill
                sizes="(min-width: 768px) 20vw, 50vw"
                className="object-cover transition-transform duration-300 group-hover:scale-105"
              />
              <span className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-gradient-to-t from-black/45 to-transparent px-4 pb-4 pt-10 text-lg font-bold uppercase text-blanco">
                {s.name} <ChevronRightIcon size={20} />
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Tarjetas por medio de pago con sus cuotas S/I y monto mínimo. */
export function PaymentPromosBlock({ promos }: { promos: PaymentPromo[] }) {
  if (promos.length === 0) return null;
  return (
    <section aria-labelledby="medios-pago" className="mx-auto max-w-tienda px-4 lg:px-6">
      <SectionTitle id="medios-pago">Medios de pago y promociones</SectionTitle>
      {/* Una columna por tarjeta en escritorio (máx. 5), así ninguna queda sola en una fila */}
      <ul
        className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-[repeat(var(--cols),minmax(0,1fr))]"
        style={{ ["--cols" as string]: Math.min(promos.length + 1, 5) }}
      >
        {promos.map((p) => (
          <li key={p.id} className="flex flex-col justify-between rounded-lg border border-azul/15 p-4 sm:p-5">
            <div className="flex h-8 items-center">
              <PaymentLogo provider={p.provider} logoUrl={p.logoUrl} label={p.label} className="h-8" textClassName="text-base font-bold" />
            </div>
            <p className="mt-4">
              <span className="font-campana text-4xl leading-none text-rojo">{p.installments}</span>
              <span className="ml-1 text-base font-bold">{p.interestFree ? "cuotas sin interés" : "cuotas"}</span>
            </p>
            <p className="mt-2 text-xs italic text-gris-tinta">
              {p.minAmount > 0 ? `Compra mínima ${formatPrice(p.minAmount)}` : "Sin monto mínimo"}
            </p>
          </li>
        ))}
        <li className={`flex flex-col justify-between rounded-lg border border-azul/15 p-4 sm:p-5 ${promos.length % 2 === 0 ? "col-span-2 lg:col-span-1" : ""}`}>
          <div className="flex h-8 items-center">
            <span className="text-base font-bold">Pago Fácil y Rapipago</span>
          </div>
          <p className="mt-4">
            <span className="font-campana text-4xl leading-none text-rojo">$</span>
            <span className="ml-1 text-base font-bold">en efectivo</span>
          </p>
          <p className="mt-2 text-xs italic text-gris-tinta">Te damos el código al terminar la compra</p>
        </li>
      </ul>
    </section>
  );
}

/** "Desde 1977, parte de tu historia". */
export function StoryBlock({ instagram, address, city }: { instagram: string; address: string; city: string }) {
  return (
    <section aria-labelledby="historia" className="mx-auto max-w-tienda px-4 lg:px-6">
      <div className="grid items-center gap-8 md:grid-cols-2 md:gap-12">
        <Image
          src="/demo/local.svg"
          alt={`Local de Albertito Calzados en ${address}, ${city}`}
          width={800}
          height={600}
          className="h-auto w-full rounded-lg"
        />
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-rojo">Desde 1977</p>
          <h2 id="historia" className="mt-2 text-2xl font-bold uppercase sm:text-3xl">
            Parte de tu historia
          </h2>
          <div className="mt-4 space-y-3 leading-relaxed">
            <p>Generaciones de familias de Villa Mercedes eligieron acá su primer par de zapatitos.</p>
            <p>El calzado del cole, el del trabajo y el de salir. Seguimos igual: variedad, buenos precios y atención de barrio.</p>
            <p className="font-semibold">Pasá por {address}. Probalos, caminá y decidí.</p>
          </div>
          <a
            href={`https://instagram.com/${instagram}`}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-6 inline-flex h-12 items-center gap-2 rounded-md border-2 border-azul px-5 text-sm font-bold uppercase hover:bg-azul hover:text-blanco"
          >
            <InstagramIcon size={20} /> Seguinos en @{instagram}
          </a>
        </div>
      </div>
    </section>
  );
}
