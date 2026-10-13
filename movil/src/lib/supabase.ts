// `URL` completo (el de React Native no implementa `hostname`, `searchParams`, etc.): lo usan
// Supabase y la lógica compartida con la web (redes, videoreel). Va primero.
import "react-native-url-polyfill/auto";
// Guarda la sesión en el teléfono (SQLite) con la interfaz de `localStorage` que usa Supabase.
import "expo-sqlite/localStorage/install";
import { createClient } from "@supabase/supabase-js";
import Constants from "expo-constants";
import { AppState } from "react-native";
import type { Database } from "@/lib/supabase/types";
import { diag, rutaDe } from "./diagnostico";

function fetchConTope(entrada: RequestInfo | URL, opciones?: RequestInit): Promise<Response> {
  // Diagnóstico (#406): cada pedido, con su tiempo y su resultado.
  const ruta = rutaDe(entrada);
  const metodo = opciones?.method ?? "GET";
  const t0 = Date.now();
  diag("pedido", { metodo, ruta });
  const corte = new AbortController();
  const id = setTimeout(() => corte.abort(), 60_000);
  opciones?.signal?.addEventListener?.("abort", () => corte.abort());
  return fetch(entrada, { ...opciones, signal: corte.signal })
    .then((r) => {
      diag("respuesta", { metodo, ruta, estado: r.status, ms: Date.now() - t0 });
      return r;
    })
    .catch((e: unknown) => {
      diag("falla", { metodo, ruta, error: String(e).slice(0, 120), ms: Date.now() - t0 });
      throw e;
    })
    .finally(() => clearTimeout(id));
}

const extra = Constants.expoConfig?.extra as { supabaseUrl?: string; supabaseAnonKey?: string };
if (!extra?.supabaseUrl || !extra.supabaseAnonKey) {
  throw new Error("Faltan supabaseUrl / supabaseAnonKey en app.config.ts (EXPO_PUBLIC_SUPABASE_*)");
}

/** La misma base que la web: permisos (RLS), funciones y realtime son los mismos. */
export const supabase = createClient<Database>(extra.supabaseUrl, extra.supabaseAnonKey, {
  auth: {
    storage: localStorage,
    autoRefreshToken: true,
    persistSession: true,
    // En el teléfono no hay URL de dónde leer la sesión: Google vuelve con `?code=` (PKCE).
    detectSessionInUrl: false,
    flowType: "pkce",
  },
  // Ningún pedido queda colgado para siempre: con la red trabada, al minuto falla (alcanza para
  // subir una foto con mala señal) y la pantalla muestra lo que tenga en vez de quedarse cargando.
  global: { fetch: fetchConTope },
});

supabase.auth.onAuthStateChange((evento) => diag("sesion", { evento }));

// Diagnóstico (#406): ¿responde el cliente? Si `getSession` no vuelve en 5 s, está trabado.
const sondear = () => {
  const t0 = Date.now();
  let volvio = false;
  supabase.auth
    .getSession()
    .then(({ data }) => {
      volvio = true;
      diag("getSession", { ms: Date.now() - t0, conSesion: !!data.session });
    })
    .catch((e: unknown) => diag("getSession-error", { error: String(e).slice(0, 120) }));
  setTimeout(() => {
    if (!volvio) diag("getSession-colgado", { ms: 5_000 });
  }, 5_000);
};
for (let i = 1; i <= 24; i++) setTimeout(sondear, i * 10_000);

// El refresco de la sesión corre solo con la app en primer plano.
AppState.addEventListener("change", (estado) => {
  diag("appState", { estado });
  if (estado === "active") supabase.auth.startAutoRefresh();
  else supabase.auth.stopAutoRefresh();
});
