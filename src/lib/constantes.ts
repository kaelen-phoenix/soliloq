// Lista cerrada de locaciones (AMBA) para que el filtro del feed compare texto exacto
// en vez de variantes libres como "CABA" / "Capital" / "Buenos Aires" (ver design.md,
// Open Questions).
export const LOCACIONES = [
  "CABA",
  "Zona Norte (GBA)",
  "Zona Oeste (GBA)",
  "Zona Sur (GBA)",
  "La Plata",
] as const;

export const HABILIDADES = [
  "Canto",
  "Danza",
  "Acrobacia",
  "Instrumentos musicales",
  "Idiomas",
  "Doblaje / locución",
  "Esgrima escénica",
  "Improvisación",
] as const;

export function calcularEdad(fechaNacimiento: string): number {
  const nacimiento = new Date(fechaNacimiento);
  const hoy = new Date();
  let edad = hoy.getFullYear() - nacimiento.getFullYear();
  const aunNoCumplio =
    hoy.getMonth() < nacimiento.getMonth() ||
    (hoy.getMonth() === nacimiento.getMonth() && hoy.getDate() < nacimiento.getDate());
  if (aunNoCumplio) edad -= 1;
  return edad;
}
