import { createContext, useContext, useMemo, useState } from "react";
import { IntlProvider } from "use-intl";
import { detectarIdioma, type Idioma } from "@/i18n/idiomas";
import esGeneral from "@/mensajes/es.json";
import esPerfil from "@/mensajes/es/perfil.json";
import esProyectos from "@/mensajes/es/proyectos.json";
import esChats from "@/mensajes/es/chats.json";
import esCuenta from "@/mensajes/es/cuenta.json";
import enGeneral from "@/mensajes/en.json";
import enPerfil from "@/mensajes/en/perfil.json";
import enProyectos from "@/mensajes/en/proyectos.json";
import enChats from "@/mensajes/en/chats.json";
import enCuenta from "@/mensajes/en/cuenta.json";

/**
 * Los mismos textos que la web (`src/mensajes`, #354), con la misma API (`useTranslations`
 * de use-intl, que es el corazón de next-intl). Un texto nuevo va una sola vez, allá.
 */
const MENSAJES = {
  es: { ...esGeneral, ...esPerfil, ...esProyectos, ...esChats, ...esCuenta },
  en: { ...enGeneral, ...enPerfil, ...enProyectos, ...enChats, ...enCuenta },
};

const ContextoIdioma = createContext<{ idioma: Idioma; setIdioma: (i: Idioma) => void }>({
  idioma: "es",
  setIdioma: () => {},
});

/** El del teléfono al abrir; después, el que la cuenta eligió en Ajustes (`perfiles.idioma`). */
function idiomaDelTelefono(): Idioma {
  try {
    return detectarIdioma(Intl.DateTimeFormat().resolvedOptions().locale);
  } catch {
    return "es";
  }
}

export function ProveedorIdioma({ children }: { children: React.ReactNode }) {
  const [idioma, setIdioma] = useState<Idioma>(idiomaDelTelefono);
  const valor = useMemo(() => ({ idioma, setIdioma }), [idioma]);
  return (
    <ContextoIdioma.Provider value={valor}>
      <IntlProvider
        locale={idioma}
        messages={MENSAJES[idioma]}
        timeZone="America/Argentina/Buenos_Aires"
        // Un texto que falte no rompe la pantalla: se ve la clave.
        onError={() => {}}
      >
        {children}
      </IntlProvider>
    </ContextoIdioma.Provider>
  );
}

export const useIdioma = () => useContext(ContextoIdioma);
