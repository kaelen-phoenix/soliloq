/**
 * Control de fidelidad de «✨ Mejorar redacción» (#317): antes de mostrar la propuesta se
 * revisa que salga del texto de la persona y no sea algo inventado. Es heurístico a
 * propósito: reescribir cambia palabras, pero un texto con otros nombres, obras o datos
 * trae muchas palabras que no estaban, y suele ser bastante más largo.
 */

// Palabras que una buena redacción agrega sin inventar nada (conectores y vocabulario de CV).
const PERMITIDAS = new Set(
  (
    "formacion formada formado forme formarme estudie estudios estudiando curse cursada cursado " +
    "experiencia experiencias participe participacion participando interprete interpretando " +
    "interpretacion personaje personajes elenco protagonico protagonica protagonice protagonista " +
    "realice realizado realizada obras teatro teatral teatrales cortometraje cortometrajes " +
    "largometraje publicidad publicidades comerciales audiovisual actuacion actor actriz " +
    "ademas tambien actualmente durante entre desde hasta luego posteriormente previamente " +
    "conocimientos habilidades idiomas manejo hablo nivel avanzado intermedio basico " +
    "trabaje trabajos trabajo proyectos proyecto destacados destaca incluye incluyen otros otras " +
    "donde cuales ambos varios varias distintos diferentes diversas diversos anos"
  ).split(" "),
);

function normalizar(texto: string): string {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

function palabras(texto: string, minimo: number): string[] {
  return normalizar(texto).match(/[a-zñ0-9]+/g)?.filter((p) => p.length >= minimo) ?? [];
}

export type Veredicto = { ok: true } | { ok: false; motivo: "sin_datos" | "inventado" };

export function revisarFidelidad(original: string, propuesta: string): Veredicto {
  // El modelo contesta en vez de reescribir («no encontré información…», «por favor enviá…»).
  // Solo cuenta si la frase no venía ya en el texto de la persona.
  const pedido = /no (se )?encontr|no hay (suficiente )?informacion|no poseo|no (se )?(ha )?proporcion|por favor|envie|envia(me)? |podrias|necesito mas/;
  if (pedido.test(normalizar(propuesta)) && !pedido.test(normalizar(original))) {
    return { ok: false, motivo: "sin_datos" };
  }
  if (propuesta.length > original.length * 1.8 + 200) return { ok: false, motivo: "inventado" };

  // Raíces de 5 letras: «estudié» / «estudios», «impro» / «improvisación» cuentan como la misma.
  const raices = new Set(palabras(original, 3).map((w) => w.slice(0, 5)));
  const candidatas = palabras(propuesta, 5).filter((w) => !PERMITIDAS.has(w));
  if (candidatas.length === 0) return { ok: true };
  const nuevas = candidatas.filter((w) => !raices.has(w.slice(0, 5)));
  // Con pocas palabras, un par de sinónimos («infancia» por «chica») no alcanza para descartar.
  return nuevas.length >= 3 && nuevas.length / candidatas.length > 0.4
    ? { ok: false, motivo: "inventado" }
    : { ok: true };
}
