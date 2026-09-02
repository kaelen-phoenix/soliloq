import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  // Oscuro por `prefers-color-scheme` (en `globals.css`), con override manual desde Ajustes
  // vía `data-tema` en `<html>`. Casi no hay clases `dark:` en el código: el tema cambia
  // por las variables semánticas, no por variantes.
  darkMode: ["selector", '[data-tema="dark"]'],
  theme: {
    extend: {
      colors: {
        // Colores semánticos: cambian con el tema (ver `globals.css`).
        superficie: "rgb(var(--superficie) / <alpha-value>)",
        "fondo-sutil": "rgb(var(--fondo-sutil) / <alpha-value>)",
        texto: "rgb(var(--texto) / <alpha-value>)",
        "texto-tenue": "rgb(var(--texto-tenue) / <alpha-value>)",
        borde: "rgb(var(--borde) / <alpha-value>)",
        accion: "rgb(var(--accion) / <alpha-value>)",
        "accion-texto": "rgb(var(--accion-texto) / <alpha-value>)",
        // Acento: se usa solo en acciones primarias y estados activos. Frambuesa cálida —
        // más rica y teatral que el magenta plano de antes, y bien distinta del rojo de
        // `error`.
        brand: {
          50: "#fdf1f4",
          100: "#fce0e8",
          200: "#f8c1d1",
          300: "#f191ac",
          400: "#e65a82",
          500: "#cf1f57",
          600: "#b01449",
          700: "#8f0f3c",
          900: "#500722",
        },
        // Acento por rol. No es un color nuevo suelto: `talento` es la rampa de `brand`
        // (el rosa que la app ya usaba por defecto) y `creador` es su complementario en
        // índigo, con el mismo peso visual. Solo tiñen encabezado, ítem de navegación
        // activo y anillo de foco —vía la variable `--acento` en `globals.css`— para
        // reforzar en qué modo estás. Nunca reemplazan a `brand` en las acciones
        // primarias ni conviven con las etiquetas de familia de oficio en la misma zona.
        talento: {
          50: "#fdf1f4",
          100: "#fce0e8",
          200: "#f8c1d1",
          300: "#f191ac",
          400: "#e65a82",
          500: "#cf1f57",
          600: "#b01449",
          700: "#8f0f3c",
          900: "#500722",
        },
        creador: {
          50: "#eef0fb",
          100: "#dde1f6",
          200: "#bcc3ee",
          300: "#8f9ce2",
          400: "#6070cf",
          500: "#3f4fb8",
          600: "#323f97",
          700: "#293378",
          900: "#181d45",
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
          // 200/100/50 son variables: en oscuro se oscurecen para que los chips y
          // skeletons (`bg-ink-100` y compañía) no queden brillando sobre fondo oscuro.
          200: "rgb(var(--ink-200) / <alpha-value>)",
          100: "rgb(var(--ink-100) / <alpha-value>)",
          50: "rgb(var(--ink-50) / <alpha-value>)",
        },
        // Estados. Estaban sueltos como `red-600` y `amber-800` de Tailwind: fuera del
        // sistema, el próximo rojo iba a ser otro y nadie lo iba a notar. Tres pasos por
        // color alcanzan — fondo, borde y texto — porque un estado no necesita una rampa.
        // Estados. `50` (fondo de la caja) y `800` (texto de la caja) son variables: en
        // oscuro dejan de ser casi blanco / casi negro y quedan legibles. `400`/`600`
        // leen bien en los dos temas, quedan fijos.
        error: {
          50: "rgb(var(--error-50) / <alpha-value>)",
          400: "#e88a8a",
          600: "#c62b2b",
          800: "rgb(var(--error-800) / <alpha-value>)",
        },
        alerta: {
          50: "rgb(var(--alerta-50) / <alpha-value>)",
          400: "#e0a44a",
          600: "#b45309",
          800: "rgb(var(--alerta-800) / <alpha-value>)",
        },
        exito: {
          50: "rgb(var(--exito-50) / <alpha-value>)",
          600: "#2f7d4f",
          800: "rgb(var(--exito-800) / <alpha-value>)",
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

        // Identidad escénica. NO son colores de estado ni de acción: viven en superficies
        // grandes y decorativas (portada, encabezados de marquesina, motivos de telón).
        // `telon` es el rojo cortina; `candileja` es el dorado de las luces de escena a ras
        // de piso. Se usan con generosidad ahí y nunca en un chip inline, para que no se
        // confundan con `error` (rojo) ni con `alerta` (ámbar).
        telon: {
          50: "#fdf2f3",
          100: "#fbe1e4",
          200: "#f5c2c9",
          300: "#ec97a4",
          400: "#df5f75",
          500: "#c8203a",
          600: "#a81930",
          700: "#851426",
          900: "#4a0b16",
        },
        candileja: {
          50: "#fdf8ec",
          100: "#fbefcf",
          200: "#f6dd97",
          300: "#f0c65a",
          400: "#eab12b",
          500: "#e0a11a",
          600: "#b87e12",
          700: "#8f6110",
          900: "#4d3407",
        },
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
