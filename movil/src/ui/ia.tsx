import { useEffect, useState } from "react";
import { View } from "react-native";
import { useTranslations } from "use-intl";
import type { FiltrosBusqueda } from "@/lib/ia-tipos";
import type { TipoRedaccion } from "@/lib/ia-prompts";
import { etiquetaHabilidad } from "@/lib/constantes";
import { llamarApi } from "~/lib/api";
import { useIdioma } from "~/lib/intl";
import { Tarjeta } from "./basicos";
import { Boton } from "./boton";
import { Texto } from "./texto";

const MINIMO = 15;

type ErrorIa = { clave: string; valores?: Record<string, string | number> };

/**
 * La IA de la app (#395) pasa por la web (`/api/app/ia`): mismas instrucciones, mismo tope de
 * usos y mismas reglas que en la web (`@/lib/ia-acciones`). El error vuelve como clave de
 * `admin.ia` y se traduce acá.
 */
export function useIa() {
  const tIa = useTranslations("admin.ia");
  const { idioma } = useIdioma();
  async function pedir<T extends object>(cuerpo: Record<string, unknown>) {
    const r = await llamarApi<T>("ia", { ...cuerpo, idioma });
    if (r.ok) return r;
    const e = (r as { error?: ErrorIa | string }).error;
    const mensaje = typeof e === "object" && e ? tIa(e.clave, e.valores) : tIa("errorGenerico");
    return { ok: false as const, mensaje };
  }
  return {
    mejorar: (texto: string, tipo: TipoRedaccion) => pedir<{ texto: string }>({ accion: "mejorar", texto, tipo }),
    habilidades: (texto: string) => pedir<{ habilidades: string[] }>({ accion: "habilidades", texto }),
    busqueda: (consulta: string) => pedir<{ filtros: FiltrosBusqueda }>({ accion: "busqueda", consulta }),
    saludo: (salaId: string) => pedir<{ texto: string }>({ accion: "saludo", salaId }),
  };
}

/**
 * «✨ Mejorar redacción» (#313, #319), como en la web: muestra la propuesta y recién con «Usar
 * este texto» reemplaza lo escrito. Nada se guarda solo.
 */
export function MejorarRedaccion({
  texto,
  onUsar,
  tipo = "experiencia",
}: {
  texto: string;
  onUsar: (nuevo: string) => void;
  tipo?: TipoRedaccion;
}) {
  const t = useTranslations("perfil.mejorarRedaccion");
  const ia = useIa();
  const [pensando, setPensando] = useState(false);
  // La propuesta va con el texto del que salió: si la persona lo sigue editando, ya no aplica.
  const [propuesta, setPropuesta] = useState<{ de: string; texto: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (propuesta && propuesta.de !== texto) setPropuesta(null);
  }, [texto, propuesta]);

  async function pedir() {
    const de = texto;
    setPensando(true);
    setError(null);
    setPropuesta(null);
    const r = await ia.mejorar(de, tipo);
    setPensando(false);
    if (!r.ok) return setError(r.mensaje);
    setPropuesta({ de, texto: r.texto });
  }

  const corto = texto.trim().length < MINIMO;
  return (
    <View style={{ gap: 6 }}>
      <Boton variante="secundario" onPress={pedir} cargando={pensando} disabled={corto}>
        {pensando ? t("mejorando") : t("boton")}
      </Boton>
      {corto && <Texto variante="chico">{t(`ayuda.${tipo}`)}</Texto>}
      {error && <Texto variante="error">{error}</Texto>}
      {propuesta && (
        <Tarjeta>
          <Texto>{propuesta.texto}</Texto>
          <Boton
            onPress={() => {
              onUsar(propuesta.texto);
              setPropuesta(null);
            }}
          >
            {t("usar")}
          </Boton>
          <Boton variante="fantasma" onPress={() => setPropuesta(null)}>
            {t("descartar")}
          </Boton>
        </Tarjeta>
      )}
    </View>
  );
}

/**
 * «✨ Sugerir desde mi experiencia» (#320): marca las habilidades de la lista que aparecen en la
 * Experiencia. Solo suma marcas y avisa cuáles.
 */
export function SugerirHabilidades({
  experiencia,
  marcadas,
  onMarcar,
}: {
  experiencia: string;
  marcadas: string[];
  onMarcar: (nuevas: string[]) => void;
}) {
  const t = useTranslations("perfil.sugerirHabilidades");
  const tEtiquetas = useTranslations("perfil.etiquetas");
  const ia = useIa();
  const [pensando, setPensando] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);

  async function pedir() {
    setPensando(true);
    setAviso(null);
    const r = await ia.habilidades(experiencia);
    setPensando(false);
    if (!r.ok) return setAviso(r.mensaje);
    const nuevas = r.habilidades.filter((h) => !marcadas.includes(h));
    if (nuevas.length === 0) return setAviso(r.habilidades.length > 0 ? t("yaMarcadas") : t("ninguna"));
    onMarcar(nuevas);
    setAviso(t("marcamos", { lista: nuevas.map((h) => etiquetaHabilidad(h, tEtiquetas)).join(", ") }));
  }

  if (experiencia.trim().length < MINIMO) return null;
  return (
    <View style={{ gap: 6 }}>
      <Boton variante="secundario" onPress={pedir} cargando={pensando}>
        {pensando ? t("leyendo") : t("boton")}
      </Boton>
      {aviso && <Texto variante="chico">{aviso}</Texto>}
    </View>
  );
}
