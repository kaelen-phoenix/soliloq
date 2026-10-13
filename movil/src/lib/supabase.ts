// `URL` completo (el de React Native no implementa `hostname`, `searchParams`, etc.): lo usan
// Supabase y la lógica compartida con la web (redes, videoreel). Va primero.
import "react-native-url-polyfill/auto";
// Guarda la sesión en el teléfono (SQLite) con la interfaz de `localStorage` que usa Supabase.
import "expo-sqlite/localStorage/install";
import { createClient } from "@supabase/supabase-js";
import Constants from "expo-constants";
import { AppState } from "react-native";
import type { Database } from "@/lib/supabase/types";

function fetchConTope(entrada: RequestInfo | URL, opciones?: RequestInit): Promise<Response> {
  if (opciones?.signal) return fetch(entrada, opciones);
  const corte = new AbortController();
  const id = setTimeout(() => corte.abort(), 60_000);
  return fetch(entrada, { ...opciones, signal: corte.signal }).finally(() => clearTimeout(id));
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

// El refresco de la sesión corre solo con la app en primer plano.
AppState.addEventListener("change", (estado) => {
  if (estado === "active") supabase.auth.startAutoRefresh();
  else supabase.auth.stopAutoRefresh();
});
