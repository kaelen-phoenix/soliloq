/**
 * Los colores de la web en oscuro (`src/app/globals.css`, #225): mismos valores, para que la
 * app y la web se vean iguales. Si cambian allá, cambian acá.
 */
export const color = {
  superficie: "rgb(12,10,11)",
  fondoSutil: "rgb(26,21,23)",
  texto: "rgb(247,244,243)",
  textoTenue: "rgb(170,160,160)",
  borde: "rgb(56,46,48)",
  ink100: "rgb(38,32,34)",
  error: "rgb(224,90,90)",
  exito: "rgb(150,214,170)",
  // La acción primaria es el degradé `.bg-accion` (#d4430f → #b3260a).
  accion: "#d4430f",
  accionFin: "#b3260a",
  accionTexto: "#ffffff",
  marca: "#f2571e",
} as const;

export const fuente = {
  normal: "Inter_400Regular",
  media: "Inter_500Medium",
  semi: "Inter_600SemiBold",
  negrita: "Inter_700Bold",
} as const;

export const espacio = { xs: 4, s: 8, m: 12, l: 16, xl: 24, xxl: 32 } as const;
export const radio = { campo: 12, tarjeta: 16, pildora: 999 } as const;
