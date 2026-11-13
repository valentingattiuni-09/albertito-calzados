import { NextResponse, type NextRequest } from "next/server";
import { getOrderByNumberUnsafe, recordPayment } from "@/lib/orders/orders";
import { cardProvider } from "@/lib/payments";

/**
 * Notificación de pago (Payway, o el mock en pruebas). El proveedor traduce y valida;
 * el estado se vuelve a consultar antes de registrarlo. Responde 200 para que no reintente.
 */
export async function POST(req: NextRequest) {
  const provider = cardProvider();
  const note = await provider.parseNotification(req).catch((e) => {
    console.error("[webhook pago]", e);
    return null;
  });
  if (!note?.orderNumber) return NextResponse.json({ received: false }, { status: 400 });

  const order = await getOrderByNumberUnsafe(note.orderNumber);
  if (!order) return NextResponse.json({ received: false }, { status: 404 });

  await recordPayment(
    order,
    provider.id,
    { status: note.status, providerPaymentId: note.providerPaymentId, raw: note.raw },
    {
      amount: order.total,
      installments: order.lastPayment?.installments ?? 1,
      interestFree: order.lastPayment?.interestFree ?? false,
      cardBrand: order.lastPayment?.cardBrand ?? "desconocida",
    },
  );
  return NextResponse.json({ received: true });
}
