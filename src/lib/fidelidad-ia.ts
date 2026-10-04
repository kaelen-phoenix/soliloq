/**
 * Control de fidelidad de «✨ Mejorar redacción» (#317): antes de mostrar la propuesta se
 * revisa que salga del texto de la persona y no sea algo inventado. Es heurístico a
 * propósito. Reescribir cambia palabras y agrega algún adorno, y eso está bien; lo que no
 * puede aparecer son datos: nombres propios, años o números que la persona no escribió.
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
    "donde cuales ambos varios varias distintos diferentes diversas diversos anos " +
    "buscamos busca buscando formar realizar sumar sumarse personas persona integrantes grupo " +
    "interesadas interesados invitamos necesitamos requiere requisitos ensayos ensayamos semana semanas"
  ).split(" "),
);

// El modelo contesta en vez de reescribir («no encontré información…», «por favor enviá…»).
const PEDIDO =
  /no (se )?encontr|no hay (suficiente )?informacion|no poseo|no (se )?(ha )?proporcion|por favor|envie|envia(me)? |podrias|necesito mas/;

function normalizar(texto: string): string {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

function palabras(texto: string, minimo: number): string[] {
  return normalizar(texto).match(/[a-zñ0-9]+/g)?.filter((p) => p.length >= minimo) ?? [];
}

/** Palabras en mayúscula que no abren una oración: nombres de personas, obras, escuelas. */
function nombresPropios(texto: string): string[] {
  const nombres: string[] = [];
  for (const oracion of texto.split(/[.!?:\n]+/)) {
    const tokens = oracion.trim().split(/\s+/);
    for (const t of tokens.slice(1)) {
      const limpio = t.replace(/^[«"'(¿¡]+|[»"'),;]+$/g, "");
      if (/^[A-ZÁÉÍÓÚÑ][a-záéíóúñ]{2,}/.test(limpio)) nombres.push(limpio);
    }
  }
  return nombres;
}

export type Veredicto = { ok: true } | { ok: false; motivo: "sin_datos" | "inventado" };

export function revisarFidelidad(original: string, propuesta: string): Veredicto {
  // Solo cuenta como pedido si la frase no venía ya en el texto de la persona.
  if (PEDIDO.test(normalizar(propuesta)) && !PEDIDO.test(normalizar(original))) {
    return { ok: false, motivo: "sin_datos" };
  }
  if (propuesta.length > original.length * 1.8 + 200) return { ok: false, motivo: "inventado" };

  // Raíces de 5 letras: «estudié» / «estudios», «impro» / «improvisación» cuentan como la misma.
  const raices = new Set(palabras(original, 3).map((w) => w.slice(0, 5)));
  const esNueva = (w: string) => !raices.has(normalizar(w).slice(0, 5));

  // Años o números que no estaban.
  const numerosOriginal = new Set(original.match(/\d+/g) ?? []);
  if ((propuesta.match(/\d{2,}/g) ?? []).some((n) => !numerosOriginal.has(n))) {
    return { ok: false, motivo: "inventado" };
  }
  // Nombres propios nuevos (dos o más distintos: uno suelto puede ser un sustantivo en mayúscula).
  const nombresNuevos = new Set(nombresPropios(propuesta).filter(esNueva).map(normalizar));
  if (nombresNuevos.size >= 2) return { ok: false, motivo: "inventado" };

  // Y que no sea mayormente otro texto. Unos sinónimos o un adorno («entusiasmo») no alcanzan.
  const candidatas = palabras(propuesta, 5).filter((w) => !PERMITIDAS.has(w));
  const nuevas = candidatas.filter(esNueva);
  return nuevas.length >= 5 && nuevas.length / candidatas.length > 0.6
    ? { ok: false, motivo: "inventado" }
    : { ok: true };
}
