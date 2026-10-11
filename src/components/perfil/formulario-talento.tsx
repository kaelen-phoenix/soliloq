"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { reportarErrorSupabase } from "@/lib/observabilidad";
import { AvisoGuardado, useAvisoGuardado } from "@/components/ui/aviso-guardado";
import { Boton } from "@/components/ui/boton";
import { CampoTexto } from "@/components/ui/campo-texto";
import { CampoUbicacion } from "@/components/ui/campo-ubicacion";
import { ToggleVisibilidad } from "@/components/ui/toggle-visibilidad";
import {
  CamposCreador,
  validarCreador,
  type DatosCreador,
} from "@/components/perfil/formulario-creador";
import {
  GENEROS,
  HABILIDADES,
  MAX_GENERO_DESCRIPCION,
  REDES,
  calcularEdad,
  claveDisciplina,
  claveGenero,
  claveRed,
  etiquetaHabilidad,
  type ClaveRed,
  type Genero,
} from "@/lib/constantes";
import type { DisciplinaArtistica, Json } from "@/lib/supabase/types";
import { validarRedes } from "@/lib/redes";
import { aColumnas, desdeColumnas, unidadPorPais, type Ubicacion } from "@/lib/ubicacion";
import { esVideoreelValido } from "@/lib/videoreel";
import { formatearMientrasSeEscribe, isoATexto, textoAIso } from "@/lib/fecha-escrita";
import { MejorarRedaccion } from "./mejorar-redaccion";
import { SugerirHabilidades } from "./sugerir-habilidades";
import { FOTOS_RECOMENDADAS, MIN_FOTOS, persistirFotosPendientes, SubirFotos, type FotoTalento } from "./subir-fotos";
import {
  BloqueResumen,
  IndicadorPasos,
  TOTAL_PASOS,
  erroresDelPaso,
  primerPasoConError,
} from "./pasos-alta";
import { importarFotoDeGoogle } from "@/app/(sitio)/completar-perfil/acciones";

/** Lo cargado en el alta, guardado en el teléfono (#300): en celulares con poca memoria, salir
 *  a otra app (a copiar un link, a la cámara) puede cerrar la página, y se perdía todo. Desde
 *  #383 también se guarda en la base (`borradores_perfil`) para seguir desde otro dispositivo;
 *  al volver se usa el más nuevo de los dos. */
const claveBorrador = (userId: string) => `yalope-alta-perfil-${userId}`;

// El borrador sale del navegador o de la base: se valida la forma antes de usarlo.
function esUbicacion(u: unknown): u is Ubicacion {
  const x = u as Record<string, unknown> | null;
  return (
    !!x &&
    typeof x.texto === "string" &&
    typeof x.publica === "string" &&
    typeof x.pais === "string" &&
    Number.isFinite(x.lat) &&
    Number.isFinite(x.lng)
  );
}

function esFotoPendiente(f: unknown, userId: string): f is FotoTalento {
  const x = f as Record<string, unknown> | null;
  return (
    !!x &&
    typeof x.id === "string" &&
    typeof x.storage_path === "string" &&
    x.storage_path.startsWith(`${userId}/`) &&
    Number.isInteger(x.orden) &&
    typeof x.url === "string" &&
    x.enBd === false
  );
}

