// Guarda la sesión en el teléfono (SQLite) con la interfaz de `localStorage` que usa Supabase.
import "expo-sqlite/localStorage/install";
import { createClient } from "@supabase/supabase-js";
import Constants from "expo-constants";
import { AppState } from "react-native";
import type { Database } from "@/lib/supabase/types";

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
});

// El refresco de la sesión corre solo con la app en primer plano.
AppState.addEventListener("change", (estado) => {
  if (estado === "active") supabase.auth.startAutoRefresh();
  else supabase.auth.stopAutoRefresh();
});
