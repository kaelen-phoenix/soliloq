import * as Crypto from "expo-crypto";
import { useState } from "react";
import { View } from "react-native";
import { useTranslations } from "use-intl";
import { formatearMientrasSeEscribe, isoATexto, textoAIso } from "@/lib/fecha-escrita";
import { columnasObra, filasRolesNuevos, validarObra, type RolNuevo } from "@/lib/iniciativa-reglas";
import { desdeColumnas, type Ubicacion } from "@/lib/ubicacion";
import { supabase } from "~/lib/supabase";
import { Tarjeta } from "../basicos";
import { Boton } from "../boton";
import { Campo } from "../campo";
import { CampoUbicacion } from "../perfil/campo-ubicacion";
import { Texto } from "../texto";
import { fuente, useColores } from "../tema";
import { CampoLargo } from "./piezas";
import { MejorarRedaccion } from "~/ui/ia";

/** La obra que se edita (`EditarObra` de la web). */
export interface ObraEditable {
  id: string;
  titulo: string;
  sinopsis: string | null;
  fecha_estreno_estimada: string | null;
  ubicacion_texto: string;
  ubicacion_publica: string | null;
  ubicacion_place_id: string | null;
  ubicacion_lat: number;
  ubicacion_lng: number;
  ubicacion_pais: string;
}

/**
 * Crear un Proyecto (#157, `FormularioObra`) —título, descripción, locación, estreno y los roles
 * que busca— o editar uno ya creado (#123, `EditarObra`). Las reglas son las de la web
 * (`@/lib/iniciativa-reglas`). Las fotos se suben en la pantalla del proyecto, que ya existe.
 *
 * La fecha se escribe «dd/mm/aaaa» como en el perfil (#307); en la base va ISO.
 */
