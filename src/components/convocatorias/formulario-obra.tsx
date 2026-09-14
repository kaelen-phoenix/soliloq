"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Boton } from "@/components/ui/boton";
import { CampoTexto } from "@/components/ui/campo-texto";
import { CampoUbicacion } from "@/components/ui/campo-ubicacion";
import { Icono } from "@/components/ui/icono";
import { createClient } from "@/lib/supabase/client";
import { aColumnas, type Ubicacion } from "@/lib/ubicacion";

const MAX_ROLES = 10;

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
export function FormularioObra({ creadorId }: { creadorId: string }) {
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
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
      setErrores((p) => ({ ...p, rol: "Ingresá el rol que buscás." }));
      return;
    }
    if (roles.length >= MAX_ROLES) return;
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
    if (!titulo.trim()) nuevos.titulo = "Ingresá el título del proyecto.";
    if (!ubicacion) nuevos.ubicacion = "Elegí la locación de ensayos de la lista de sugerencias.";
    setErrores((p) => ({ ...p, ...nuevos }));
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
      setErrorGeneral("No pudimos crear el proyecto. Probá de nuevo.");
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
        Crear un proyecto
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
        etiqueta="Título del proyecto"
        value={titulo}
        onChange={(e) => setTitulo(e.target.value)}
        error={errores.titulo}
      />

      <div className="flex flex-col gap-1.5">
        <label htmlFor="obra_sinopsis" className="text-sm font-medium text-texto">
          Descripción (opcional)
        </label>
        <textarea
          id="obra_sinopsis"
          rows={3}
          maxLength={2000}
          value={sinopsis}
          onChange={(e) => setSinopsis(e.target.value)}
          className="rounded-xl border border-borde bg-superficie px-3.5 py-2.5 text-base text-texto outline-none focus:border-accion"
        />
      </div>

      <CampoUbicacion
        id="obra_ubicacion"
        etiqueta="Locación de ensayos"
        valor={ubicacion}
        onCambio={setUbicacion}
        error={errores.ubicacion}
      />
      <CampoTexto
        id="obra_fecha_estreno"
        etiqueta="Fecha estimada de estreno (opcional)"
        type="date"
        value={fechaEstreno}
        onChange={(e) => setFechaEstreno(e.target.value)}
      />

      <div className="flex flex-col gap-2">
        <p className="text-sm font-medium text-texto">
          Roles que busca <span className="font-normal text-texto-tenue">(opcional)</span>
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
                  Quitar
                </button>
              </li>
            ))}
          </ul>
        )}

        {roles.length < MAX_ROLES ? (
          <div className="flex flex-col gap-2 rounded-xl border border-dashed border-borde p-3">
            <div className="grid grid-cols-2 gap-2">
              <CampoTexto
                id="rol_nombre"
                etiqueta="Rol buscado"
                placeholder="Director"
                value={rolNombre}
                onChange={(e) => setRolNombre(e.target.value)}
                error={errores.rol}
              />
              <CampoTexto
                id="rol_descripcion"
                etiqueta="Breve descripción (opcional)"
                value={rolDescripcion}
                onChange={(e) => setRolDescripcion(e.target.value)}
              />
            </div>
            <Boton type="button" variante="secundario" onClick={agregarRol}>
              + Agregar rol
            </Boton>
          </div>
        ) : (
          <p className="text-xs text-texto-tenue">Llegaste al máximo de {MAX_ROLES} roles.</p>
        )}

        <p className="text-xs text-texto-tenue">{roles.length}/{MAX_ROLES} roles</p>
      </div>

      {errorGeneral && <p className="text-sm text-error-600">{errorGeneral}</p>}

      <div className="flex gap-2">
        <Boton type="submit" cargando={cargando}>
          Crear proyecto
        </Boton>
        <Boton type="button" variante="fantasma" onClick={() => setAbierto(false)} disabled={cargando}>
          Cancelar
        </Boton>
      </div>
    </form>
  );
}
