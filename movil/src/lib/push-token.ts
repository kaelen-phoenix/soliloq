import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { supabase } from "./supabase";

/**
 * El token de push de este teléfono (#389). Aparte de `push.tsx` para que la sesión pueda
 * olvidarlo al salir sin importar el proveedor (y sin un import circular).
 */
// El token de este teléfono: al cerrar sesión se borra para que no le lleguen avisos de esa cuenta.
let tokenActual: string | null = null;

export async function registrar() {
  try {
    const { data } = await Notifications.getDevicePushTokenAsync();
    if (typeof data !== "string") return;
    tokenActual = data;
    await supabase.rpc("registrar_dispositivo_push", { p_token: data, p_plataforma: Platform.OS });
  } catch {
    // Sin Google Play Services, sin red, etc.: la app sigue igual, sin push.
  }
}

/** Antes de cerrar sesión: este teléfono deja de recibir los avisos de la cuenta. */
export async function olvidarDispositivo() {
  if (!tokenActual) return;
  await supabase.from("dispositivos_push").delete().eq("token", tokenActual);
  tokenActual = null;
}

