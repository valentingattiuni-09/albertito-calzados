import type { Config } from "tailwindcss";

/**
 * Tokens de marca Albertito (manual de identidad v1.0).
 * La página es roja y blanca con un toque de azul: 60% blanco · 30% rojo · 10% azul.
 * No se usan otros fondos. gris-tinta es solo para texto secundario.
 */
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        rojo: "#E93136",
        blanco: "#FFFFFF",
        azul: "#213681",
        "gris-tinta": "#5B6478",
        whatsapp: { DEFAULT: "#25D366", oscuro: "#1EBE5D" },
      },
      fontFamily: {
        sans: ["var(--font-poppins)", "system-ui", "sans-serif"],
        campana: ["var(--font-archivo-black)", "var(--font-poppins)", "sans-serif"],
      },
      maxWidth: {
        tienda: "80rem",
      },
      keyframes: {
        marquee: {
          from: { transform: "translateX(0)" },
          to: { transform: "translateX(-50%)" },
        },
        bump: {
          "0%, 100%": { transform: "scale(1)" },
          "40%": { transform: "scale(1.35)" },
        },
      },
      animation: {
        marquee: "marquee var(--marquee-duration, 30s) linear infinite",
        bump: "bump 400ms ease-out",
      },
    },
  },
};

export default config;
