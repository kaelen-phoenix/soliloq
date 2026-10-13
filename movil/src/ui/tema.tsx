import { createContext, useContext, useMemo, useState } from "react";
import { useColorScheme } from "react-native";

/**
 * Los colores de la web (`src/app/globals.css`, #225): mismos valores, en oscuro y en claro.
 * Si cambian allá, cambian acá. Como en la web, sin elección guardada la app es oscura (#217);
 * «Sistema» sigue al teléfono.
 */
const OSCURO = {
  superficie: "rgb(12,10,11)",
  fondoSutil: "rgb(26,21,23)",
  texto: "rgb(247,244,243)",
  textoTenue: "rgb(170,160,160)",
  borde: "rgb(56,46,48)",
  ink100: "rgb(38,32,34)",
  error: "rgb(224,90,90)",
  exito: "rgb(150,214,170)",
  // Acento: el naranja del isotipo (`brand-400`) en oscuro.
  acento: "#f2571e",
};

const CLARO: typeof OSCURO = {
  superficie: "rgb(255,255,255)",
  fondoSutil: "rgb(247,246,248)",
  texto: "rgb(24,22,26)",
  textoTenue: "rgb(92,87,96)",
  borde: "rgb(224,221,226)",
  ink100: "rgb(238,236,240)",
  error: "rgb(198,43,43)",
  exito: "rgb(31,86,54)",
  acento: "#e62d03",
};

/** Lo que no cambia con el tema: la acción primaria (`.bg-accion`) y la marca. */
const FIJOS = {
  accion: "#d4430f",
  accionFin: "#b3260a",
  accionTexto: "#ffffff",
  marca: "#f2571e",
};

export type Colores = typeof OSCURO & typeof FIJOS;
export type Tema = "sistema" | "claro" | "oscuro";

const Contexto = createContext<{ colores: Colores; oscuro: boolean; tema: Tema; setTema: (t: Tema) => void }>({
  colores: { ...OSCURO, ...FIJOS },
  oscuro: true,
  tema: "oscuro",
  setTema: () => {},
});

export function ProveedorTema({ children }: { children: React.ReactNode }) {
  const [tema, setTema] = useState<Tema>("oscuro");
  const delTelefono = useColorScheme();
  const oscuro = tema === "oscuro" || (tema === "sistema" && delTelefono !== "light");
  const valor = useMemo(
    () => ({ colores: { ...(oscuro ? OSCURO : CLARO), ...FIJOS }, oscuro, tema, setTema }),
    [oscuro, tema],
  );
  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

export const useTema = () => useContext(Contexto);
/** Los colores del tema que quedó. */
export const useColores = () => useContext(Contexto).colores;

export const fuente = {
  normal: "Inter_400Regular",
  media: "Inter_500Medium",
  semi: "Inter_600SemiBold",
  negrita: "Inter_700Bold",
} as const;

export const espacio = { xs: 4, s: 8, m: 12, l: 16, xl: 24, xxl: 32 } as const;
export const radio = { campo: 12, tarjeta: 16, pildora: 999 } as const;
