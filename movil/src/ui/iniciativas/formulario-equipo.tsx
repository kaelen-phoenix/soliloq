import { useState } from "react";
import { View } from "react-native";
import { useTranslations } from "use-intl";
import { columnasEquipo, MAX_TITULO_EQUIPO, validarEquipo } from "@/lib/iniciativa-reglas";
import { supabase } from "~/lib/supabase";
import { Boton } from "../boton";
import { Campo } from "../campo";
import { Texto } from "../texto";
import { CampoLargo } from "./piezas";
import { MejorarRedaccion } from "~/ui/ia";

/**
 * Armar un Equipo o editar el título y la descripción de uno (`FormEquipo` de la web, #57): sin
 * roles y, desde #330, sin cupo.
 */
export function FormularioEquipo({
  creadorId,
  equipo,
  alTerminar,
  onCancelar,
}: {
  creadorId: string;
  equipo?: { id: string; titulo: string; descripcion: string | null };
  /** Con el id del equipo armado o editado. */
  alTerminar: (equipoId: string) => void;
  onCancelar: () => void;
}) {
  const t = useTranslations("proyectos.equipo");
  const tc = useTranslations("comun");
  const [titulo, setTitulo] = useState(equipo?.titulo ?? "");
  const [descripcion, setDescripcion] = useState(equipo?.descripcion ?? "");
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  async function guardar() {
    setError(null);
    const problema = validarEquipo(titulo);
    if (problema) return setError(t(problema));
    setCargando(true);
    if (equipo) {
      const { error: e } = await supabase
        .from("equipos")
        .update({ ...columnasEquipo({ titulo, descripcion }), actualizado_en: new Date().toISOString() })
        .eq("id", equipo.id);
      setCargando(false);
      if (e) return setError(t("errorGuardar"));
      return alTerminar(equipo.id);
    }
    const { data, error: e } = await supabase
      .from("equipos")
      .insert({ creador_id: creadorId, ...columnasEquipo({ titulo, descripcion }), cupo: null })
      .select("id")
      .single();
    setCargando(false);
    if (e || !data) return setError(t("errorCrear"));
    alTerminar(data.id);
  }

  return (
    <View style={{ gap: 16 }}>
      <Campo
        etiqueta={t("tituloEtiqueta")}
        placeholder={t("tituloPlaceholder")}
        maxLength={MAX_TITULO_EQUIPO}
        value={titulo}
        onChangeText={setTitulo}
      />
      <CampoLargo etiqueta={t("descripcion")} valor={descripcion} onCambio={setDescripcion} />
      <MejorarRedaccion texto={descripcion} onUsar={setDescripcion} tipo="equipo" />
      {error && <Texto variante="error">{error}</Texto>}
      <Boton onPress={guardar} cargando={cargando}>
        {equipo ? tc("guardar") : t("armarEquipo")}
      </Boton>
      <Boton variante="fantasma" onPress={onCancelar} disabled={cargando}>
        {tc("cancelar")}
      </Boton>
    </View>
  );
}
