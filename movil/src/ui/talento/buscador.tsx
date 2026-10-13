import Ionicons from "@expo/vector-icons/Ionicons";
import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Pressable, View } from "react-native";
import { useTranslations } from "use-intl";
import { claveGenero, etiquetaHabilidad, GENEROS_BUSCABLES, HABILIDADES, type Genero } from "@/lib/constantes";
import {
  filtrosAvanzadosActivos,
  hayFiltrosTalento,
  PAGINA_TALENTO,
  parametrosBuscarTalento,
  type FiltrosTalento,
} from "@/lib/matches";
import { opcionesDeRadio, RADIO_INICIAL_METROS, type Ubicacion } from "@/lib/ubicacion";
import { supabase } from "~/lib/supabase";
import { Opciones, Tarjeta } from "../basicos";
import { Boton } from "../boton";
import { Campo } from "../campo";
import { CampoUbicacion } from "../perfil/campo-ubicacion";
import { Texto } from "../texto";
import { fuente, radio, useColores } from "../tema";
import { urlFoto } from "./datos";
import { PilaTalentos, type IniciativaPlaca, type ResultadoTalento } from "./pila-talentos";
import * as Crypto from "expo-crypto";
import { llamarApi } from "~/lib/api";
import { useIdioma } from "~/lib/intl";
import { useIa } from "~/ui/ia";

const VACIOS: FiltrosTalento = {
  texto: "",
  edadMin: "",
  edadMax: "",
  generos: [],
  habilidades: [],
  ubicacion: null,
  radioMetros: RADIO_INICIAL_METROS,
};

function Chips({ valores, elegidos, etiqueta, onAlternar }: {
  valores: readonly string[];
  elegidos: string[];
  etiqueta: (v: string) => string;
  onAlternar: (v: string) => void;
}) {
  const color = useColores();
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
      {valores.map((v) => {
        const si = elegidos.includes(v);
        return (
          <Pressable
            key={v}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: si }}
            onPress={() => onAlternar(v)}
            style={{
              borderRadius: radio.pildora,
              borderWidth: 1,
              borderColor: si ? color.accion : color.borde,
              backgroundColor: si ? color.accion : "transparent",
              paddingHorizontal: 12,
              paddingVertical: 7,
            }}
          >
            <Texto style={{ fontSize: 14, color: si ? color.accionTexto : color.textoTenue }}>{etiqueta(v)}</Texto>
          </Pressable>
        );
      })}
    </View>
  );
}

/**
 * Buscar talento (#124, #294), como `BuscadorTalento` de la web: por nombre, habilidad o
 * experiencia, y filtros de edad, género, habilidades y zona; los resultados van a la pila.
 * «Describí a quién buscás» (IA, #321) llega a la app en #395.
 */