export function FormularioObra({
  creadorId,
  obra,
  alTerminar,
  onCancelar,
}: {
  creadorId: string;
  /** Si viene, se edita; si no, se crea. */
  obra?: ObraEditable;
  /** Con el id del proyecto creado o editado. */
  alTerminar: (obraId: string) => void;
  onCancelar: () => void;
}) {
  const t = useTranslations("proyectos.formularioObra");
  const tFormulario = useTranslations("perfil.formulario");
  const tc = useTranslations("comun");
  const tFecha = useTranslations("perfil.formulario.errores");
  const color = useColores();
  const editando = !!obra;
  const [titulo, setTitulo] = useState(obra?.titulo ?? "");
  const [sinopsis, setSinopsis] = useState(obra?.sinopsis ?? "");
  const [ubicacion, setUbicacion] = useState<Ubicacion | null>(desdeColumnas(obra) ?? null);
  const [fechaTexto, setFechaTexto] = useState(isoATexto(obra?.fecha_estreno_estimada));
  const [roles, setRoles] = useState<RolNuevo[]>([]);
  const [rolNombre, setRolNombre] = useState("");
  const [rolDescripcion, setRolDescripcion] = useState("");
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  function agregarRol() {
    if (!rolNombre.trim()) return setErrores((p) => ({ ...p, rol: t("errorRol") }));
    setRoles((prev) => [...prev, { id: Crypto.randomUUID(), nombre: rolNombre.trim(), descripcion: rolDescripcion.trim() }]);
    setRolNombre("");
    setRolDescripcion("");
    setErrores((p) => ({ ...p, rol: "" }));
  }

  async function guardar() {
    setErrorGeneral(null);
    const claves = editando
      ? { titulo: "errorTituloObra", ubicacion: "errorUbicacionCorta" }
      : { titulo: "errorTitulo", ubicacion: "errorUbicacion" };
    const nuevos = Object.fromEntries(
      Object.entries(validarObra({ titulo, ubicacion }, claves)).map(([campo, clave]) => [campo, t(clave)]),
    );
    const fechaEstreno = fechaTexto ? textoAIso(fechaTexto) : "";
    if (fechaEstreno === null) nuevos.fecha = tFecha("fechaFormato");
    // Reemplaza los avisos anteriores: uno ya corregido no tiene que quedar en rojo.
    setErrores((p) => ({ rol: p.rol ?? "", ...nuevos }));
    if (Object.keys(nuevos).length > 0) return;

    setCargando(true);
    const columnas = columnasObra({ titulo, sinopsis, ubicacion, fechaEstreno: fechaEstreno ?? "" });
    if (obra) {
      const { error } = await supabase.from("obras").update(columnas).eq("id", obra.id);
      setCargando(false);
      if (error) return setErrorGeneral(t("errorGuardar"));
      return alTerminar(obra.id);
    }

    const { data: nueva, error } = await supabase
      .from("obras")
      .insert({ creador_id: creadorId, ...columnas })
      .select("id")
      .single();
    if (error || !nueva) {
      setCargando(false);
      return setErrorGeneral(t("errorCrear"));
    }
    // Un fallo con los roles no se muestra: el proyecto ya quedó creado y se ajustan desde su pantalla.
    if (roles.length > 0) await supabase.from("roles").insert(filasRolesNuevos(nueva.id, roles));
    setCargando(false);
    alTerminar(nueva.id);
  }

  return (
    <View style={{ gap: 16 }}>
      <Campo
        etiqueta={editando ? t("titulo") : t("tituloProyecto")}
        value={titulo}
        onChangeText={setTitulo}
        error={errores.titulo}
      />
      <CampoLargo etiqueta={editando ? t("sinopsis") : t("descripcion")} valor={sinopsis} onCambio={setSinopsis} />
      <MejorarRedaccion texto={sinopsis} onUsar={setSinopsis} tipo="sinopsis" />
      <CampoUbicacion etiqueta={t("ubicacion")} valor={ubicacion} onCambio={setUbicacion} error={errores.ubicacion} />
      <Campo
        etiqueta={t("fechaEstreno")}
        value={fechaTexto}
        onChangeText={(v) => setFechaTexto(formatearMientrasSeEscribe(v))}
        placeholder={tFormulario("fechaPlaceholder")}
        keyboardType="number-pad"
        maxLength={10}
        error={errores.fecha}
      />

      {!editando && (
        <View style={{ gap: 8 }}>
          <Texto style={{ fontFamily: fuente.media, fontSize: 15 }}>
            {t.rich("rolesQueBusca", { tenue: (txt) => <Texto variante="tenue">{txt}</Texto> })}
          </Texto>
          {roles.map((r) => (
            <View
              key={r.id}
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 8,
                borderWidth: 1,
                borderColor: color.borde,
                borderRadius: 10,
                paddingHorizontal: 12,
                paddingVertical: 8,
              }}
            >
              <View style={{ flex: 1 }}>
                <Texto style={{ fontFamily: fuente.media }} numberOfLines={1}>
                  {r.nombre}
                </Texto>
                {!!r.descripcion && (
                  <Texto variante="chico" numberOfLines={1}>
                    {r.descripcion}
                  </Texto>
                )}
              </View>
              <Texto
                variante="chico"
                accessibilityRole="button"
                style={{ color: color.error, fontFamily: fuente.media }}
                onPress={() => setRoles((prev) => prev.filter((x) => x.id !== r.id))}
              >
                {t("quitar")}
              </Texto>
            </View>
          ))}
          {/* #330: sin tope de roles. */}
          <Tarjeta style={{ borderStyle: "dashed" }}>
            <Campo
              etiqueta={t("rolBuscado")}
              placeholder={t("rolPlaceholder")}
              value={rolNombre}
              onChangeText={setRolNombre}
              error={errores.rol || null}
            />
            <Campo etiqueta={t("rolDescripcion")} value={rolDescripcion} onChangeText={setRolDescripcion} />
            <Boton variante="secundario" onPress={agregarRol}>
              {t("agregarRol")}
            </Boton>
          </Tarjeta>
        </View>
      )}

      {errorGeneral && <Texto variante="error">{errorGeneral}</Texto>}
      <Boton onPress={guardar} cargando={cargando}>
        {editando ? t("guardarCambios") : t("crearProyecto")}
      </Boton>
      <Boton variante="fantasma" onPress={onCancelar} disabled={cargando}>
        {tc("cancelar")}
      </Boton>
    </View>
  );
}
