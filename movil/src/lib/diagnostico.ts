import Constants from "expo-constants";
import { Platform } from "react-native";

/**
 * Diagnóstico de la app (#406): anota qué pasa adentro del teléfono (cada pedido a Supabase:
 * cuándo sale, cuándo vuelve y cuánto tarda; los eventos de sesión) y lo manda a la web
 * (`/api/app/diagnostico`), que lo deja en los logs del servidor. Sirve para ver dónde se traba
 * algo que en el navegador anda.
 *
 * Nada personal: solo rutas sin parámetros, códigos y tiempos. Va con `fetch` directo y sin
 * sesión, para que funcione aunque el cliente de Supabase esté trabado.
 */
const URL_DIAG = "https://yalope.com/api/app/diagnostico";
const ID = Math.random().toString(36).slice(2, 10);
const INICIO = Date.now();
const VERSION = `${Constants.expoConfig?.version ?? "?"} · ${Platform.OS}`;

let cola: { t: number; e: string; d?: Record<string, unknown> }[] = [];
let enviando = false;

export function diag(evento: string, datos?: Record<string, unknown>) {
  cola.push({ t: Date.now() - INICIO, e: evento, d: datos });
  if (cola.length > 200) cola = cola.slice(-200);
}

async function enviar() {
  if (enviando || cola.length === 0) return;
  enviando = true;
  const lote = cola;
  cola = [];
  try {
    await fetch(URL_DIAG, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: ID, version: VERSION, eventos: lote }),
    });
  } catch {
    // Sin red: se pierde este lote, no importa.
  } finally {
    enviando = false;
  }
}

// Cada 5 s, durante los primeros 10 minutos de cada apertura de la app.
const intervalo = setInterval(() => {
  if (Date.now() - INICIO > 10 * 60_000) clearInterval(intervalo);
  void enviar();
}, 5_000);

/** La ruta de un pedido, sin dominio ni parámetros (que pueden traer ids). */
export function rutaDe(entrada: RequestInfo | URL): string {
  const texto = typeof entrada === "string" ? entrada : entrada instanceof URL ? entrada.href : entrada.url;
  return texto.replace(/^https?:\/\/[^/]+/, "").replace(/\?.*$/, "");
}

// Errores de JavaScript que hoy pasan en silencio: los que cortan la app y las promesas que
// fallan sin que nadie las espere (por ejemplo, una carga de pantalla que tira).
type ConManejador = { ErrorUtils?: { getGlobalHandler(): (e: unknown, fatal?: boolean) => void; setGlobalHandler(f: (e: unknown, fatal?: boolean) => void): void } };
const errores = (globalThis as ConManejador).ErrorUtils;
if (errores) {
  const previo = errores.getGlobalHandler();
  errores.setGlobalHandler((e, fatal) => {
    diag("error-js", { mensaje: String((e as Error)?.message ?? e).slice(0, 200), fatal: !!fatal });
    void enviar();
    previo(e, fatal);
  });
}
type ConHermes = { HermesInternal?: { enablePromiseRejectionTracker?(o: { allRejections: boolean; onUnhandled(id: number, e: unknown): void }): void } };
(globalThis as ConHermes).HermesInternal?.enablePromiseRejectionTracker?.({
  allRejections: true,
  onUnhandled: (_id, e) => diag("promesa-sin-manejar", { mensaje: String((e as Error)?.message ?? e).slice(0, 200) }),
});
