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
        // Estados. Estaban sueltos como `red-600` y `amber-800` de Tailwind: fuera del
        // sistema, el próximo rojo iba a ser otro y nadie lo iba a notar. Tres pasos por
        // color alcanzan — fondo, borde y texto — porque un estado no necesita una rampa.
        error: {
          50: "#fdf2f2",
          400: "#e88a8a",
          600: "#c62b2b",
          800: "#8f1d1d",
        },
        alerta: {
          50: "#fdf7ec",
          400: "#e0a44a",
          600: "#b45309",
          800: "#7c3d07",
        },
        exito: {
          50: "#f0f7f2",
          600: "#2f7d4f",
          800: "#1f5636",
        },
        // Familias de oficio. Son cuatro y no diecisiete a propósito: ninguna paleta
        // categórica distingue diecisiete tonos, y arriba de ocho la gente ya no los
        // diferencia — menos todavía con daltonismo.
        //
        // Los cuatro pasaron el validador comparando **todos** los pares, no solo los
        // contiguos, porque en la app aparecen mezclados en cualquier orden. Un violeta y
        // un índigo que probamos antes daban ΔE 0.7 en visión protán: el mismo color.
        //
        // La separación en visión tritán queda en 6.0, dentro de la banda que exige
        // codificación secundaria. Está cubierta: la etiqueta siempre muestra el nombre del
        // oficio, así que el color acompaña pero nunca es el único dato.
        escena: { 50: "#fdf3ee", 600: "#c2410c" },
        direccion: { 50: "#f1f2fd", 600: "#4338ca" },
        diseno: { 50: "#f5f8ec", 600: "#65a30d" },
        tecnica: { 50: "#ecf7fa", 600: "#0891b2" },
      },
      // Escala tipográfica. Antes había 17 tamaños sueltos y ocho se usaban una sola vez:
      // cada pantalla elegía su número. Ocho escalones cubren todo, y el más chico es 11px
      // — abajo de eso no se lee en un teléfono, así que el 9px y el 10px que existían no
      // tienen reemplazo hacia abajo a propósito.
      //
      // Cada paso trae su interlineado: es la mitad del trabajo de una escala y es lo que
      // evita que un título quede apretado y un párrafo suelto.
      fontSize: {
        "2xs": ["0.6875rem", { lineHeight: "1rem" }], // 11 · metadatos, fechas, distintivos
        xs: ["0.75rem", { lineHeight: "1.05rem" }], // 12 · notas al pie, ayudas
        sm: ["0.8125rem", { lineHeight: "1.25rem" }], // 13 · texto secundario (el más usado)
        base: ["0.9375rem", { lineHeight: "1.45rem" }], // 15 · cuerpo
        lg: ["1.0625rem", { lineHeight: "1.5rem" }], // 17 · subtítulos
        xl: ["1.3125rem", { lineHeight: "1.6rem" }], // 21 · título de pantalla
        "2xl": ["1.75rem", { lineHeight: "1.9rem" }], // 28 · título de portada y de tarjeta
        "3xl": ["2.5rem", { lineHeight: "2.55rem" }], // 40 · logotipo grande
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        // Reservada para la marca y los títulos de portada. Si aparece en un botón o
        // en un label, está mal usada: la interfaz es toda `sans`.
        display: ["var(--font-display)", "Georgia", "serif"],
      },
      // `rounded-card` y `shadow-sutil` vivieron acá sin que nadie los usara nunca: uno
      // duplicaba `rounded-2xl` (los dos son 1rem) y el otro no llegó a aplicarse. Un token
      // que nadie usa no documenta el sistema, lo ensucia.
      boxShadow: {
        // Sombra contenida y única: la jerarquía la dan el borde y el espacio.
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
