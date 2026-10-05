"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Boton } from "@/components/ui/boton";
import { CampoTexto } from "@/components/ui/campo-texto";
import { CampoUbicacion } from "@/components/ui/campo-ubicacion";
import { Icono } from "@/components/ui/icono";
import { createClient } from "@/lib/supabase/client";
import { aColumnas, type Ubicacion } from "@/lib/ubicacion";
import { MejorarRedaccion } from "@/components/perfil/mejorar-redaccion";


interface RolNuevo {
  id: string;
  nombre: string;
  descripcion: string;
}

/**
 * Creación inline de un Proyecto (issue #157): mismo patrón que "Armar equipo" —
 * colapsado detrás de un botón hasta que se abre, y ahí mismo, sin navegar a otra pantalla,
 * el título/sinopsis/ubicación junto con los roles que busca (hasta 10, nombre + breve
 * descripción). Antes esto eran dos pasos separados: una página aparte para crear la obra y,
 * ya en su pantalla de detalle, agregar los roles de a uno.
 *
 * Las fotos se suben recién en la pantalla de detalle, como ya pasa con el Equipo: no hay
 * fila de `obras` todavía mientras se completa este formulario, y `fotos_obra` necesita que
 * exista para poder guardarse.
 */
export function FormularioObra({
  creadorId,
  abiertoInicial = false,
  onCancelar,
}: {
  creadorId: string;
  /** Desde «Crear proyecto» (#341) llega ya abierto. */
  abiertoInicial?: boolean;
  /** Cancelar vuelve a la pregunta «¿Qué querés armar?» en vez de plegar el formulario. */
  onCancelar?: () => void;
}) {
  const router = useRouter();
  const t = useTranslations("proyectos.formularioObra");
  const tc = useTranslations("comun");
  const [abierto, setAbierto] = useState(abiertoInicial);
  const [titulo, setTitulo] = useState("");
  const [sinopsis, setSinopsis] = useState("");
  const [ubicacion, setUbicacion] = useState<Ubicacion | null>(null);
  const [fechaEstreno, setFechaEstreno] = useState("");
  const [roles, setRoles] = useState<RolNuevo[]>([]);
  const [rolNombre, setRolNombre] = useState("");
  const [rolDescripcion, setRolDescripcion] = useState("");
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  function agregarRol() {
    if (!rolNombre.trim()) {
      setErrores((p) => ({ ...p, rol: t("errorRol") }));
      return;
    }
    setRoles((prev) => [
      ...prev,
      { id: crypto.randomUUID(), nombre: rolNombre.trim(), descripcion: rolDescripcion.trim() },
    ]);
    setRolNombre("");
    setRolDescripcion("");
    setErrores((p) => ({ ...p, rol: "" }));
  }

  function quitarRol(id: string) {
    setRoles((prev) => prev.filter((r) => r.id !== id));
  }

  async function crear(e: React.FormEvent) {
    e.preventDefault();
    setErrorGeneral(null);

    const nuevos: Record<string, string> = {};
    if (!titulo.trim()) nuevos.titulo = t("errorTitulo");
    if (!ubicacion) nuevos.ubicacion = t("errorUbicacion");
    // Reemplaza los avisos de título y locación: uno ya corregido no tiene que quedar en rojo.
    setErrores((p) => ({ rol: p.rol ?? "", ...nuevos }));
    if (Object.keys(nuevos).length > 0) return;

    setCargando(true);
    const supabase = createClient();

    const { data: obra, error: errorObra } = await supabase
      .from("obras")
      .insert({
        creador_id: creadorId,
        titulo: titulo.trim(),
        sinopsis: sinopsis || null,
        ...aColumnas(ubicacion!),
        fecha_estreno_estimada: fechaEstreno || null,
      })
      .select()
      .single();

    if (errorObra || !obra) {
      setCargando(false);
      setErrorGeneral(t("errorCrear"));
      return;
    }

    if (roles.length > 0) {
      await supabase.from("roles").insert(
        roles.map((r) => ({
          obra_id: obra.id,
          nombre: r.nombre,
          tipo: "actuacion" as const,
          vacantes: 1,
          descripcion: r.descripcion || null,
        })),
      );
      // Un fallo acá no se le muestra a nadie: el proyecto ya quedó creado y los roles se
      // pueden agregar o ajustar desde su pantalla, que es adonde se entra a continuación.
    }

    setCargando(false);
    router.push(`/obras/${obra.id}`);
  }

  if (!abierto) {
    return (
      <button
        type="button"
        onClick={() => setAbierto(true)}
        className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-borde px-4 py-3 text-sm font-medium text-texto-tenue transition-colors hover:border-texto hover:text-texto"
      >
        <Icono nombre="mas" className="h-4 w-4" />
        {t("crearUnProyecto")}
      </button>
    );
  }

  return (
    <form
      onSubmit={crear}
      className="flex flex-col gap-4 rounded-2xl border border-borde bg-superficie p-4"
    >
      <CampoTexto
        id="obra_titulo"
        etiqueta={t("tituloProyecto")}
        value={titulo}
        onChange={(e) => setTitulo(e.target.value)}
        error={errores.titulo}
      />

      <div className="flex flex-col gap-1.5">
        <label htmlFor="obra_sinopsis" className="text-sm font-medium text-texto">
          {t("descripcion")}
        </label>
        <textarea
          id="obra_sinopsis"
          rows={3}
          maxLength={2000}
          value={sinopsis}
          onChange={(e) => setSinopsis(e.target.value)}
          className="rounded-xl border border-borde bg-superficie px-3.5 py-2.5 text-base text-texto outline-none focus:border-accion"
        />
        <MejorarRedaccion tipo="sinopsis" texto={sinopsis} onUsar={setSinopsis} />
      </div>

      <CampoUbicacion
        id="obra_ubicacion"
        etiqueta={t("ubicacion")}
        valor={ubicacion}
        onCambio={setUbicacion}
        error={errores.ubicacion}
      />
      <CampoTexto
        id="obra_fecha_estreno"
        etiqueta={t("fechaEstreno")}
        type="date"
        value={fechaEstreno}
        onChange={(e) => setFechaEstreno(e.target.value)}
      />

      <div className="flex flex-col gap-2">
        <p className="text-sm font-medium text-texto">
          {t.rich("rolesQueBusca", {
            tenue: (chunks) => <span className="font-normal text-texto-tenue">{chunks}</span>,
          })}
        </p>

        {roles.length > 0 && (
          <ul className="flex flex-col gap-1.5">
            {roles.map((r) => (
              <li
                key={r.id}
                className="flex items-center gap-2 rounded-lg border border-borde px-3 py-2"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-texto">{r.nombre}</p>
                  {r.descripcion && (
                    <p className="truncate text-xs text-texto-tenue">{r.descripcion}</p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => quitarRol(r.id)}
                  className="shrink-0 text-xs font-medium text-error-600"
                >
                  {t("quitar")}
                </button>
              </li>
            ))}
          </ul>
        )}

        {/* #330: sin tope de roles. */}
        <div className="flex flex-col gap-2 rounded-xl border border-dashed border-borde p-3">
            <div className="grid gap-2 sm:grid-cols-2 sm:items-end">
              <CampoTexto
                id="rol_nombre"
                etiqueta={t("rolBuscado")}
                placeholder={t("rolPlaceholder")}
                value={rolNombre}
                onChange={(e) => setRolNombre(e.target.value)}
                error={errores.rol}
              />
              <CampoTexto
                id="rol_descripcion"
                etiqueta={t("rolDescripcion")}
                value={rolDescripcion}
                onChange={(e) => setRolDescripcion(e.target.value)}
              />
            </div>
            <Boton type="button" variante="secundario" onClick={agregarRol}>
              {t("agregarRol")}
            </Boton>
          </div>
      </div>

      {errorGeneral && <p className="text-sm text-error-600">{errorGeneral}</p>}

      <div className="flex gap-2">
        <Boton type="submit" cargando={cargando}>
          {t("crearProyecto")}
        </Boton>
        <Boton type="button" variante="fantasma" onClick={() => (onCancelar ? onCancelar() : setAbierto(false))} disabled={cargando}>
          {tc("cancelar")}
        </Boton>
      </div>
    </form>
  );
}
