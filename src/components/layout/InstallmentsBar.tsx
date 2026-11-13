import Link from "next/link";
import { promoShortLabel } from "@/lib/format";
import type { PaymentPromo, TopbarMessage } from "@/lib/data/types";

type Item = { key: string; text: string; link: string | null };

/**
 * Barra superior azul con las cuotas S/I activas (estilo marquesina).
 * Se pausa al pasar el mouse o al enfocar; con "reducir movimiento" queda quieta y se puede deslizar.
 */
export function InstallmentsBar({ promos, messages }: { promos: PaymentPromo[]; messages: TopbarMessage[] }) {
  const items: Item[] = [
    ...promos.filter((p) => p.showInTopbar).map((p) => ({ key: p.id, text: promoShortLabel(p), link: null })),
    ...messages.map((m) => ({ key: m.id, text: m.text, link: m.link })),
  ];
  if (items.length === 0) return null;

  // Repetimos la lista para que la marquesina sea continua aun en pantallas anchas.
  const group = [...items, ...items];
  const duration = `${Math.max(20, items.length * 7)}s`;

  const renderGroup = (hidden: boolean) => (
    <ul className="flex shrink-0 items-center" aria-hidden={hidden || undefined}>
      {group.map((item, i) => (
        <li key={`${item.key}-${i}`} className="flex items-center whitespace-nowrap">
          {item.link && !hidden ? (
            <Link href={item.link} className="px-1 underline-offset-2 hover:underline">
              {item.text}
            </Link>
          ) : (
            <span className="px-1">{item.text}</span>
          )}
          <span aria-hidden className="px-4 opacity-60">
            ·
          </span>
        </li>
      ))}
    </ul>
  );

  return (
    <div className="on-dark bg-azul text-blanco" role="region" aria-label="Cuotas sin interés y envíos">
      <div className="group no-scrollbar overflow-hidden motion-reduce:overflow-x-auto">
        <div
          className="flex w-max animate-marquee py-1.5 text-xs font-medium tracking-wide group-hover:[animation-play-state:paused] group-focus-within:[animation-play-state:paused] motion-reduce:animate-none sm:text-[13px]"
          style={{ ["--marquee-duration" as string]: duration }}
        >
          {renderGroup(false)}
          {renderGroup(true)}
        </div>
      </div>
    </div>
  );
}
