"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
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
  type ClaveRed,
  type Genero,
} from "@/lib/constantes";
import { validarRedes } from "@/lib/redes";
import { aColumnas, desdeColumnas, unidadPorPais, type Ubicacion } from "@/lib/ubicacion";
import { esVideoreelValido } from "@/lib/videoreel";
import { formatearMientrasSeEscribe, isoATexto, textoAIso } from "@/lib/fecha-escrita";
import { MejorarRedaccion } from "./mejorar-redaccion";
import { SugerirHabilidades } from "./sugerir-habilidades";
import { FOTOS_RECOMENDADAS, MIN_FOTOS, persistirFotosPendientes, SubirFotos, type FotoTalento } from "./subir-fotos";
import { importarFotoDeGoogle } from "@/app/completar-perfil/acciones";

/** Lo cargado en el alta, guardado en el teléfono (#300): en celulares con poca memoria, salir
 *  a otra app (a copiar un link, a la cámara) puede cerrar la página, y se perdía todo. */
const claveBorrador = (userId: string) => `yalope-alta-perfil-${userId}`;

// El borrador sale del navegador: se valida la forma antes de usarlo.
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
  ubicacion_publica: string;
  ubicacion_place_id: string | null;
  ubicacion_lat: number;
  ubicacion_lng: number;
  ubicacion_pais: string;
  genero: Genero;
  genero_descripcion: string | null;
  videoreel_url: string | null;
  experiencia: string | null;
  habilidades: string[];
  redes: Record<string, string>;
  aparece_en_buscador: boolean;
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
}) {
  const router = useRouter();
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
  const [disciplinas, setDisciplinas] = useState(datosCreador?.disciplinas ?? []);
  const [otroDetalle, setOtroDetalle] = useState(datosCreador?.otro_detalle ?? "");
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [cargando, setCargando] = useState(false);
  const [guardado, setGuardado] = useAvisoGuardado();
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null);
  // #302: en el alta va primero lo obligatorio; lo opcional, plegado (se completa después).
  const [verOpcionales, setVerOpcionales] = useState(!esAlta);
  const [recuperado, setRecuperado] = useState(false);
  // "lista" | "trayendo" | "usada" | el mensaje de error.
  const [fotoGoogle, setFotoGoogle] = useState<string>("lista");
  const borradorLeido = useRef(!esAlta);

  // #300: al entrar al alta se recupera lo que hubiera quedado guardado en el teléfono...
  useEffect(() => {
    if (!esAlta) return;
    try {
      const crudo = localStorage.getItem(claveBorrador(userId));
      const b = crudo ? JSON.parse(crudo) : null;
      if (b && typeof b === "object") {
        if (typeof b.nombre === "string" && b.nombre) setNombre(b.nombre);
        if (typeof b.fechaNacimiento === "string") {
          // Borradores de antes de #307 la guardaban en ISO.
          setFechaNacimiento(/^\d{4}-/.test(b.fechaNacimiento) ? isoATexto(b.fechaNacimiento) : b.fechaNacimiento);
        }
        if (typeof b.edadVisible === "boolean") setEdadVisible(b.edadVisible);
        if (esUbicacion(b.ubicacion)) setUbicacion(b.ubicacion);
        if (typeof b.genero === "string") setGenero(b.genero);
        if (typeof b.generoDescripcion === "string") setGeneroDescripcion(b.generoDescripcion);
        if (typeof b.videoreelUrl === "string") setVideoreelUrl(b.videoreelUrl);
        if (typeof b.experiencia === "string") setExperiencia(b.experiencia);
        if (Array.isArray(b.habilidades)) setHabilidades(b.habilidades);
        if (b.redes && typeof b.redes === "object") setRedes(b.redes);
        if (typeof b.apareceEnBuscador === "boolean") setApareceEnBuscador(b.apareceEnBuscador);
        // Las fotos del alta ya están en Storage: alcanza con recordar dónde.
        if (Array.isArray(b.fotos)) {
          const validas = b.fotos.filter((f: unknown) => esFotoPendiente(f, userId)).slice(0, 5);
          if (validas.length > 0) setFotos(validas);
        }
        if (b.verOpcionales) setVerOpcionales(true);
        // Solo se avisa si había algo cargado de verdad, no solo el nombre precargado.
        setRecuperado(!!(b.fechaNacimiento || b.ubicacion || b.genero || b.fotos?.length));
      }
    } catch {
      // Sin acceso al almacenamiento del navegador: el formulario anda igual, sin borrador.
    }
    borradorLeido.current = true;
  }, [esAlta, userId]);

  // ...y se guarda en cada cambio.
  useEffect(() => {
    if (!esAlta || !borradorLeido.current) return;
    try {
      localStorage.setItem(
        claveBorrador(userId),
        JSON.stringify({
          nombre,
          fechaNacimiento,
          edadVisible,
          ubicacion,
          genero,
          generoDescripcion,
          videoreelUrl,
          experiencia,
          habilidades,
          redes,
          apareceEnBuscador,
          fotos,
          verOpcionales,
        }),
      );
    } catch {
      // Ídem: sin almacenamiento no hay borrador.
    }
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
    habilidades,
    redes,
    apareceEnBuscador,
    fotos,
    verOpcionales,
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

  function validar(): boolean {
    const nuevos: Record<string, string> = {};

    if (nombre.trim().length < 2) nuevos.nombre = "Ingresá tu nombre.";
    const fechaIso = textoAIso(fechaNacimiento);
    if (!fechaNacimiento) {
      nuevos.fecha_nacimiento = "Ingresá tu fecha de nacimiento.";
    } else if (!fechaIso) {
      nuevos.fecha_nacimiento = "Escribila así: día/mes/año, por ejemplo 07/05/1995.";
    } else {
      const hace16 = new Date();
      hace16.setFullYear(hace16.getFullYear() - 16);
      if (new Date(fechaIso) > hace16) {
        nuevos.fecha_nacimiento = "La plataforma es para mayores de 16 años.";
      }
    }
    if (!ubicacion) nuevos.ubicacion = "Elegí tu ubicación de la lista de sugerencias.";
    if (!genero) nuevos.genero = "Elegí una opción.";
    if (generoDescripcion.length > MAX_GENERO_DESCRIPCION) {
      nuevos.genero_descripcion = `Máximo ${MAX_GENERO_DESCRIPCION} caracteres.`;
    }
    // El mínimo de fotos es para **completar** el perfil (el alta). Al editar no bloquea: las
    // fotos se guardan solas al subirlas o borrarlas, y trabar el resto del formulario por eso
    // dejaba a cuentas viejas sin poder guardar nada (#243). Se avisa abajo de las fotos.
    if (esAlta && fotos.length < MIN_FOTOS) nuevos.fotos = "Cargá al menos una foto.";
    if (videoreelUrl && !esVideoreelValido(videoreelUrl)) {
      nuevos.videoreel_url =
        "No reconocemos ese enlace. Pegá el link de un video de YouTube o Vimeo.";
    }
    if (experiencia.length > 2000) nuevos.experiencia = "Máximo 2000 caracteres.";

    const { errores: erroresRedes } = validarRedes(redes);
    for (const [clave, mensaje] of Object.entries(erroresRedes)) {
      nuevos[`redes_${clave}`] = mensaje;
    }

    if (datosCreador) {
      Object.assign(
        nuevos,
        validarCreador(disciplinas, otroDetalle, {
          exigirUna: datosCreador.disciplinas.length > 0,
        }),
      );
    }

    setErrores(nuevos);
    // Si el error está en algo opcional que estaba plegado, se despliega para que se vea.
    const opcionales = ["genero_descripcion", "videoreel_url", "experiencia"];
    if (Object.keys(nuevos).some((k) => opcionales.includes(k) || k.startsWith("redes_"))) {
      setVerOpcionales(true);
    }
    return Object.keys(nuevos).length === 0;
  }

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    setErrorGeneral(null);
    setGuardado(false);
    if (!validar()) {
      // El error puede estar lejos del botón (arriba, en las fotos o la fecha): se avisa acá
      // y se lleva la pantalla hasta el primer campo marcado (#243).
      setErrorGeneral("Revisá los campos marcados en rojo.");
      requestAnimationFrame(() =>
        document
          .querySelector("[data-formulario-talento] .text-error-600")
          ?.scrollIntoView({ behavior: "smooth", block: "center" }),
      );
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
      habilidades,
      redes: validarRedes(redes).redes,
      aparece_en_buscador: apareceEnBuscador,
    };

    // La unidad se deriva del país **solo al crear el perfil**. Al editar no se toca: quien
    // se mudó de Chicago a Berlín puede seguir pensando en millas.
    const { error } = esAlta
      ? await supabase.from("perfiles_talento").insert({
          id: userId,
          ...campos,
          unidad_distancia: unidadPorPais(ubicacion!.pais),
        })
      : await supabase.from("perfiles_talento").update(campos).eq("id", userId);

    if (error) {
      setCargando(false);
      setErrorGeneral("No pudimos guardar tu perfil. Revisá los datos e intentá de nuevo.");
      return;
    }

    if (esAlta) {
      // Recién ahora existe la fila de `perfiles_talento` que exige la FK de las fotos.
      await persistirFotosPendientes(userId, fotos);
      try {
        localStorage.removeItem(claveBorrador(userId));
      } catch {
        // Nada que limpiar.
      }
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
        setErrorGeneral(
          "Guardamos tu perfil, pero no el perfil artístico como Creador. Probá de nuevo.",
        );
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

  return (
    <form onSubmit={guardar} data-formulario-talento className="flex max-w-2xl flex-col gap-6">
      {recuperado && (
        <p className="rounded-xl border border-borde bg-fondo-sutil px-3.5 py-2.5 text-sm text-texto">
          Recuperamos lo que habías cargado. Seguí desde acá.
        </p>
      )}
      <section className="flex flex-col gap-4">
        <h2 className="text-2xs font-medium uppercase tracking-wide text-texto-tenue">Ficha básica</h2>
        <CampoTexto
          id="nombre"
          etiqueta="Nombre completo"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          error={errores.nombre}
        />
        <div className="flex flex-col gap-1.5">
          <CampoTexto
            id="fecha_nacimiento"
            etiqueta="Fecha de nacimiento"
            inputMode="numeric"
            autoComplete="bday"
            placeholder="dd/mm/aaaa"
            maxLength={10}
            value={fechaNacimiento}
            onChange={(e) => setFechaNacimiento(formatearMientrasSeEscribe(e.target.value))}
            error={errores.fecha_nacimiento}
          />
          <ToggleVisibilidad
            visible={edadVisible}
            onCambio={setEdadVisible}
            textoVisible="Tu edad se muestra en tu perfil"
            textoOculto="Tu edad está oculta en tu perfil"
          />
          <p className="text-xs text-texto-tenue">
            La fecha se guarda igual y se usa para priorizar las búsquedas por edad, la
            muestres o no.
          </p>
        </div>
        <CampoUbicacion
          id="ubicacion"
          etiqueta="Ubicación"
          valor={ubicacion}
          onCambio={setUbicacion}
          error={errores.ubicacion}
        />
        <p className="-mt-2 text-xs text-texto-tenue">
          Alcanza con tu ciudad o barrio. Nadie ve tu dirección: solo la zona, para mostrarte lo
          que tenés cerca.
        </p>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="genero" className="text-sm font-medium text-texto">
            Género
          </label>
          <select
            id="genero"
            value={genero}
            onChange={(e) => setGenero(e.target.value as Genero | "")}
            className={`rounded-xl border bg-superficie px-3.5 py-2.5 text-base text-texto focus:border-accion ${
              errores.genero ? "border-error-400" : "border-borde"
            }`}
          >
            <option value="">Elegí una opción</option>
            {GENEROS.map((g) => (
              <option key={g.valor} value={g.valor}>
                {g.etiqueta}
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
            etiqueta="¿Cuál? (opcional)"
            maxLength={MAX_GENERO_DESCRIPCION}
            value={generoDescripcion}
            onChange={(e) => setGeneroDescripcion(e.target.value)}
            error={errores.genero_descripcion}
          />
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-2xs font-medium uppercase tracking-wide text-texto-tenue">Portfolio de fotos</h2>
        {esAlta && conFotoGoogle && fotoGoogle !== "usada" && (
          <div className="flex flex-col gap-1">
            <button
              type="button"
              onClick={usarFotoGoogle}
              disabled={fotoGoogle === "trayendo"}
              className="self-start rounded-full border border-borde px-3.5 py-1.5 text-sm font-medium text-texto transition-colors hover:bg-fondo-sutil disabled:opacity-50"
            >
              {fotoGoogle === "trayendo" ? "Trayendo tu foto…" : "Usar mi foto de Google"}
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
            Te recomendamos {FOTOS_RECOMENDADAS} fotos o más: así quien busca talento te ve mejor.
          </p>
        )}
      </section>

      {!verOpcionales ? (
        <button
          type="button"
          onClick={() => setVerOpcionales(true)}
          className="flex flex-col items-start rounded-xl border border-dashed border-borde px-4 py-3 text-left transition-colors hover:bg-fondo-sutil"
        >
          <span className="text-sm font-medium text-texto">+ Sumar más (opcional)</span>
          <span className="mt-0.5 text-xs text-texto-tenue">
            Videoreel, experiencia, habilidades y redes. También podés completarlo después desde
            tu Perfil.
          </span>
        </button>
      ) : (
        <>
          <section className="flex flex-col gap-4">
            <h2 className="text-2xs font-medium uppercase tracking-wide text-texto-tenue">Videoreel (opcional)</h2>
            <CampoTexto
              id="videoreel"
              etiqueta="Enlace de YouTube o Vimeo"
              placeholder="https://youtu.be/... o https://vimeo.com/..."
              value={videoreelUrl}
              onChange={(e) => setVideoreelUrl(e.target.value)}
              error={errores.videoreel_url}
            />
            <p className="-mt-2 text-xs text-texto-tenue">
              Sirve el link normal, el de compartir, Shorts o el de la app del celular.
            </p>
          </section>

          <section className="flex flex-col gap-3">
            <h2 className="text-2xs font-medium uppercase tracking-wide text-texto-tenue">CV y habilidades</h2>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="experiencia" className="text-sm font-medium text-texto">
                Experiencia
              </label>
              <textarea
                id="experiencia"
                rows={5}
                maxLength={2000}
                value={experiencia}
                onChange={(e) => setExperiencia(e.target.value)}
                className="rounded-xl border border-borde bg-superficie px-3.5 py-2.5 text-base text-texto outline-none focus:border-accion"
                placeholder="Contá tu formación, obras en las que participaste, etc."
              />
              <p className="text-right text-xs text-texto-tenue">{experiencia.length}/2000</p>
              <MejorarRedaccion texto={experiencia} onUsar={setExperiencia} />
            </div>

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
                  {h}
                </button>
              ))}
            </div>
            <SugerirHabilidades experiencia={experiencia} marcadas={habilidades} onMarcar={setHabilidades} />
          </section>

          <section className="flex flex-col gap-4">
            <h2 className="text-2xs font-medium uppercase tracking-wide text-texto-tenue">Redes sociales (opcional)</h2>
            {REDES.filter(
              (red) => masRedes || red.clave === "instagram" || !!redes[red.clave] || !!errores[`redes_${red.clave}`],
            ).map((red) => (
              <CampoTexto
                key={red.clave}
                id={`red_${red.clave}`}
                etiqueta={red.etiqueta}
                placeholder={red.clave === "sitio" ? "https://tusitio.com" : "@usuario o https://…"}
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
                + Agregar otra red (YouTube, TikTok, X, LinkedIn, Vimeo, sitio web)
              </button>
            )}
          </section>

          <section className="flex flex-col gap-3">
            <h2 className="text-2xs font-medium uppercase tracking-wide text-texto-tenue">Visibilidad</h2>
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
                Ocultar mi perfil a personas nuevas
                <span className="mt-0.5 block text-xs text-texto-tenue">
                  No salís en el buscador de Creadores y tu enlace público deja de mostrar tu
                  perfil. Tus chats y tus Proyectos y Equipos siguen igual.
                </span>
              </span>
            </label>
          </section>

        </>
      )}

      {datosCreador && (
        <section className="border-t border-borde pt-6">
          <CamposCreador
            disciplinas={disciplinas}
            setDisciplinas={setDisciplinas}
            otroDetalle={otroDetalle}
            setOtroDetalle={setOtroDetalle}
            errores={errores}
          />
        </section>
      )}

      {errorGeneral && <p className="text-sm text-error-600">{errorGeneral}</p>}
      <AvisoGuardado visible={guardado} />

      <Boton type="submit" cargando={cargando}>
        {esAlta ? "Completar perfil" : "Guardar cambios"}
      </Boton>
    </form>
  );
}
