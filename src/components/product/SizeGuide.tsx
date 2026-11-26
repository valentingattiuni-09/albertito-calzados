"use client";

import { RulerIcon } from "@/components/ui/icons";
import { Modal } from "@/components/ui/Modal";

// Equivalencias orientativas (talle argentino → largo del pie en cm)
const ADULTOS: [string, string][] = [
  ["35", "22,5"], ["36", "23"], ["37", "23,8"], ["38", "24,5"], ["39", "25,2"], ["40", "26"],
  ["41", "26,7"], ["42", "27,3"], ["43", "28"], ["44", "28,7"], ["45", "29,4"], ["46", "30,1"],
];
const NINOS: [string, string][] = [
  ["16", "10"], ["17", "10,7"], ["18", "11,3"], ["19", "12"], ["20", "12,6"], ["21", "13,3"], ["22", "14"], ["23", "14,6"], ["24", "15,2"], ["25", "15,9"], ["26", "16,5"], ["27", "17"], ["28", "17,8"], ["29", "18,5"], ["30", "19"], ["31", "19,8"], ["32", "20,5"], ["33", "21"], ["34", "21,7"],
];

function Table({ rows, caption }: { rows: [string, string][]; caption: string }) {
  return (
    <table className="w-full text-sm">
      <caption className="mb-2 text-left text-xs font-bold uppercase tracking-[0.15em] text-gris-tinta">{caption}</caption>
      <thead>
        <tr className="border-b border-azul/15 text-left">
          <th className="py-2 font-semibold">Talle</th>
          <th className="py-2 font-semibold">Largo del pie</th>
        </tr>
      </thead>
      <tbody>
        {rows.map(([t, cm]) => (
          <tr key={t} className="border-b border-azul/10">
            <td className="py-1.5">{t}</td>
            <td className="py-1.5">{cm} cm</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function SizeGuide({ kids }: { kids: boolean }) {
  return (
    <Modal
      title="Guía de talles"
      triggerClassName="inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold underline underline-offset-4"
      trigger={
        <>
          <RulerIcon size={18} /> Guía de talles
        </>
      }
    >
      <p className="mb-4 text-sm">
        Pisá una hoja con el talón contra la pared y marcá la punta del dedo más largo. Medí en cm y buscá tu talle.
        Si estás entre dos, elegí el más grande.
      </p>
      <Table rows={kids ? NINOS : ADULTOS} caption={kids ? "Niños" : "Adultos"} />
      <p className="mt-4 text-xs italic text-gris-tinta">Medidas orientativas. Puede variar según el modelo.</p>
    </Modal>
  );
}
