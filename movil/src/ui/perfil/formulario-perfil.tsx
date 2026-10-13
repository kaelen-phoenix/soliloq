import { useEffect, useRef, useState } from "react";
import { ScrollView, Switch, View } from "react-native";
import { useTranslations } from "use-intl";
import {
  claveDisciplina,
  claveGenero,
  claveRed,
  DISCIPLINAS,
  etiquetaHabilidad,
  familiaDeDisciplina,
  GENEROS,
  HABILIDADES,
  MAX_GENERO_DESCRIPCION,
  MAX_OTRO_DETALLE,
  REDES,
  type ClaveRed,
  type Genero,
} from "@/lib/constantes";
import { formatearMientrasSeEscribe, isoATexto } from "@/lib/fecha-escrita";
import {
  claveBorrador,
  columnasCreador,
  columnasPerfil,
  elegirBorrador,
  erroresDelPaso,
  FOTOS_RECOMENDADAS,
  MAX_TEXTO_LARGO,
  PASOS_OPCIONALES,
  filasFotosPendientes,
  primerPasoConError,
  TOTAL_PASOS,
  validarPerfil,
  type FotoTalento,
  type ValoresPerfil,
} from "@/lib/perfil-talento";
import { validarRedes } from "@/lib/redes";
import type { DisciplinaArtistica, Json } from "@/lib/supabase/types";
import { desdeColumnas, unidadPorPais, type Ubicacion } from "@/lib/ubicacion";
import { llamarApi } from "~/lib/api";
import { supabase } from "~/lib/supabase";
import { Casilla, Opciones, Rotulo, Tarjeta } from "../basicos";
import { Boton } from "../boton";
import { Campo } from "../campo";
import { Texto } from "../texto";
import { fuente, radio, useColores } from "../tema";
import { CampoUbicacion } from "./campo-ubicacion";
import { SubirFotos } from "./subir-fotos";

/** La fila de `mi_perfil_talento` que se edita. */
export interface DatosIniciales {
  nombre: string;
  fecha_nacimiento: string | null;
  edad_visible: boolean;
  ubicacion_texto: string;
  ubicacion_publica: string | null;
  ubicacion_place_id: string | null;
  ubicacion_lat: number;
  ubicacion_lng: number;
  ubicacion_pais: string;
  genero: Genero;
  genero_descripcion: string | null;
  videoreel_url: string | null;
  experiencia: string | null;
  formacion: string | null;
  habilidades: string[];
  redes: Record<string, string>;
  aparece_en_buscador: boolean;
}

const COLOR_FAMILIA = {
  escena: { fondo: "#fdf3ee", texto: "#c2410c" },
  direccion: { fondo: "#f1f2fd", texto: "#4338ca" },
  diseno: { fondo: "#f5f8ec", texto: "#65a30d" },
  tecnica: { fondo: "#ecf7fa", texto: "#0891b2" },
} as const;

/** Píldoras de selección múltiple (habilidades, disciplinas). */
function Chips<T extends string>({
  valores,
  elegidos,
  etiqueta,
  onAlternar,
  colorDe,
}: {
  valores: readonly T[];
  elegidos: T[];
  etiqueta: (v: T) => string;
  onAlternar: (v: T) => void;
  colorDe?: (v: T) => { fondo: string; texto: string } | null;
}) {
  const color = useColores();
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
      {valores.map((v) => {
        const elegido = elegidos.includes(v);
        const propio = elegido ? colorDe?.(v) : null;
        return (
          <Texto
            key={v}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: elegido }}
            onPress={() => onAlternar(v)}
            style={{
              overflow: "hidden",
              borderRadius: radio.pildora,
              borderWidth: 1,
              borderColor: elegido ? (propio ? "transparent" : color.accion) : color.borde,
              backgroundColor: elegido ? (propio?.fondo ?? color.accion) : "transparent",
              color: elegido ? (propio?.texto ?? color.accionTexto) : color.textoTenue,
              paddingHorizontal: 12,
              paddingVertical: 7,
              fontSize: 14,
              fontFamily: elegido ? fuente.media : fuente.normal,
            }}
          >
            {etiqueta(v)}
          </Texto>
        );
      })}
    </View>
  );
}

