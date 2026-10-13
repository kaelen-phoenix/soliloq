import { useState } from "react";
import { View } from "react-native";
import { useTranslations } from "use-intl";
import { claveGenero, GENEROS_BUSCABLES, type Genero } from "@/lib/constantes";
import { columnasRol, validarRol } from "@/lib/iniciativa-reglas";
import type { TipoRol } from "@/lib/supabase/types";
import { supabase } from "~/lib/supabase";
import { Opciones, Tarjeta } from "../basicos";
import { Boton } from "../boton";
import { Campo } from "../campo";
import { Texto } from "../texto";
import { fuente } from "../tema";
import { CampoLargo, Pildoras } from "./piezas";
import { MejorarRedaccion } from "~/ui/ia";

/** Agregar un rol a un Proyecto (`FormularioRol` de la web), plegado detrás de un botón. */
export function FormularioRol({ obraId, alAgregar }: { obraId: string; alAgregar: () => void }) {
  const t = useTranslations("proyectos.formularioRol");
  const tc = useTranslations("comun");
  const tEtiquetas = useTranslations("perfil.etiquetas");
  const [abierto, setAbierto] = useState(false);
  const [nombre, setNombre] = useState("");
  const [tipo, setTipo] = useState<TipoRol>("actuacion");
  const [edadMinima, setEdadMinima] = useState("");
  const [edadMaxima, setEdadMaxima] = useState("");
  const [vacantes, setVacantes] = useState("1");
  const [descripcion, setDescripcion] = useState("");
  // Vacío = abierto a cualquier género, y es el default.
  const [generos, setGeneros] = useState<Genero[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  async function agregar() {
    setError(null);
    const valores = { nombre, tipo, edadMinima, edadMaxima, vacantes, descripcion, generos };
    const problema = validarRol(valores);
    if (problema) return setError(t(problema));
    setCargando(true);
    const { error: e } = await supabase.from("roles").insert(columnasRol(obraId, valores));
    setCargando(false);
    if (e) return setError(t("errorGuardar"));
    setNombre("");
    setEdadMinima("");
    setEdadMaxima("");
    setVacantes("1");
    setDescripcion("");
    setGeneros([]);
    setAbierto(false);
    alAgregar();
  }

  if (!abierto) {
    return (
      <Boton variante="secundario" onPress={() => setAbierto(true)}>
        {t("agregarRol")}
      </Boton>
    );
  }

  const soloNumeros = (v: string) => v.replace(/\D/g, "");
  return (
    <Tarjeta style={{ borderStyle: "dashed" }}>
      <Campo etiqueta={t("nombre")} value={nombre} onChangeText={setNombre} />
      <Opciones<TipoRol>
        valor={tipo}
        onElegir={setTipo}
        opciones={[
          { valor: "actuacion", etiqueta: t("actuacion") },
          { valor: "tecnica", etiqueta: t("tecnica") },
        ]}
      />
      <View style={{ flexDirection: "row", gap: 8 }}>
        <View style={{ flex: 1 }}>
          <Campo etiqueta={t("edadMin")} value={edadMinima} onChangeText={(v) => setEdadMinima(soloNumeros(v))} keyboardType="number-pad" />
        </View>
        <View style={{ flex: 1 }}>
          <Campo etiqueta={t("edadMax")} value={edadMaxima} onChangeText={(v) => setEdadMaxima(soloNumeros(v))} keyboardType="number-pad" />
        </View>
        <View style={{ flex: 1 }}>
          <Campo etiqueta={t("vacantes")} value={vacantes} onChangeText={(v) => setVacantes(soloNumeros(v))} keyboardType="number-pad" />
        </View>
      </View>
      <View style={{ gap: 6 }}>
        <Texto style={{ fontFamily: fuente.media, fontSize: 15 }}>{t("generos")}</Texto>
        <Pildoras<Genero>
          opciones={GENEROS_BUSCABLES.map((g) => ({ valor: g.valor, etiqueta: tEtiquetas(claveGenero(g.valor)) }))}
          elegidas={generos}
          onAlternar={(g) => setGeneros((prev) => (prev.includes(g) ? prev.filter((x) => x !== g) : [...prev, g]))}
        />
        <Texto variante="chico">{generos.length === 0 ? t("generosVacio") : t("generosMarcados")}</Texto>
      </View>
      <CampoLargo valor={descripcion} onCambio={setDescripcion} placeholder={t("descripcion")} />
      <MejorarRedaccion texto={descripcion} onUsar={setDescripcion} tipo="rol" />
      {error && <Texto variante="error">{error}</Texto>}
      <Boton onPress={agregar} cargando={cargando}>
        {t("guardar")}
      </Boton>
      <Boton variante="fantasma" onPress={() => setAbierto(false)}>
        {tc("cancelar")}
      </Boton>
    </Tarjeta>
  );
}
