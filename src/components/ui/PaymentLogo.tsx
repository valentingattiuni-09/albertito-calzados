import Image from "next/image";
import { paymentLogo } from "@/lib/payment-logos";

/**
 * Logo de un medio de pago. Si no hay logo (ej. Tarjeta Verde, Go Cuotas) muestra el nombre.
 * La altura se controla con `className` (ej. "h-5"); el ancho se ajusta solo.
 */
export function PaymentLogo({
  provider,
  logoUrl,
  label,
  className = "h-5",
  textClassName = "font-semibold",
  compact = false,
}: {
  provider: string;
  logoUrl?: string | null;
  label: string;
  className?: string;
  textClassName?: string;
  /** Logo chico (ej. en la barra o en las tarjetas de producto). */
  compact?: boolean;
}) {
  const logo = paymentLogo(provider, logoUrl, compact);
  if (!logo) return <span className={textClassName}>{label}</span>;
  return <Image src={logo.src} alt={label} width={logo.width} height={logo.height} className={`w-auto object-contain ${className}`} />;
}
