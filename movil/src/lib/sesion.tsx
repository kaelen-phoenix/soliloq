import type { Session } from "@supabase/supabase-js";
import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { destinoSegunEstado, resolverEstadoCuenta, type Destino, type EstadoCuenta } from "@/lib/cuenta";
import { esIdioma } from "@/i18n/idiomas";
import { olvidarDispositivo } from "./push-token";
import { supabase } from "./supabase";
import { useIdioma } from "./intl";
import { useTema } from "~/ui/tema";

/** Como `destinoSegunEstado` de la web, más la cuenta suspendida (que allá resuelve el middleware). */
export type DestinoApp = Destino | "suspendido";

interface ContextoSesion {
  /** `undefined` mientras se lee la sesión guardada. */
  sesion: Session | null | undefined;
  estado: EstadoCuenta | null;
  destino: DestinoApp | null;
  /** Vuelve a leer el estado de la cuenta (después de un paso hecho en la web, por ejemplo). */
  recargar: () => Promise<void>;
  cerrarSesion: () => Promise<void>;
}

const Contexto = createContext<ContextoSesion>({
  sesion: undefined,
  estado: null,
  destino: null,
  recargar: async () => {},
  cerrarSesion: async () => {},
});

/** Lo mismo que `leerEstadoCuenta` (web, `cuenta-servidor.ts`), más el idioma elegido. */
async function leerEstado(userId: string) {
  const [{ data: perfil }, { count: talento }, { count: creador }] = await Promise.all([
    supabase
      .from("perfiles")
      .select("es_admin, suspendido_en, aprobado_en, normas_aceptadas_en, tour_talento_visto_en, idioma, tema")
      .eq("id", userId)
      .maybeSingle(),
    supabase.from("perfiles_talento").select("id", { count: "exact", head: true }).eq("id", userId),
    supabase.from("perfiles_creador").select("id", { count: "exact", head: true }).eq("id", userId),
  ]);
  return {
    estado: resolverEstadoCuenta(perfil, (talento ?? 0) > 0, (creador ?? 0) > 0),
    idioma: perfil?.idioma,
    tema: perfil?.tema,
  };
}

export function ProveedorSesion({ children }: { children: React.ReactNode }) {
  const [sesion, setSesion] = useState<Session | null | undefined>(undefined);
  const [estado, setEstado] = useState<EstadoCuenta | null>(null);
  const { setIdioma } = useIdioma();
  const { setTema } = useTema();

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSesion(data.session));
    const { data } = supabase.auth.onAuthStateChange((_evento, nueva) => setSesion(nueva));
    return () => data.subscription.unsubscribe();
  }, []);

  const userId = sesion?.user.id;
  const recargar = useCallback(async () => {
    if (!userId) {
      setEstado(null);
      return;
    }
    const leido = await leerEstado(userId);
    setEstado(leido.estado);
    if (esIdioma(leido.idioma)) setIdioma(leido.idioma);
    if (leido.tema === "sistema" || leido.tema === "claro" || leido.tema === "oscuro") setTema(leido.tema);
  }, [userId, setIdioma, setTema]);

  useEffect(() => {
    setEstado(null);
    recargar();
  }, [recargar]);

  const cerrarSesion = useCallback(async () => {
    // Este teléfono deja de recibir las push de la cuenta (#389).
    await olvidarDispositivo().catch(() => {});
    await supabase.auth.signOut();
  }, []);

  const destino: DestinoApp | null = !estado
    ? null
    : estado.suspendido
      ? "suspendido"
      : destinoSegunEstado(estado);

  return (
    <Contexto.Provider value={{ sesion, estado, destino, recargar, cerrarSesion }}>
      {children}
    </Contexto.Provider>
  );
}

export const useSesion = () => useContext(Contexto);