/**
 * El Perfil de Talento: alta en `TOTAL_PASOS` pasos (#383) o edición con todo junto. Las
 * reglas (qué se valida, qué se guarda, el borrador) son las de la web: `@/lib/perfil-talento`.
 */
export function FormularioPerfil({
  userId,
  esAlta,
  datosIniciales,
  fotosIniciales,
  datosCreador,
  nombreSugerido,
  conFotoGoogle = false,
  borrador,
  alTerminar,
}: {
  userId: string;
  esAlta: boolean;
  datosIniciales?: DatosIniciales;
  fotosIniciales: FotoTalento[];
  datosCreador?: { disciplinas: DisciplinaArtistica[]; otro_detalle: string | null };
  nombreSugerido?: string;
  conFotoGoogle?: boolean;
  borrador?: { paso: number; datos: unknown; actualizadoEn: string } | null;
  alTerminar: () => void;
}) {
  const t = useTranslations("perfil.formulario");
  const tPasos = useTranslations("perfil.wizard");
  const tError = useTranslations("perfil.formulario.errores");
  const tEtiquetas = useTranslations("perfil.etiquetas");
  const tCreador = useTranslations("perfil.creador");
  const tFotoGoogle = useTranslations("perfil.completar.errores");
  const tUi = useTranslations("cuenta.ui");
  const color = useColores();
  const scroll = useRef<ScrollView>(null);

  const [v, setV] = useState<ValoresPerfil>(() => ({
    nombre: datosIniciales?.nombre ?? nombreSugerido ?? "",
    fechaNacimiento: isoATexto(datosIniciales?.fecha_nacimiento),
    edadVisible: datosIniciales?.edad_visible ?? true,
    ubicacion: desdeColumnas(datosIniciales) ?? null,
    genero: datosIniciales?.genero ?? "",
    generoDescripcion: datosIniciales?.genero_descripcion ?? "",
    videoreelUrl: datosIniciales?.videoreel_url ?? "",
    experiencia: datosIniciales?.experiencia ?? "",
    formacion: datosIniciales?.formacion ?? "",
    habilidades: datosIniciales?.habilidades ?? [],
    redes: datosIniciales?.redes ?? {},
    apareceEnBuscador: datosIniciales?.aparece_en_buscador ?? true,
    disciplinas: datosCreador?.disciplinas ?? [],
    otroDetalle: datosCreador?.otro_detalle ?? "",
  }));
  const cambiar = <K extends keyof ValoresPerfil>(clave: K, valor: ValoresPerfil[K]) =>
    setV((prev) => ({ ...prev, [clave]: valor }));
  const [fotos, setFotos] = useState<FotoTalento[]>(fotosIniciales);
  const [masRedes, setMasRedes] = useState(() =>
    REDES.some((r) => r.clave !== "instagram" && !!datosIniciales?.redes?.[r.clave]),
  );
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);
  const [guardado, setGuardado] = useState(false);
  const [paso, setPaso] = useState(1);
  const [recuperado, setRecuperado] = useState(false);
  const [fotoGoogle, setFotoGoogle] = useState<string>("lista");
  const borradorLeido = useRef(!esAlta);
  const terminado = useRef(false);

  // #300 / #383: el alta retoma lo que quedó guardado, en el teléfono o en la base.
  useEffect(() => {
    if (!esAlta) return;
    let local: unknown = null;
    try {
      const crudo = localStorage.getItem(claveBorrador(userId));
      local = crudo ? JSON.parse(crudo) : null;
    } catch {
      // Sin almacenamiento local: queda el de la base.
    }
    const elegido = elegirBorrador(userId, local, borrador);
    if (elegido) {
      const { fotos: f, paso: p, guardadoEn: _g, ...resto } = elegido.valores;
      if (resto.fechaNacimiento && /^\d{4}-/.test(resto.fechaNacimiento)) {
        resto.fechaNacimiento = isoATexto(resto.fechaNacimiento);
      }
      setV((prev) => ({ ...prev, ...resto }));
      if (f) setFotos(f);
      if (p) setPaso(p);
      setRecuperado(elegido.recuperado);
    }
    borradorLeido.current = true;
    // Solo al entrar.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [esAlta, userId]);

  // ...y se guarda en cada cambio: en el teléfono al instante, en la base un momento después.
  useEffect(() => {
    if (!esAlta || !borradorLeido.current || terminado.current) return;
    const datos = { ...v, fotos, paso, guardadoEn: Date.now() };
    try {
      localStorage.setItem(claveBorrador(userId), JSON.stringify(datos));
    } catch {
      // Queda el de la base.
    }
    const id = setTimeout(async () => {
      if (terminado.current) return;
      await supabase
        .from("borradores_perfil")
        .upsert({ perfil_id: userId, paso, datos: datos as unknown as Json, actualizado_en: new Date().toISOString() });
    }, 1000);
    return () => clearTimeout(id);
  }, [esAlta, userId, v, fotos, paso]);

  function calcularErrores() {
    return validarPerfil(v, {
      esAlta,
      cantidadFotos: fotos.length,
      validarCreador: !!datosCreador || esAlta,
      exigirDisciplina: !!datosCreador && datosCreador.disciplinas.length > 0,
      tError,
      tEtiquetas,
      tCreador,
    });
  }

  function irAPaso(n: number) {
    setErrores({});
    setErrorGeneral(null);
    setPaso(n);
    scroll.current?.scrollTo({ y: 0, animated: true });
  }

  function avanzar() {
    const delPaso = erroresDelPaso(calcularErrores(), paso);
    setErrores(delPaso);
    if (Object.keys(delPaso).length > 0) return setErrorGeneral(tError("revisar"));
    irAPaso(Math.min(paso + 1, TOTAL_PASOS));
  }

  async function usarFotoGoogle() {
    setFotoGoogle("trayendo");
    const r = await llamarApi<{ storage_path: string; url: string }>("foto-google");
    if (!r.ok) {
      const clave = r.error === "sinFoto" || r.error === "noSeTrajo" ? r.error : "noSeGuardo";
      return setFotoGoogle(tFotoGoogle(clave));
    }
    setFotos((prev) => [
      ...prev,
      {
        id: r.storage_path,
        storage_path: r.storage_path,
        orden: prev.reduce((max, f) => Math.max(max, f.orden), -1) + 1,
        url: r.url,
        enBd: false,
      },
    ]);
    setFotoGoogle("usada");
  }

  async function guardar() {
    setErrorGeneral(null);
    setGuardado(false);
    const nuevos = calcularErrores();
    setErrores(nuevos);
    if (Object.keys(nuevos).length > 0) {
      if (esAlta) {
        const conError = primerPasoConError(nuevos);
        if (conError) {
          setPaso(conError);
          setErrores(erroresDelPaso(nuevos, conError));
        }
      }
      return setErrorGeneral(tError("revisar"));
    }

    setCargando(true);
    const campos = columnasPerfil(v);
    if (esAlta) terminado.current = true;
    const { error } = esAlta
      ? await supabase
          .from("perfiles_talento")
          .insert({ id: userId, ...campos, unidad_distancia: unidadPorPais(v.ubicacion!.pais) })
      : await supabase.from("perfiles_talento").update(campos).eq("id", userId);
    if (error) {
      terminado.current = false;
      setCargando(false);
      return setErrorGeneral(tError("guardar"));
    }

    if (esAlta) {
      // Recién ahora existe la fila de `perfiles_talento` que exige la FK de las fotos.
      const pendientes = filasFotosPendientes(userId, fotos);
      if (pendientes.length > 0) await supabase.from("fotos_talento").insert(pendientes);
      if (v.disciplinas.length > 0) {
        await supabase.from("perfiles_creador").upsert({ id: userId, ...columnasCreador(v) });
      }
      try {
        localStorage.removeItem(claveBorrador(userId));
      } catch {
        // Nada que limpiar.
      }
      await supabase.from("borradores_perfil").delete().eq("perfil_id", userId);
      await supabase.from("perfiles").update({ onboarding_completo: true }).eq("id", userId);
      alTerminar();
      return;
    }

    if (datosCreador) {
      const { error: e } = await supabase.from("perfiles_creador").update(columnasCreador(v)).eq("id", userId);
      if (e) {
        setCargando(false);
        return setErrorGeneral(tError("guardarCreador"));
      }
    }
    setCargando(false);
    setGuardado(true);
    alTerminar();
  }

  // ── Las partes. Al editar se ven todas juntas; en el alta, una por paso. ──

  const fichaBasica = (
    <View style={{ gap: 16 }}>
      {!esAlta && <Rotulo>{t("fichaBasica")}</Rotulo>}
      <Campo etiqueta={t("nombre")} value={v.nombre} onChangeText={(x) => cambiar("nombre", x)} error={errores.nombre} />
      <View style={{ gap: 8 }}>
        <Campo
          etiqueta={t("fechaNacimiento")}
          value={v.fechaNacimiento}
          onChangeText={(x) => cambiar("fechaNacimiento", formatearMientrasSeEscribe(x))}
          placeholder={t("fechaPlaceholder")}
          keyboardType="number-pad"
          maxLength={10}
          error={errores.fecha_nacimiento}
        />
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <Switch
            accessibilityLabel={v.edadVisible ? t("edadVisible") : t("edadOculta")}
            value={v.edadVisible}
            onValueChange={(x) => cambiar("edadVisible", x)}
            trackColor={{ true: color.accion, false: color.borde }}
          />
          <Texto variante="tenue" style={{ flex: 1 }}>
            {v.edadVisible ? t("edadVisible") : t("edadOculta")}
          </Texto>
        </View>
        <Texto variante="chico">{t("fechaAyuda")}</Texto>
      </View>
      <CampoUbicacion
        etiqueta={t("ubicacion")}
        valor={v.ubicacion}
        onCambio={(u: Ubicacion | null) => cambiar("ubicacion", u)}
        error={errores.ubicacion}
      />
      <Texto variante="chico">{t("ubicacionAyuda")}</Texto>
      <View style={{ gap: 8 }}>
        <Texto style={{ fontFamily: fuente.media, fontSize: 15 }}>{t("genero")}</Texto>
        <Opciones<Genero>
          valor={v.genero as Genero}
          onElegir={(g) => cambiar("genero", g)}
          opciones={GENEROS.map((g) => ({ valor: g.valor, etiqueta: tEtiquetas(claveGenero(g.valor)) }))}
        />
        {errores.genero && <Texto variante="error">{errores.genero}</Texto>}
      </View>
      {/* #311: la aclaración solo si eligió «Otro». */}
      {v.genero === "otro" && (
        <Campo
          etiqueta={t("generoCual")}
          value={v.generoDescripcion}
          maxLength={MAX_GENERO_DESCRIPCION}
          onChangeText={(x) => cambiar("generoDescripcion", x)}
          error={errores.genero_descripcion}
        />
      )}
    </View>
  );

  const portfolio = (
    <View style={{ gap: 10 }}>
      {!esAlta && <Rotulo>{t("portfolio")}</Rotulo>}
      {esAlta && conFotoGoogle && fotoGoogle !== "usada" && (
        <View style={{ gap: 4 }}>
          <Boton variante="secundario" onPress={usarFotoGoogle} cargando={fotoGoogle === "trayendo"}>
            {fotoGoogle === "trayendo" ? t("trayendoFoto") : t("usarFotoGoogle")}
          </Boton>
          {fotoGoogle !== "lista" && fotoGoogle !== "trayendo" && <Texto variante="error">{fotoGoogle}</Texto>}
        </View>
      )}
      <SubirFotos talentoId={userId} fotos={fotos} onCambio={setFotos} persistir={!esAlta} />
      {errores.fotos && <Texto variante="error">{errores.fotos}</Texto>}
      {fotos.length > 0 && fotos.length < FOTOS_RECOMENDADAS && (
        <Texto variante="chico">{t("fotosRecomendadas", { n: FOTOS_RECOMENDADAS })}</Texto>
      )}
    </View>
  );

  const textoLargo = (clave: "experiencia" | "formacion", etiqueta: string, placeholder: string) => (
    <View style={{ gap: 4 }}>
      <Campo
        etiqueta={etiqueta}
        value={v[clave]}
        onChangeText={(x) => cambiar(clave, x)}
        placeholder={placeholder}
        multiline
        maxLength={MAX_TEXTO_LARGO}
        textAlignVertical="top"
        style={{ minHeight: 120, paddingTop: 12 }}
        error={errores[clave]}
      />
      <Texto variante="chico" style={{ textAlign: "right" }}>
        {v[clave].length}/{MAX_TEXTO_LARGO}
      </Texto>
    </View>
  );

  const experienciaYFormacion = (
    <View style={{ gap: 16 }}>
      {textoLargo("experiencia", t("experiencia"), t("experienciaPlaceholder"))}
      {textoLargo("formacion", `${t("formacion")} ${t("opcional")}`, t("formacionPlaceholder"))}
    </View>
  );

  const habilidades = (
    <Chips
      valores={HABILIDADES}
      elegidos={v.habilidades}
      etiqueta={(h) => etiquetaHabilidad(h, tEtiquetas)}
      onAlternar={(h) =>
        cambiar("habilidades", v.habilidades.includes(h) ? v.habilidades.filter((x) => x !== h) : [...v.habilidades, h])
      }
    />
  );

  const videoreel = (
    <View style={{ gap: 8 }}>
      <Rotulo>{t("videoreel")}</Rotulo>
      <Campo
        etiqueta={t("videoreelEtiqueta")}
        value={v.videoreelUrl}
        onChangeText={(x) => cambiar("videoreelUrl", x.trim())}
        placeholder={t("videoreelPlaceholder")}
        autoCapitalize="none"
        keyboardType="url"
        error={errores.videoreel_url}
      />
      <Texto variante="chico">{t("videoreelAyuda")}</Texto>
    </View>
  );

  const redes = (
    <View style={{ gap: 12 }}>
      <Rotulo>{t("redes")}</Rotulo>
      {REDES.filter(
        (red) => masRedes || red.clave === "instagram" || !!v.redes[red.clave] || !!errores[`redes_${red.clave}`],
      ).map((red) => (
        <Campo
          key={red.clave}
          etiqueta={tEtiquetas(claveRed(red.clave))}
          value={v.redes[red.clave] ?? ""}
          onChangeText={(x) => cambiar("redes", { ...v.redes, [red.clave]: x })}
          placeholder={red.clave === "sitio" ? t("sitioPlaceholder") : t("redPlaceholder")}
          autoCapitalize="none"
          autoCorrect={false}
          error={errores[`redes_${red.clave}`]}
        />
      ))}
      {!masRedes && (
        <Texto variante="tenue" style={{ textDecorationLine: "underline" }} onPress={() => setMasRedes(true)}>
          {t("agregarRed")}
        </Texto>
      )}
    </View>
  );

  const visibilidad = (
    <View style={{ gap: 8 }}>
      <Rotulo>{t("visibilidad")}</Rotulo>
      {/* #265: se tilda para ocultarse (en la base es `aparece_en_buscador`, invertido). */}
      <Casilla marcada={!v.apareceEnBuscador} onCambio={(x) => cambiar("apareceEnBuscador", !x)}>
        <Texto>{t("ocultarPerfil")}</Texto>
        <Texto variante="chico">{t("ocultarPerfilAyuda")}</Texto>
      </Casilla>
    </View>
  );

  const creador = (
    <View style={{ gap: 10 }}>
      <Texto style={{ fontFamily: fuente.semi }}>{tCreador("titulo")}</Texto>
      <Texto variante="chico">{tCreador("elegiTodo")}</Texto>
      <Chips<DisciplinaArtistica>
        valores={DISCIPLINAS.map((d) => d.valor)}
        elegidos={v.disciplinas}
        etiqueta={(d) => tEtiquetas(claveDisciplina(d))}
        colorDe={(d) => {
          const f = familiaDeDisciplina(d);
          return f === "otro" ? null : COLOR_FAMILIA[f];
        }}
        onAlternar={(d) =>
          cambiar("disciplinas", v.disciplinas.includes(d) ? v.disciplinas.filter((x) => x !== d) : [...v.disciplinas, d])
        }
      />
      {errores.creador_disciplinas && <Texto variante="error">{errores.creador_disciplinas}</Texto>}
      {v.disciplinas.includes("otro") && (
        <Campo
          etiqueta={tCreador("queHaces")}
          value={v.otroDetalle}
          maxLength={MAX_OTRO_DETALLE}
          placeholder={tCreador("queHacesPlaceholder")}
          onChangeText={(x) => cambiar("otroDetalle", x)}
          error={errores.creador_otro_detalle}
        />
      )}
    </View>
  );

  /** El último paso del alta: todo lo cargado, con «Editar» para volver a cada paso. */
  function bloque(n: number, contenido: React.ReactNode) {
    return (
      <Tarjeta key={n} style={{ gap: 6 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <Texto style={{ fontFamily: fuente.semi }}>{tPasos(`pasos.${n}.titulo`)}</Texto>
          <Texto variante="chico" style={{ textDecorationLine: "underline" }} onPress={() => irAPaso(n)}>
            {tPasos("editar")}
          </Texto>
        </View>
        {contenido}
      </Tarjeta>
    );
  }
  const sinCompletar = tPasos("sinCompletar");
  const resumen = (
    <View style={{ gap: 10 }}>
      {bloque(
        1,
        <>
          <Texto style={{ fontFamily: fuente.media }}>{v.nombre.trim()}</Texto>
          <Texto variante="tenue">
            {v.fechaNacimiento}
            {!v.edadVisible ? ` · ${t("edadOculta")}` : ""}
          </Texto>
          <Texto variante="tenue">{v.ubicacion?.publica}</Texto>
          <Texto variante="tenue">
            {v.genero ? tEtiquetas(claveGenero(v.genero)) : ""}
            {v.genero === "otro" && v.generoDescripcion.trim() ? ` · ${v.generoDescripcion.trim()}` : ""}
          </Texto>
        </>,
      )}
      {bloque(2, <Texto variante="tenue">{tPasos("fotos", { n: fotos.length })}</Texto>)}
      {bloque(
        3,
        <>
          <Texto variante="tenue" numberOfLines={3}>
            {v.experiencia.trim() || sinCompletar}
          </Texto>
          <Texto variante="tenue" numberOfLines={3}>
            {v.formacion.trim() || sinCompletar}
          </Texto>
        </>,
      )}
      {bloque(
        4,
        <>
          <Texto variante="tenue">
            {v.habilidades.length > 0 ? v.habilidades.map((h) => etiquetaHabilidad(h, tEtiquetas)).join(" · ") : sinCompletar}
          </Texto>
          {!!v.videoreelUrl && (
            <Texto variante="tenue" numberOfLines={1}>
              {v.videoreelUrl}
            </Texto>
          )}
          {Object.keys(validarRedes(v.redes).redes).length > 0 && (
            <Texto variante="tenue">
              {Object.keys(validarRedes(v.redes).redes)
                .map((c) => tEtiquetas(claveRed(c as ClaveRed)))
                .join(" · ")}
            </Texto>
          )}
          {!v.apareceEnBuscador && <Texto variante="tenue">{t("ocultarPerfil")}</Texto>}
        </>,
      )}
      {bloque(
        5,
        <Texto variante="tenue">
          {v.disciplinas.length > 0
            ? v.disciplinas
                .map((d) => (d === "otro" && v.otroDetalle.trim() ? v.otroDetalle.trim() : tEtiquetas(claveDisciplina(d))))
                .join(" · ")
            : tPasos("noPorAhora")}
        </Texto>,
      )}
    </View>
  );

  const pie = errorGeneral ? <Texto variante="error">{errorGeneral}</Texto> : null;

  if (esAlta) {
    return (
      <ScrollView ref={scroll} keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 20, gap: 20 }}>
        {recuperado && (
          <Tarjeta style={{ backgroundColor: color.fondoSutil }}>
            <Texto>{t("recuperado")}</Texto>
          </Tarjeta>
        )}
        {/* El indicador de pasos (`IndicadorPasos`). */}
        <View style={{ gap: 8 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <Texto variante="chico">{tPasos("pasoDe", { n: paso, total: TOTAL_PASOS })}</Texto>
            {PASOS_OPCIONALES.has(paso) && <Texto variante="chico">{tPasos("opcional")}</Texto>}
          </View>
          <View
            accessibilityRole="progressbar"
            accessibilityValue={{ min: 1, max: TOTAL_PASOS, now: paso }}
            style={{ flexDirection: "row", gap: 4 }}
          >
            {Array.from({ length: TOTAL_PASOS }, (_, i) => (
              <View
                key={i}
                style={{ flex: 1, height: 6, borderRadius: 3, backgroundColor: i < paso ? color.accion : color.borde }}
              />
            ))}
          </View>
          <Texto variante="titulo" accessibilityRole="header">
            {tPasos(`pasos.${paso}.titulo`)}
          </Texto>
          <Texto variante="tenue">{tPasos(`pasos.${paso}.instruccion`)}</Texto>
        </View>

        {paso === 1 && fichaBasica}
        {paso === 2 && portfolio}
        {paso === 3 && experienciaYFormacion}
        {paso === 4 && (
          <View style={{ gap: 20 }}>
            <View style={{ gap: 8 }}>
              <Rotulo>{tPasos("habilidades")}</Rotulo>
              {habilidades}
            </View>
            {videoreel}
            {redes}
            {visibilidad}
          </View>
        )}
        {paso === 5 && creador}
        {paso === TOTAL_PASOS && resumen}

        {pie}
        <View style={{ gap: 8 }}>
          {paso < TOTAL_PASOS ? (
            <Boton key="siguiente" onPress={avanzar}>
              {tPasos("siguiente")}
            </Boton>
          ) : (
            <Boton key="completar" onPress={guardar} cargando={cargando}>
              {t("completar")}
            </Boton>
          )}
          {paso > 1 && (
            <Boton variante="fantasma" onPress={() => irAPaso(paso - 1)} disabled={cargando}>
              {tPasos("atras")}
            </Boton>
          )}
          <Texto variante="chico" style={{ textAlign: "center" }}>
            {tPasos("seGuarda")}
          </Texto>
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView ref={scroll} keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 20, gap: 24 }}>
      {fichaBasica}
      {portfolio}
      {videoreel}
      <View style={{ gap: 12 }}>
        <Rotulo>{t("cvHabilidades")}</Rotulo>
        {experienciaYFormacion}
        {habilidades}
      </View>
      {redes}
      {visibilidad}
      {datosCreador && <View style={{ borderTopWidth: 1, borderTopColor: color.borde, paddingTop: 20 }}>{creador}</View>}
      {pie}
      {guardado && <Texto style={{ color: color.exito }}>{tUi("avisoGuardado")}</Texto>}
      <Boton onPress={guardar} cargando={cargando}>
        {t("guardarCambios")}
      </Boton>
    </ScrollView>
  );
}
