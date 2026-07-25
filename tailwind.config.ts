import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        // Acento: se usa solo en acciones primarias y estados activos.
        brand: {
          50: "#fdf2f7",
          100: "#fce7f0",
          200: "#fbcfe1",
          300: "#f9a8c9",
          400: "#f472a6",
          500: "#d81b7a",
          600: "#be1367",
          700: "#9d1054",
          900: "#5c0a31",
        },
        // Escala neutra con un matiz cálido apenas perceptible: evita el gris
        // clínico sin introducir un segundo color.
        ink: {
          950: "#0b0a0c",
          900: "#18161a",
          800: "#2a272d",
          700: "#3f3b43",
          600: "#5c565f",
          500: "#7a747e",
          400: "#9d97a0",
          300: "#c0bbc4",
          200: "#e0dde2",
          100: "#eeecf0",
          50: "#f7f6f8",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
      borderRadius: {
        card: "1rem",
      },
      boxShadow: {
        // Sombras muy contenidas: la jerarquía la dan el borde y el espacio.
        sutil: "0 1px 2px 0 rgb(11 10 12 / 0.04)",
        tarjeta: "0 4px 24px -8px rgb(11 10 12 / 0.12)",
      },
      letterSpacing: {
        ajustado: "-0.011em",
      },
    },
  },
  plugins: [],
};

export default config;