interface DatosIniciales {
  nombre: string;
  /** `null` en cuentas migradas sin ese dato (issue #175): el formulario lo sigue pidiendo. */
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

/** El borrador del alta guardado en la base (#383). */
export interface BorradorAlta {
  paso: number;
  datos: unknown;
  actualizadoEn: string;
}

export function FormularioTalento({
  userId,
  esAlta,
  datosIniciales,
  fotosIniciales,
  destinoAlTerminar,
  datosCreador,
  nombreSugerido,
  conFotoGoogle = false,
  borrador,
}: {
  userId: string;
  esAlta: boolean;
  datosIniciales?: DatosIniciales;
  fotosIniciales: FotoTalento[];
  /** A dónde ir tras el alta. Por defecto la home; si venía de un enlace público, vuelve ahí. */
  destinoAlTerminar?: string;
  /** Perfil artístico de Creador, si la cuenta lo tiene: se edita y se guarda acá mismo, con
   *  el mismo botón, en vez de en un formulario aparte (#234). */
  datosCreador?: DatosCreador;
  /** Alta con Google (#303): el nombre de la cuenta, para no tener que escribirlo. */
  nombreSugerido?: string;
  /** Alta con Google con foto: se ofrece usarla como primera foto. */
  conFotoGoogle?: boolean;
  /** Alta (#383): lo que quedó guardado en la base de un intento anterior, para retomarlo. */
  borrador?: BorradorAlta | null;
}) {
  const router = useRouter();
  const t = useTranslations("perfil.formulario");
  const tPasos = useTranslations("perfil.wizard");
  const tError = useTranslations("perfil.formulario.errores");
  const tEtiquetas = useTranslations("perfil.etiquetas");
  const tCreador = useTranslations("perfil.creador");
  const [nombre, setNombre] = useState(datosIniciales?.nombre ?? nombreSugerido ?? "");
  // Lo que se escribe, «dd/mm/aaaa» (#307); se pasa a ISO al validar y guardar.
  const [fechaNacimiento, setFechaNacimiento] = useState(isoATexto(datosIniciales?.fecha_nacimiento));
  const [edadVisible, setEdadVisible] = useState(datosIniciales?.edad_visible ?? true);
  const [ubicacion, setUbicacion] = useState<Ubicacion | null>(
    desdeColumnas(datosIniciales) ?? null,
  );
  const [genero, setGenero] = useState<Genero | "">(datosIniciales?.genero ?? "");
  const [generoDescripcion, setGeneroDescripcion] = useState(
    datosIniciales?.genero_descripcion ?? "",
  );
  const [videoreelUrl, setVideoreelUrl] = useState(datosIniciales?.videoreel_url ?? "");
  const [experiencia, setExperiencia] = useState(datosIniciales?.experiencia ?? "");
  // #379: opcional y aparte de la Experiencia (estudios, escuelas, cursos, talleres…).
  const [formacion, setFormacion] = useState(datosIniciales?.formacion ?? "");
  const [habilidades, setHabilidades] = useState<string[]>(datosIniciales?.habilidades ?? []);
  // Lo que la persona tipeó, tal cual. Se normaliza recién en `validar()` / `guardar()`.
  const [redes, setRedes] = useState<Record<string, string>>(datosIniciales?.redes ?? {});
  // #285: siete campos de redes seguidos hacían el formulario interminable. Instagram (la más
  // usada) queda a la vista; el resto, detrás de «Agregar otra red», salvo que ya tenga alguna.
  const [masRedes, setMasRedes] = useState(() =>
    REDES.some((r) => r.clave !== "instagram" && !!datosIniciales?.redes?.[r.clave]),
  );
  const [apareceEnBuscador, setApareceEnBuscador] = useState(
    datosIniciales?.aparece_en_buscador ?? true,
  );
  const [fotos, setFotos] = useState<FotoTalento[]>(fotosIniciales);
  const [disciplinas, setDisciplinas] = useState<DisciplinaArtistica[]>(datosCreador?.disciplinas ?? []);
  const [otroDetalle, setOtroDetalle] = useState(datosCreador?.otro_detalle ?? "");
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [cargando, setCargando] = useState(false);
  const [guardado, setGuardado] = useAvisoGuardado();
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null);
  // #383: el alta es un asistente de `TOTAL_PASOS` pasos; al editar se ve todo junto.
  const [paso, setPaso] = useState(1);
  const [recuperado, setRecuperado] = useState(false);
  // "lista" | "trayendo" | "usada" | el mensaje de error.
  const [fotoGoogle, setFotoGoogle] = useState<string>("lista");
  const borradorLeido = useRef(!esAlta);
  // Al terminar el alta no se vuelve a guardar el borrador: lo borra la base (0112).
  const terminado = useRef(false);

