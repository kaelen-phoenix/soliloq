import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import { supabase } from "./supabase";

/**
 * El token de push de este teléfono (#389). Aparte de `push.tsx` para que la sesión pueda
 * olvidarlo al salir sin importar el proveedor (y sin un import circular).
 */
// El token de este teléfono: al cerrar sesión se borra para que no le lleguen avisos de esa cuenta.
let tokenActual: string | null = null;

/**
 * Registra el token en la base, una sola vez por token. Ojo (#406): en Android,
 * `getDevicePushTokenAsync` también dispara el aviso de «token nuevo» (`addPushTokenListener`):
 * si ese aviso volvía a pedir el token, se armaba un bucle de cientos de pedidos por segundo que
 * saturaba la conexión y dejaba todas las pantallas cargando. Por eso el aviso usa el token que
 * trae (`registrarToken`) y un token ya registrado no se vuelve a mandar.
 */
let registrado: string | null = null;

export async function registrarToken(token: unknown) {
  if (typeof token !== "string" || token === registrado) return;
  registrado = token;
  tokenActual = token;
  const { error } = await supabase.rpc("registrar_dispositivo_push", { p_token: token, p_plataforma: Platform.OS });
  // Si falló, se puede reintentar la próxima vez.
  if (error) registrado = null;
}

/** Pide el token de este teléfono y lo registra. */
export async function registrar() {
  try {
    const { data } = await Notifications.getDevicePushTokenAsync();
    await registrarToken(data);
  } catch {
    // Sin Google Play Services, sin red, etc.: la app sigue igual, sin push.
  }
}

/** Antes de cerrar sesión: este teléfono deja de recibir los avisos de la cuenta. */
export async function olvidarDispositivo() {
  if (!tokenActual) return;
  await supabase.from("dispositivos_push").delete().eq("token", tokenActual);
  tokenActual = null;
  // Al volver a ingresar (esta u otra cuenta) se registra de nuevo.
  registrado = null;
}