export function Buscador({ iniciativa }: { iniciativa: IniciativaPlaca }) {
  const t = useTranslations("proyectos.buscador");
  const tc = useTranslations("comun");
  const tEtiquetas = useTranslations("perfil.etiquetas");
  const color = useColores();
  const [f, setF] = useState<FiltrosTalento>(VACIOS);
  const poner = <K extends keyof FiltrosTalento>(k: K, v: FiltrosTalento[K]) => setF((p) => ({ ...p, [k]: v }));
  const [verFiltros, setVerFiltros] = useState(false);
  const [resultados, setResultados] = useState<ResultadoTalento[]>([]);
  const [offset, setOffset] = useState(0);
  const [hayMas, setHayMas] = useState(false);
  const [cargando, setCargando] = useState(true);
  // Cada búsqueda lleva un número; una respuesta vieja que llega tarde se descarta.
  const corrida = useRef(0);

  const buscar = useCallback(
    async (nuevoOffset: number) => {
      const esta = ++corrida.current;
      setCargando(true);
      const { data, error } = await supabase.rpc("buscar_talento", parametrosBuscarTalento(f, iniciativa, nuevoOffset));
      if (esta !== corrida.current) return;
      const filas: ResultadoTalento[] = (error ? [] : (data ?? [])).map((r) => ({
        id: r.id,
        nombre: r.nombre,
        edad: r.edad,
        ubicacion_publica: r.ubicacion_publica,
        habilidades: r.habilidades ?? [],
        fotoUrl: urlFoto(r.foto_principal_path),
      }));
      setResultados((prev) => (nuevoOffset === 0 ? filas : [...prev, ...filas]));
      setOffset(nuevoOffset);
      setHayMas(filas.length === PAGINA_TALENTO);
      setCargando(false);
    },
    [f, iniciativa],
  );

  // Cambiar cualquier filtro reinicia la búsqueda desde el principio.
  useEffect(() => {
    const id = setTimeout(() => buscar(0), 250);
    return () => clearTimeout(id);
  }, [buscar]);

  const alternar = (k: "generos" | "habilidades", v: string) =>
    setF((p) => {
      const lista = p[k] as string[];
      return { ...p, [k]: lista.includes(v) ? lista.filter((x) => x !== v) : [...lista, v] };
    });

  // #321: «Describí a quién buscás» → los mismos filtros de abajo, a la vista para corregirlos.
  const ia = useIa();
  const { idioma } = useIdioma();
  const [consulta, setConsulta] = useState("");
  const [interpretando, setInterpretando] = useState(false);
  const [avisoConsulta, setAvisoConsulta] = useState<string | null>(null);

  async function aplicarConsulta() {
    if (interpretando || consulta.trim().length < 3) return;
    setInterpretando(true);
    setAvisoConsulta(null);
    const r = await ia.busqueda(consulta);
    if (!r.ok) {
      setInterpretando(false);
      return setAvisoConsulta(r.mensaje);
    }
    const filtros = r.filtros;
    // La zona anterior no puede quedar aplicada si la nueva no se encuentra.
    let ubicacion: Ubicacion | null = null;
    if (filtros.zona) {
      const sesion = Crypto.randomUUID();
      const lugares = await llamarApi<{ sugerencias: { id: string }[] }>("ubicacion", { accion: "buscar", texto: filtros.zona, sesion, idioma });
      const primera = lugares.ok ? lugares.sugerencias[0] : undefined;
      if (primera) {
        const lugar = await llamarApi<{ ubicacion: Ubicacion }>("ubicacion", { accion: "resolver", id: primera.id, sesion, idioma });
        if (lugar.ok) ubicacion = lugar.ubicacion;
      }
    }
    setF((p) => ({
      ...p,
      edadMin: filtros.edadMin ? String(filtros.edadMin) : "",
      edadMax: filtros.edadMax ? String(filtros.edadMax) : "",
      generos: (filtros.generos ?? []) as Genero[],
      habilidades: filtros.habilidades ?? [],
      texto: filtros.texto ?? "",
      ubicacion,
    }));
    setVerFiltros(true);
    setAvisoConsulta(filtros.zona && !ubicacion ? t("filtrosSinZona", { zona: filtros.zona }) : t("filtrosAplicados"));
    setInterpretando(false);
  }

  const nAvanzados = filtrosAvanzadosActivos(f);
  const opcionesRadio = opcionesDeRadio("km", tEtiquetas);

  return (
    <View style={{ gap: 20 }}>
      <View style={{ gap: 8 }}>
        <Campo
          etiqueta={t("describi")}
          placeholder={t("describiPlaceholder")}
          value={consulta}
          onChangeText={setConsulta}
          maxLength={300}
          onSubmitEditing={aplicarConsulta}
          returnKeyType="search"
        />
        <Boton variante="secundario" onPress={aplicarConsulta} cargando={interpretando} disabled={consulta.trim().length < 3}>
          {tc("buscar")}
        </Boton>
        {avisoConsulta && <Texto variante="chico">{avisoConsulta}</Texto>}
      </View>
      <Tarjeta style={{ backgroundColor: color.fondoSutil }}>
        <Campo
          etiqueta={tc("buscar")}
          placeholder={t("buscarPlaceholder")}
          value={f.texto}
          onChangeText={(v) => poner("texto", v)}
          autoCorrect={false}
        />
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ expanded: verFiltros }}
            onPress={() => setVerFiltros((v) => !v)}
            style={{ flexDirection: "row", alignItems: "center", gap: 6 }}
          >
            <Texto variante="tenue" style={{ fontFamily: fuente.media }}>{t("filtros")}</Texto>
            {nAvanzados > 0 && (
              <View style={{ borderRadius: radio.pildora, backgroundColor: color.accion, paddingHorizontal: 6 }}>
                <Texto style={{ fontSize: 11, fontFamily: fuente.semi, color: color.accionTexto }}>{nAvanzados}</Texto>
              </View>
            )}
            <Ionicons name={verFiltros ? "chevron-up" : "chevron-down"} size={14} color={color.textoTenue} />
          </Pressable>
          {hayFiltrosTalento(f) && (
            <Texto variante="chico" style={{ textDecorationLine: "underline" }} onPress={() => setF(VACIOS)}>
              {t("limpiar")}
            </Texto>
          )}
        </View>

        {verFiltros && (
          <View style={{ gap: 16 }}>
            <View style={{ flexDirection: "row", gap: 12 }}>
              <View style={{ flex: 1 }}>
                <Campo etiqueta={t("edadMinima")} keyboardType="number-pad" value={f.edadMin} onChangeText={(v) => poner("edadMin", v.replace(/\D/g, ""))} />
              </View>
              <View style={{ flex: 1 }}>
                <Campo etiqueta={t("edadMaxima")} keyboardType="number-pad" value={f.edadMax} onChangeText={(v) => poner("edadMax", v.replace(/\D/g, ""))} />
              </View>
            </View>
            <View style={{ gap: 6 }}>
              <Texto style={{ fontFamily: fuente.media, fontSize: 15 }}>{t("genero")}</Texto>
              <Chips
                valores={GENEROS_BUSCABLES.map((g) => g.valor)}
                elegidos={f.generos}
                etiqueta={(g) => tEtiquetas(claveGenero(g as Genero))}
                onAlternar={(g) => alternar("generos", g)}
              />
            </View>
            <View style={{ gap: 6 }}>
              <Texto style={{ fontFamily: fuente.media, fontSize: 15 }}>{t("habilidades")}</Texto>
              <Chips valores={HABILIDADES} elegidos={f.habilidades} etiqueta={(h) => etiquetaHabilidad(h, tEtiquetas)} onAlternar={(h) => alternar("habilidades", h)} />
            </View>
            <CampoUbicacion etiqueta={t("cercaDe")} valor={f.ubicacion} onCambio={(u) => poner("ubicacion", u)} />
            {f.ubicacion && (
              <View style={{ gap: 6 }}>
                <Texto variante="chico" style={{ fontFamily: fuente.media }}>{t("radio")}</Texto>
                <Opciones<string>
                  valor={String(f.radioMetros)}
                  onElegir={(v) => poner("radioMetros", v === "null" ? null : Number(v))}
                  opciones={opcionesRadio.map((o) => ({ valor: String(o.metros), etiqueta: o.etiqueta }))}
                />
              </View>
            )}
          </View>
        )}
      </Tarjeta>

      {cargando && resultados.length === 0 ? (
        <View accessibilityLabel={t("buscando")} style={{ paddingVertical: 40, alignItems: "center" }}>
          <ActivityIndicator color={color.texto} />
        </View>
      ) : resultados.length === 0 ? (
        <View style={{ alignItems: "center", gap: 6, paddingVertical: 24 }}>
          <Ionicons name="search-outline" size={28} color={color.textoTenue} />
          <Texto variante="subtitulo">{t("vacioTitulo")}</Texto>
          <Texto variante="tenue" style={{ textAlign: "center" }}>{t("vacioDetalle")}</Texto>
        </View>
      ) : (
        <PilaTalentos
          talentos={resultados}
          iniciativa={iniciativa}
          onCasiVacia={() => {
            if (hayMas && !cargando) buscar(offset + PAGINA_TALENTO);
          }}
        />
      )}
    </View>
  );
}
