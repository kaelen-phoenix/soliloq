/**
 * La foto de la cuenta de Google, si entró con Google: solo de los servidores de Google. Lo usan
 * el servidor (`foto-google-servidor.ts`), la web y la app nativa (para ofrecer «Usar mi foto de
 * Google» en el alta, #303).
 */
export function fotoDeGoogle(metadata: Record<string, unknown> | undefined): string | null {
  const valor = metadata?.avatar_url ?? metadata?.picture;
  if (typeof valor !== "string") return null;
  try {
    const url = new URL(valor);
    if (url.protocol !== "https:" || !url.hostname.endsWith(".googleusercontent.com")) return null;
    // Google la sirve chiquita (`=s96-c`): se pide en un tamaño que sirva para el portfolio.
    return url.toString().replace(/=s\d+(-c)?$/, "=s1000");
  } catch {
    return null;
  }
}

/** #303: con Google ya sabemos el nombre: se precarga en el alta. */
export function nombreDeGoogle(metadata: Record<string, unknown> | undefined): string | undefined {
  return [metadata?.full_name, metadata?.name]
    .find((v): v is string => typeof v === "string" && v.trim().length > 1)
    ?.trim();
}