  // #300 / #383: al entrar al alta se recupera lo que hubiera quedado guardado, en el teléfono
  // o en la base; el más nuevo de los dos.
  useEffect(() => {
    if (!esAlta) return;
    let local: Record<string, unknown> | null = null;
    try {
      const crudo = localStorage.getItem(claveBorrador(userId));
      local = crudo ? JSON.parse(crudo) : null;
    } catch {
      // Sin acceso al almacenamiento del navegador: queda el de la base, si hay.
    }
    const enBase =
      borrador && borrador.datos && typeof borrador.datos === "object"
        ? { ...(borrador.datos as Record<string, unknown>), paso: borrador.paso, guardadoEn: Date.parse(borrador.actualizadoEn) }
        : null;
    const momento = (b: Record<string, unknown> | null) => (typeof b?.guardadoEn === "number" ? b.guardadoEn : 0);
    const b = [local, enBase]
      .filter((x): x is Record<string, unknown> => !!x && typeof x === "object")
      .sort((x, y) => momento(y) - momento(x))[0];
    if (b) {
      if (typeof b.nombre === "string" && b.nombre) setNombre(b.nombre);
      if (typeof b.fechaNacimiento === "string") {
        // Borradores de antes de #307 la guardaban en ISO.
        setFechaNacimiento(/^\d{4}-/.test(b.fechaNacimiento) ? isoATexto(b.fechaNacimiento) : b.fechaNacimiento);
      }
      if (typeof b.edadVisible === "boolean") setEdadVisible(b.edadVisible);
      if (esUbicacion(b.ubicacion)) setUbicacion(b.ubicacion);
      if (typeof b.genero === "string") setGenero(b.genero as Genero | "");
      if (typeof b.generoDescripcion === "string") setGeneroDescripcion(b.generoDescripcion);
      if (typeof b.videoreelUrl === "string") setVideoreelUrl(b.videoreelUrl);
      if (typeof b.experiencia === "string") setExperiencia(b.experiencia);
      if (typeof b.formacion === "string") setFormacion(b.formacion);
      if (Array.isArray(b.habilidades)) setHabilidades(b.habilidades.filter((h): h is string => typeof h === "string"));
      if (b.redes && typeof b.redes === "object") setRedes(b.redes as Record<string, string>);
      if (typeof b.apareceEnBuscador === "boolean") setApareceEnBuscador(b.apareceEnBuscador);
      if (Array.isArray(b.disciplinas)) setDisciplinas(b.disciplinas.filter((d): d is DisciplinaArtistica => typeof d === "string"));
      if (typeof b.otroDetalle === "string") setOtroDetalle(b.otroDetalle);
      // Las fotos del alta ya están en Storage: alcanza con recordar dónde.
      if (Array.isArray(b.fotos)) {
        const validas = b.fotos.filter((f: unknown) => esFotoPendiente(f, userId)).slice(0, 5);
        if (validas.length > 0) setFotos(validas);
      }
      if (Number.isInteger(b.paso) && (b.paso as number) >= 1 && (b.paso as number) <= TOTAL_PASOS) {
        setPaso(b.paso as number);
      }
      // Solo se avisa si había algo cargado de verdad, no solo el nombre precargado.
      setRecuperado(!!(b.fechaNacimiento || b.ubicacion || b.genero || (Array.isArray(b.fotos) && b.fotos.length)));
    }
    borradorLeido.current = true;
    // Solo al entrar: después, lo que manda es lo que la persona va cargando.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [esAlta, userId]);

  // ...y se guarda en cada cambio: en el teléfono al instante, en la base un momento después.
  useEffect(() => {
    if (!esAlta || !borradorLeido.current || terminado.current) return;
    const datos = {
      nombre,
      fechaNacimiento,
      edadVisible,
      ubicacion,
      genero,
      generoDescripcion,
      videoreelUrl,
      experiencia,
      formacion,
      habilidades,
      redes,
      apareceEnBuscador,
      fotos,
      disciplinas,
      otroDetalle,
      paso,
      guardadoEn: Date.now(),
    };
    try {
      localStorage.setItem(claveBorrador(userId), JSON.stringify(datos));
    } catch {
      // Ídem: sin almacenamiento local queda el de la base.
    }
    const id = setTimeout(async () => {
      if (terminado.current) return;
      const { error } = await createClient()
        .from("borradores_perfil")
        .upsert({ perfil_id: userId, paso, datos: datos as unknown as Json, actualizado_en: new Date().toISOString() });
      if (error) reportarErrorSupabase(error, { tabla: "borradores_perfil" });
    }, 1000);
    return () => clearTimeout(id);
  }, [
    esAlta,
    userId,
    nombre,
    fechaNacimiento,
    edadVisible,
    ubicacion,
    genero,
    generoDescripcion,
    videoreelUrl,
    experiencia,
    formacion,
    habilidades,
    redes,
    apareceEnBuscador,
    fotos,
    disciplinas,
    otroDetalle,
    paso,
  ]);

  async function usarFotoGoogle() {
    setFotoGoogle("trayendo");
    const r = await importarFotoDeGoogle();
    if (!r.ok) return setFotoGoogle(r.error);
    setFotos((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        storage_path: r.storage_path,
        orden: prev.reduce((max, f) => Math.max(max, f.orden), -1) + 1,
        url: r.url,
        enBd: false,
      },
    ]);
    setFotoGoogle("usada");
  }

  function alternarHabilidad(h: string) {
    setHabilidades((prev) => (prev.includes(h) ? prev.filter((x) => x !== h) : [...prev, h]));
  }

  function cambiarRed(clave: ClaveRed, valor: string) {
    setRedes((prev) => ({ ...prev, [clave]: valor }));
  }

  /** Todos los errores del formulario. Las reglas son las del perfil; el alta solo las reparte. */
  function calcularErrores(): Record<string, string> {
    const nuevos: Record<string, string> = {};

    if (nombre.trim().length < 2) nuevos.nombre = tError("nombre");
    const fechaIso = textoAIso(fechaNacimiento);
    if (!fechaNacimiento) {
      nuevos.fecha_nacimiento = tError("fechaFalta");
    } else if (!fechaIso) {
      nuevos.fecha_nacimiento = tError("fechaFormato");
    } else if (calcularEdad(fechaIso) < 16) {
      nuevos.fecha_nacimiento = tError("fechaEdad");
    }
    if (!ubicacion) nuevos.ubicacion = tError("ubicacion");
    if (!genero) nuevos.genero = tError("genero");
    if (generoDescripcion.length > MAX_GENERO_DESCRIPCION) {
      nuevos.genero_descripcion = tError("maximoCaracteres", { max: MAX_GENERO_DESCRIPCION });
    }
    // El mínimo de fotos es para **completar** el perfil (el alta). Al editar no bloquea: las
    // fotos se guardan solas al subirlas o borrarlas, y trabar el resto del formulario por eso
    // dejaba a cuentas viejas sin poder guardar nada (#243). Se avisa abajo de las fotos.
    if (esAlta && fotos.length < MIN_FOTOS) nuevos.fotos = tError("fotos");
    if (videoreelUrl && !esVideoreelValido(videoreelUrl)) {
      nuevos.videoreel_url = tError("videoreel");
    }
    if (experiencia.length > 2000) nuevos.experiencia = tError("maximoCaracteres", { max: 2000 });
    if (formacion.length > 2000) nuevos.formacion = tError("maximoCaracteres", { max: 2000 });

    const { errores: erroresRedes } = validarRedes(redes, tEtiquetas);
    for (const [clave, mensaje] of Object.entries(erroresRedes)) {
      nuevos[`redes_${clave}`] = mensaje;
    }

    if (datosCreador || esAlta) {
      Object.assign(
        nuevos,
        validarCreador(disciplinas, otroDetalle, {
          // En el alta es opcional (#383): se puede seguir sin elegir ninguna.
          exigirUna: !!datosCreador && datosCreador.disciplinas.length > 0,
          t: tCreador,
        }),
      );
    }
    return nuevos;
  }

  /** Lleva la pantalla hasta el primer campo marcado (#243). */
  function mostrarPrimerError() {
    requestAnimationFrame(() =>
      document
        .querySelector("[data-formulario-talento] .text-error-600")
        ?.scrollIntoView({ behavior: "smooth", block: "center" }),
    );
  }

  function irAPaso(n: number) {
    setErrores({});
    setErrorGeneral(null);
    setPaso(n);
    requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: "smooth" }));
  }

  /** «Siguiente»: solo frena si falta algo obligatorio (o hay algo mal) en este paso. */
  function avanzar() {
    const delPaso = erroresDelPaso(calcularErrores(), paso);
    setErrores(delPaso);
    if (Object.keys(delPaso).length > 0) {
      setErrorGeneral(tError("revisar"));
      mostrarPrimerError();
      return;
    }
    irAPaso(Math.min(paso + 1, TOTAL_PASOS));
  }

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    // En el alta, Enter en un campo es «Siguiente» hasta el último paso.
    if (esAlta && paso < TOTAL_PASOS) return avanzar();
    setErrorGeneral(null);
    setGuardado(false);
    const nuevos = calcularErrores();
    setErrores(nuevos);
    if (Object.keys(nuevos).length > 0) {
      // En el alta se vuelve al paso que tiene el problema; al editar, el error puede estar
      // lejos del botón (arriba, en las fotos o la fecha): se avisa acá y se lleva la pantalla.
      if (esAlta) {
        const pasoConError = primerPasoConError(nuevos);
        if (pasoConError) {
          setPaso(pasoConError);
          setErrores(erroresDelPaso(nuevos, pasoConError));
        }
      }
      setErrorGeneral(tError("revisar"));
      mostrarPrimerError();
      return;
    }

    setCargando(true);
    const supabase = createClient();

    const campos = {
      nombre: nombre.trim(),
      fecha_nacimiento: textoAIso(fechaNacimiento)!,
      edad_visible: edadVisible,
      ...aColumnas(ubicacion!),
      genero: genero as Genero,
      genero_descripcion: genero === "otro" ? generoDescripcion.trim() || null : null,
      videoreel_url: videoreelUrl || null,
      experiencia: experiencia || null,
      formacion: formacion.trim() ? formacion : null,
      habilidades,
      redes: validarRedes(redes).redes,
      aparece_en_buscador: apareceEnBuscador,
    };

    // La unidad se deriva del país **solo al crear el perfil**. Al editar no se toca: quien
    // se mudó de Chicago a Berlín puede seguir pensando en millas.
    if (esAlta) terminado.current = true;
    const { error } = esAlta
      ? await supabase.from("perfiles_talento").insert({
          id: userId,
          ...campos,
          unidad_distancia: unidadPorPais(ubicacion!.pais),
        })
      : await supabase.from("perfiles_talento").update(campos).eq("id", userId);

    if (error) {
      terminado.current = false;
      setCargando(false);
      setErrorGeneral(tError("guardar"));
      return;
    }

    if (esAlta) {
      // Recién ahora existe la fila de `perfiles_talento` que exige la FK de las fotos.
      await persistirFotosPendientes(userId, fotos);
      // #383: si en el paso «¿También armás proyectos?» eligió disciplinas, queda su perfil
      // de Creador. Si no, se activa solo al crear el primer Proyecto o Equipo (0075).
      if (disciplinas.length > 0) {
        const { error: errorCreador } = await supabase.from("perfiles_creador").upsert({
          id: userId,
          disciplinas,
          otro_detalle: disciplinas.includes("otro") ? otroDetalle.trim() : null,
        });
        if (errorCreador) reportarErrorSupabase(errorCreador, { tabla: "perfiles_creador", alta: true });
      }
      try {
        localStorage.removeItem(claveBorrador(userId));
      } catch {
        // Nada que limpiar.
      }
      // La base lo borra sola al crear el perfil (0112); esto cubre un guardado del borrador que
      // haya salido justo antes y llegado después.
      await supabase.from("borradores_perfil").delete().eq("perfil_id", userId);
      await supabase
        .from("perfiles")
        .update({ onboarding_completo: true })
        .eq("id", userId);
      router.replace(destinoAlTerminar ?? "/");
      router.refresh();
      // No se apaga `cargando`: la navegación desmonta el formulario, y apagarlo acá haría
      // parpadear el botón a "Guardar" durante el viaje.
      return;
    }

    if (datosCreador) {
      const { error: errorCreador } = await supabase
        .from("perfiles_creador")
        .update({
          disciplinas,
          // El detalle solo se guarda si "Otro" sigue elegido: si la persona lo desmarca, el
          // texto tiene que irse con él en vez de quedar colgado sin nada que lo explique.
          otro_detalle: disciplinas.includes("otro") ? otroDetalle.trim() : null,
        })
        .eq("id", userId);
      if (errorCreador) {
        setCargando(false);
        setErrorGeneral(tError("guardarCreador"));
        return;
      }
    }

    // Editar no navega: este formulario ya vive en `/perfil`, así que el `router.replace`
    // que había acá era a la misma ruta y no desmontaba nada. `cargando` quedaba en `true`
    // para siempre y el botón se quedaba grisado — no se podía volver a editar sin recargar.
    router.refresh();
    setCargando(false);
    setGuardado(true);
  }

  // ── Las partes del formulario. Al editar se ven todas juntas; en el alta, una por paso. ──

  const fichaBasica = (
    <section className="flex flex-col gap-4">
      {!esAlta && (
        <h2 className="text-2xs font-medium uppercase tracking-wide text-texto-tenue">{t("fichaBasica")}</h2>
      )}
      <CampoTexto
        id="nombre"
        etiqueta={t("nombre")}
        value={nombre}
        onChange={(e) => setNombre(e.target.value)}
        error={errores.nombre}
      />
      <div className="flex flex-col gap-1.5">
        <CampoTexto
          id="fecha_nacimiento"
          etiqueta={t("fechaNacimiento")}
          inputMode="numeric"
          autoComplete="bday"
          placeholder={t("fechaPlaceholder")}
          maxLength={10}
          value={fechaNacimiento}
          onChange={(e) => setFechaNacimiento(formatearMientrasSeEscribe(e.target.value))}
          error={errores.fecha_nacimiento}
        />
        <ToggleVisibilidad
          visible={edadVisible}
          onCambio={setEdadVisible}
          textoVisible={t("edadVisible")}
          textoOculto={t("edadOculta")}
        />
        <p className="text-xs text-texto-tenue">
          {t("fechaAyuda")}
        </p>
      </div>
      <CampoUbicacion
        id="ubicacion"
        etiqueta={t("ubicacion")}
        valor={ubicacion}
        onCambio={setUbicacion}
        error={errores.ubicacion}
      />
      <p className="-mt-2 text-xs text-texto-tenue">
        {t("ubicacionAyuda")}
      </p>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="genero" className="text-sm font-medium text-texto">
          {t("genero")}
        </label>
        <select
          id="genero"
          value={genero}
          onChange={(e) => setGenero(e.target.value as Genero | "")}
          className={`rounded-xl border bg-superficie px-3.5 py-2.5 text-base text-texto focus:border-accion ${
            errores.genero ? "border-error-400" : "border-borde"
          }`}
        >
          <option value="">{t("elegiUnaOpcion")}</option>
          {GENEROS.map((g) => (
            <option key={g.valor} value={g.valor}>
              {tEtiquetas(claveGenero(g.valor))}
            </option>
          ))}
        </select>
        {errores.genero && <p className="text-xs text-error-600">{errores.genero}</p>}
      </div>

      {/* #311: la aclaración solo si eligió «Otro» (antes era un «Cómo te identificás»
          para todos, que no sonaba a perfil profesional). */}
      {genero === "otro" && (
        <CampoTexto
          id="genero_descripcion"
          etiqueta={t("generoCual")}
          maxLength={MAX_GENERO_DESCRIPCION}
          value={generoDescripcion}
          onChange={(e) => setGeneroDescripcion(e.target.value)}
          error={errores.genero_descripcion}
        />
      )}
    </section>
  );

  const portfolio = (
    <section className="flex flex-col gap-3">
      {!esAlta && (
        <h2 className="text-2xs font-medium uppercase tracking-wide text-texto-tenue">{t("portfolio")}</h2>
      )}
      {esAlta && conFotoGoogle && fotoGoogle !== "usada" && (
        <div className="flex flex-col gap-1">
          <button
            type="button"
            onClick={usarFotoGoogle}
            disabled={fotoGoogle === "trayendo"}
            className="self-start rounded-full border border-borde px-3.5 py-1.5 text-sm font-medium text-texto transition-colors hover:bg-fondo-sutil disabled:opacity-50"
          >
            {fotoGoogle === "trayendo" ? t("trayendoFoto") : t("usarFotoGoogle")}
          </button>
          {fotoGoogle !== "lista" && fotoGoogle !== "trayendo" && (
            <p className="text-xs text-error-600">{fotoGoogle}</p>
          )}
        </div>
      )}
      <SubirFotos talentoId={userId} fotos={fotos} onCambio={setFotos} persistir={!esAlta} />
      {errores.fotos && <p className="text-xs text-error-600">{errores.fotos}</p>}
      {fotos.length > 0 && fotos.length < FOTOS_RECOMENDADAS && (
        <p className="text-xs text-alerta-800">
          {t("fotosRecomendadas", { n: FOTOS_RECOMENDADAS })}
        </p>
      )}
    </section>
  );

  const campoExperiencia = (
    <div className="flex flex-col gap-1.5">
      <label htmlFor="experiencia" className="text-sm font-medium text-texto">
        {t("experiencia")}
      </label>
      <textarea
        id="experiencia"
        rows={5}
        maxLength={2000}
        value={experiencia}
        onChange={(e) => setExperiencia(e.target.value)}
        className="rounded-xl border border-borde bg-superficie px-3.5 py-2.5 text-base text-texto outline-none focus:border-accion"
        placeholder={t("experienciaPlaceholder")}
      />
      <p className="text-right text-xs text-texto-tenue">{experiencia.length}/2000</p>
      <MejorarRedaccion texto={experiencia} onUsar={setExperiencia} />
    </div>
  );

  const campoFormacion = (
    <div className="flex flex-col gap-1.5">
      <label htmlFor="formacion" className="text-sm font-medium text-texto">
        {t("formacion")} <span className="font-normal text-texto-tenue">{t("opcional")}</span>
      </label>
      <textarea
        id="formacion"
        rows={4}
        maxLength={2000}
        value={formacion}
        onChange={(e) => setFormacion(e.target.value)}
        className="rounded-xl border border-borde bg-superficie px-3.5 py-2.5 text-base text-texto outline-none focus:border-accion"
        placeholder={t("formacionPlaceholder")}
      />
      <p className="text-right text-xs text-texto-tenue">{formacion.length}/2000</p>
      {errores.formacion && <p className="text-xs text-error-600">{errores.formacion}</p>}
    </div>
  );

  const campoHabilidades = (
    <>
      <div className="flex flex-wrap gap-2">
        {HABILIDADES.map((h) => (
          <button
            key={h}
            type="button"
            onClick={() => alternarHabilidad(h)}
            className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${
              habilidades.includes(h)
                ? "border-accion bg-accion text-accion-texto"
                : "border-borde text-texto-tenue"
            }`}
          >
            {etiquetaHabilidad(h, tEtiquetas)}
          </button>
        ))}
      </div>
      <SugerirHabilidades experiencia={experiencia} marcadas={habilidades} onMarcar={setHabilidades} />
    </>
  );

  const seccionVideoreel = (
    <section className="flex flex-col gap-4">
      <h2 className="text-2xs font-medium uppercase tracking-wide text-texto-tenue">{t("videoreel")}</h2>
      <CampoTexto
        id="videoreel"
        etiqueta={t("videoreelEtiqueta")}
        placeholder={t("videoreelPlaceholder")}
        value={videoreelUrl}
        onChange={(e) => setVideoreelUrl(e.target.value)}
        error={errores.videoreel_url}
      />
      <p className="-mt-2 text-xs text-texto-tenue">
        {t("videoreelAyuda")}
      </p>
    </section>
  );

  const seccionRedes = (
    <section className="flex flex-col gap-4">
      <h2 className="text-2xs font-medium uppercase tracking-wide text-texto-tenue">{t("redes")}</h2>
      {REDES.filter(
        (red) => masRedes || red.clave === "instagram" || !!redes[red.clave] || !!errores[`redes_${red.clave}`],
      ).map((red) => (
        <CampoTexto
          key={red.clave}
          id={`red_${red.clave}`}
          etiqueta={tEtiquetas(claveRed(red.clave))}
          placeholder={red.clave === "sitio" ? t("sitioPlaceholder") : t("redPlaceholder")}
          value={redes[red.clave] ?? ""}
          onChange={(e) => cambiarRed(red.clave, e.target.value)}
          error={errores[`redes_${red.clave}`]}
        />
      ))}
      {!masRedes && (
        <button
          type="button"
          onClick={() => setMasRedes(true)}
          className="self-start text-sm font-medium text-texto-tenue underline hover:text-texto"
        >
          {t("agregarRed")}
        </button>
      )}
    </section>
  );

  const seccionVisibilidad = (
    <section className="flex flex-col gap-3">
      <h2 className="text-2xs font-medium uppercase tracking-wide text-texto-tenue">{t("visibilidad")}</h2>
      {/* #265: se tilda para ocultarse. En la base sigue siendo `aparece_en_buscador`
          (invertido); 0090 lo aplica a todo contacto nuevo, no solo al buscador. */}
      <label className="flex items-start gap-3">
        <input
          type="checkbox"
          checked={!apareceEnBuscador}
          onChange={(e) => setApareceEnBuscador(!e.target.checked)}
          className="mt-0.5 h-4 w-4 rounded border-ink-300 text-texto focus:ring-accion"
        />
        <span className="text-sm text-texto">
          {t("ocultarPerfil")}
          <span className="mt-0.5 block text-xs text-texto-tenue">
            {t("ocultarPerfilAyuda")}
          </span>
        </span>
      </label>
    </section>
  );

  const camposCreador = (
    <CamposCreador
      disciplinas={disciplinas}
      setDisciplinas={setDisciplinas}
      otroDetalle={otroDetalle}
      setOtroDetalle={setOtroDetalle}
      errores={errores}
    />
  );

  /** El último paso del alta: todo lo cargado, con «Editar» para volver a cada paso. */
  function resumen() {
    const sinCompletar = <span className="text-texto-tenue">{tPasos("sinCompletar")}</span>;
    const redesCargadas = Object.entries(validarRedes(redes).redes);
    return (
      <div className="flex flex-col gap-3">
        <BloqueResumen titulo={tPasos("pasos.1.titulo")} onEditar={() => irAPaso(1)}>
          <p className="font-medium">{nombre.trim()}</p>
          <p>
            {fechaNacimiento}
            {!edadVisible && <span className="text-texto-tenue"> · {t("edadOculta")}</span>}
          </p>
          <p>{ubicacion?.publica}</p>
          <p>
            {genero ? tEtiquetas(claveGenero(genero)) : ""}
            {genero === "otro" && generoDescripcion.trim() ? ` · ${generoDescripcion.trim()}` : ""}
          </p>
        </BloqueResumen>
        <BloqueResumen titulo={tPasos("pasos.2.titulo")} onEditar={() => irAPaso(2)}>
          <p>{tPasos("fotos", { n: fotos.length })}</p>
          <div className="flex flex-wrap gap-2">
            {[...fotos]
              .sort((a, b) => a.orden - b.orden)
              .map((f) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={f.id} src={f.url} alt="" className="h-14 w-14 rounded-lg object-cover" />
              ))}
          </div>
        </BloqueResumen>
        <BloqueResumen titulo={tPasos("pasos.3.titulo")} onEditar={() => irAPaso(3)}>
          <p className="text-xs font-medium text-texto-tenue">{t("experiencia")}</p>
          <p className="line-clamp-3 whitespace-pre-line">{experiencia.trim() || sinCompletar}</p>
          <p className="mt-1 text-xs font-medium text-texto-tenue">{t("formacion")}</p>
          <p className="line-clamp-3 whitespace-pre-line">{formacion.trim() || sinCompletar}</p>
        </BloqueResumen>
        <BloqueResumen titulo={tPasos("pasos.4.titulo")} onEditar={() => irAPaso(4)}>
          <p>
            {habilidades.length > 0 ? habilidades.map((h) => etiquetaHabilidad(h, tEtiquetas)).join(" · ") : sinCompletar}
          </p>
          {videoreelUrl && <p className="truncate">{videoreelUrl}</p>}
          {redesCargadas.length > 0 && (
            <p>{redesCargadas.map(([clave]) => tEtiquetas(claveRed(clave as ClaveRed))).join(" · ")}</p>
          )}
          {!apareceEnBuscador && <p className="text-texto-tenue">{t("ocultarPerfil")}</p>}
        </BloqueResumen>
        <BloqueResumen titulo={tPasos("pasos.5.titulo")} onEditar={() => irAPaso(5)}>
          <p>
            {disciplinas.length > 0
              ? disciplinas.map((d) => (d === "otro" && otroDetalle.trim() ? otroDetalle.trim() : tEtiquetas(claveDisciplina(d)))).join(" · ")
              : tPasos("noPorAhora")}
          </p>
        </BloqueResumen>
      </div>
    );
  }

  if (esAlta) {
    return (
      <form onSubmit={guardar} data-formulario-talento className="flex max-w-2xl flex-col gap-6">
        {recuperado && (
          <p className="rounded-xl border border-borde bg-fondo-sutil px-3.5 py-2.5 text-sm text-texto">
            {t("recuperado")}
          </p>
        )}
        <IndicadorPasos paso={paso} />

        {paso === 1 && fichaBasica}
        {paso === 2 && portfolio}
        {paso === 3 && (
          <section className="flex flex-col gap-4">
            {campoExperiencia}
            {campoFormacion}
          </section>
        )}
        {paso === 4 && (
          <>
            <section className="flex flex-col gap-3">
              <h2 className="text-2xs font-medium uppercase tracking-wide text-texto-tenue">{tPasos("habilidades")}</h2>
              {campoHabilidades}
            </section>
            {seccionVideoreel}
            {seccionRedes}
            {seccionVisibilidad}
          </>
        )}
        {paso === 5 && <section className="flex flex-col gap-3">{camposCreador}</section>}
        {paso === TOTAL_PASOS && resumen()}

        {errorGeneral && <p className="text-sm text-error-600">{errorGeneral}</p>}

        <div className="flex flex-col gap-2">
          {/* Las `key` hacen que sean dos botones distintos y no uno que cambia de tipo: si
              no, al tocar «Siguiente» en el paso 5 el botón pasaba a `submit` dentro del mismo
              click y el perfil se completaba sin pasar por «Revisá y confirmá». */}
          {paso < TOTAL_PASOS ? (
            <Boton key="siguiente" type="button" onClick={avanzar}>
              {tPasos("siguiente")}
            </Boton>
          ) : (
            <Boton key="completar" type="submit" cargando={cargando}>
              {t("completar")}
            </Boton>
          )}
          {paso > 1 && (
            <Boton type="button" variante="fantasma" onClick={() => irAPaso(paso - 1)} disabled={cargando}>
              {tPasos("atras")}
            </Boton>
          )}
          <p className="text-center text-xs text-texto-tenue">{tPasos("seGuarda")}</p>
        </div>
      </form>
    );
  }

  return (
    <form onSubmit={guardar} data-formulario-talento className="flex max-w-2xl flex-col gap-6">
      {fichaBasica}
      {portfolio}
      {seccionVideoreel}

      <section className="flex flex-col gap-3">
        <h2 className="text-2xs font-medium uppercase tracking-wide text-texto-tenue">{t("cvHabilidades")}</h2>
        {campoExperiencia}
        {campoFormacion}
        {campoHabilidades}
      </section>

      {seccionRedes}
      {seccionVisibilidad}

      {datosCreador && <section className="border-t border-borde pt-6">{camposCreador}</section>}

      {errorGeneral && <p className="text-sm text-error-600">{errorGeneral}</p>}
      <AvisoGuardado visible={guardado} />

      <Boton type="submit" cargando={cargando}>
        {t("guardarCambios")}
      </Boton>
    </form>
  );
}
