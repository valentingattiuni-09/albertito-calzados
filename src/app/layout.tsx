import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { noIndex, siteUrl as getSiteUrl } from "@/lib/site";

// Fuentes de marca alojadas en el proyecto (Google Fonts, licencia OFL): no dependen de fonts.googleapis.com
const poppins = localFont({
  variable: "--font-poppins",
  display: "swap",
  src: [
    { path: "../fonts/poppins-400.woff2", weight: "400", style: "normal" },
    { path: "../fonts/poppins-400-italic.woff2", weight: "400", style: "italic" },
    { path: "../fonts/poppins-500.woff2", weight: "500", style: "normal" },
    { path: "../fonts/poppins-600.woff2", weight: "600", style: "normal" },
    { path: "../fonts/poppins-700.woff2", weight: "700", style: "normal" },
  ],
});

// Solo para titulares de campañas y promos
const archivoBlack = localFont({
  variable: "--font-archivo-black",
  display: "swap",
  src: [{ path: "../fonts/archivo-black-400.woff2", weight: "400", style: "normal" }],
});

const siteUrl = getSiteUrl();

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Albertito Calzados · Pisá fuerte. Caminá feliz.",
    template: "%s · Albertito Calzados",
  },
  description:
    "Calzado para toda la familia desde 1977. Zapatillas, sandalias, botas y alpargatas con cuotas sin interés y envíos a todo el país.",
  ...(noIndex() ? { robots: { index: false, follow: false } } : {}),
  openGraph: {
    type: "website",
    locale: "es_AR",
    siteName: "Albertito Calzados",
  },
};

export const viewport: Viewport = {
  themeColor: "#E93136",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es-AR" className={`${poppins.variable} ${archivoBlack.variable} antialiased`}>
      <body className="flex min-h-dvh flex-col bg-blanco text-azul">{children}</body>
    </html>
  );
}
