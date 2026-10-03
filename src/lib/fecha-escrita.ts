/**
 * Fecha que se escribe «dd/mm/aaaa» (#307), en vez del selector del navegador: en celulares
 * viejos ese selector obliga a ir año por año hacia atrás. En la base se guarda ISO.
 */

/** `1995-05-07` → `07/05/1995`. Lo que no sea ISO vuelve vacío. */
export function isoATexto(iso: string | null | undefined): string {
  const m = iso?.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : "";
}

/** `07/05/1995` → `1995-05-07`, o `null` si no es una fecha que exista. */
export function textoAIso(texto: string): string | null {
  const m = texto.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!m) return null;
  const [dia, mes, anio] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const fecha = new Date(Date.UTC(anio, mes - 1, dia));
  if (fecha.getUTCFullYear() !== anio || fecha.getUTCMonth() !== mes - 1 || fecha.getUTCDate() !== dia) {
    return null;
  }
  return `${anio}-${String(mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
}

/** Mientras se escribe: solo dígitos, y las barras se ponen solas (`07051995` → `07/05/1995`). */
export function formatearMientrasSeEscribe(valor: string): string {
  const d = valor.replace(/\D/g, "").slice(0, 8);
  if (d.length <= 2) return d;
  if (d.length <= 4) return `${d.slice(0, 2)}/${d.slice(2)}`;
  return `${d.slice(0, 2)}/${d.slice(2, 4)}/${d.slice(4)}`;
}
