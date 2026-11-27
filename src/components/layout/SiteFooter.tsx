import { PaymentLogo } from "@/components/ui/PaymentLogo";
import { paymentLogo } from "@/lib/payment-logos";
import { isBackoffice } from "@/lib/backoffice/source";
import Image from "next/image";
import Link from "next/link";
import { ClockIcon, InstagramIcon, PinIcon, WhatsAppIcon } from "@/components/ui/icons";
import { getPaymentPromos, getSettings } from "@/lib/data/layout";
import { whatsappLink } from "@/lib/format";
import { FooterNewsletter } from "./FooterNewsletter";

const AYUDA = [
  ["Cómo comprar", "/ayuda/como-comprar"],
  ["Envíos", "/ayuda/envios"],
  ["Cambios y devoluciones", "/ayuda/cambios-y-devoluciones"],
  ["Guía de talles", "/ayuda/guia-de-talles"],
  ["Preguntas frecuentes", "/ayuda/preguntas-frecuentes"],
] as const;

const LEGALES = [
  ["Términos y condiciones", "/legales/terminos-y-condiciones"],
  ["Políticas de privacidad", "/legales/privacidad"],
] as const;

const SHIPPING = ["Andreani", "Correo Argentino"];

function Heading({ children }: { children: React.ReactNode }) {
  return <h2 className="mb-4 text-sm font-bold uppercase tracking-[0.15em]">{children}</h2>;
}

function FooterLink({ href, children, external }: { href: string; children: React.ReactNode; external?: boolean }) {
  const cls = "inline-flex min-h-11 items-center text-sm hover:underline underline-offset-4 lg:min-h-9";
  return external ? (
    <a href={href} target="_blank" rel="noopener noreferrer" className={cls}>
      {children}
    </a>
  ) : (
    <Link href={href} className={cls}>
      {children}
    </Link>
  );
}

/** Logo de medio de pago / envío. Hasta tener los archivos oficiales se muestra el nombre. */
function Mark({ label }: { label: string }) {
  return (
    <li className="flex h-9 items-center rounded-md border border-blanco/40 px-3 text-xs font-semibold tracking-wide">
      {label}
    </li>
  );
}

export async function SiteFooter() {
  const [settings, promos] = await Promise.all([getSettings(), getPaymentPromos()]);
  const { store, whatsapp } = settings;

  return (
    <footer className="on-dark mt-16 bg-azul text-blanco">
      <div className="mx-auto max-w-tienda px-4 pb-8 pt-12 lg:px-6">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-[1.2fr_1fr_1.1fr_1.1fr_1.5fr]">
          {/* Marca */}
          <div>
            <Link href="/" aria-label="Albertito Calzados, ir al inicio" className="inline-block p-2">
              <Image
                src="/brand/logo-contorno-blanco.png"
                alt="Albertito Calzados"
                width={488}
                height={231}
                className="h-auto w-[150px]"
              />
            </Link>
            <p className="mt-3 text-lg font-bold">Pisá fuerte. Caminá feliz.</p>
            <div className="mt-4 flex gap-2">
              <a
                href={`https://instagram.com/${store.instagram}`}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`Instagram @${store.instagram}`}
                className="flex size-11 items-center justify-center rounded-full border border-blanco/40 hover:bg-white/10"
              >
                <InstagramIcon size={20} />
              </a>
              <a
                href={whatsappLink(whatsapp.number, "¡Hola! Tengo una consulta.")}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`WhatsApp ${whatsapp.display}`}
                className="flex size-11 items-center justify-center rounded-full bg-whatsapp text-blanco hover:bg-whatsapp-oscuro"
              >
                <WhatsAppIcon size={20} />
              </a>
            </div>
          </div>

          <nav aria-labelledby="footer-ayuda">
            <Heading>
              <span id="footer-ayuda">Ayuda</span>
            </Heading>
            <ul>
              {AYUDA.map(([label, href]) => (
                <li key={href}>
                  <FooterLink href={href}>{label}</FooterLink>
                </li>
              ))}
            </ul>
          </nav>

          <div>
            <Heading>Albertito</Heading>
            <ul className="space-y-2 text-sm">
              <li>
                <FooterLink href="/nosotros">Nosotros</FooterLink>
              </li>
              <li className="flex gap-2">
                <PinIcon size={18} className="mt-0.5 shrink-0" />
                <span>
                  {store.address}, {store.city}, {store.province}
                </span>
              </li>
              <li className="flex gap-2">
                <ClockIcon size={18} className="mt-0.5 shrink-0" />
                <span>{store.hoursDetail}</span>
              </li>
              <li>
                <FooterLink href="/contacto">Contacto</FooterLink>
              </li>
            </ul>
          </div>

          <nav aria-labelledby="footer-legales">
            <Heading>
              <span id="footer-legales">Legales</span>
            </Heading>
            <ul>
              {LEGALES.map(([label, href]) => (
                <li key={href}>
                  <FooterLink href={href}>{label}</FooterLink>
                </li>
              ))}
              <li>
                <FooterLink href="https://www.argentina.gob.ar/produccion/defensadelconsumidor" external>
                  Defensa del consumidor
                </FooterLink>
              </li>
              <li className="mt-3">
                {/* Resolución 424/2020: acceso visible y directo */}
                <Link
                  href="/arrepentimiento"
                  className="inline-flex min-h-11 items-center rounded-md border-2 border-blanco px-4 text-sm font-bold uppercase tracking-wide hover:bg-blanco hover:text-azul"
                >
                  Botón de arrepentimiento
                </Link>
              </li>
            </ul>
          </nav>

          <div>
            <Heading>Enterate antes que nadie</Heading>
            <p className="mb-4 text-sm">Recibí ofertas y lanzamientos en tu mail.</p>
            <FooterNewsletter />
          </div>
        </div>

        <div className="mt-12 grid gap-8 border-t border-blanco/20 pt-8 md:grid-cols-2">
          <div>
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.15em]">Medios de pago</p>
            <ul className="flex flex-wrap gap-2" aria-label="Medios de pago">
              {promos.map((p) =>
                paymentLogo(p.provider, p.logoUrl) ? (
                  // Logo sobre fondo blanco para que se lea sobre el azul
                  <li key={p.id} className="flex h-9 items-center rounded-md bg-blanco px-3">
                    <PaymentLogo provider={p.provider} logoUrl={p.logoUrl} label={p.label} className="h-5" />
                  </li>
                ) : (
                  <Mark key={p.id} label={p.label} />
                ),
              )}
              <Mark label="Débito" />
              {/* Con el back office no hay efectivo: tarjeta (Payway) y Mercado Pago */}
              {isBackoffice() ? (
                <Mark label="Mercado Pago" />
              ) : (
                <>
                  <Mark label="Pago Fácil" />
                  <Mark label="Rapipago" />
                </>
              )}
            </ul>
          </div>
          <div>
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.15em]">Envíos</p>
            <ul className="flex flex-wrap gap-2" aria-label="Empresas de envío">
              {SHIPPING.map((s) => (
                <Mark key={s} label={s} />
              ))}
              <Mark label="Retiro gratis en el local" />
            </ul>
          </div>
        </div>

        <p className="mt-10 text-xs italic">
          © Albertito Calzados · Desde 1977, parte de tu historia. Precios en pesos argentinos con IVA incluido.
        </p>
      </div>
    </footer>
  );
}
