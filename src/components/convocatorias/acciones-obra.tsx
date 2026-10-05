"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { Boton } from "@/components/ui/boton";
import { ConfirmarBorrado } from "@/components/ui/confirmar-borrado";
import type { EstadoObra } from "@/lib/supabase/types";
import {
  borrarCanalesDeIniciativa,
  canalesParaBorrar,
  sincronizarEspacioDeIniciativa,
} from "@/app/acciones-discord";

const MIN_FOTOS = 1; // issue #162

export function AccionesObra({
  obraId,
  estado,
  cantidadRoles,
  cantidadFotos,
  esDueno,
  fotosPaths,
}: {
  obraId: string;
  estado: EstadoObra;
  cantidadRoles: number;
  cantidadFotos: number;
  esDueno: boolean;
  /** `storage_path` de cada foto de la obra, para limpiarlas del Storage al borrar. */
  fotosPaths: string[];
}) {
  const router = useRouter();
  const t = useTranslations("proyectos.accionesObra");
  const tUi = useTranslations("cuenta.ui");
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);
  const [confirmarBorrado, setConfirmarBorrado] = useState(false);
  // Al subir una foto o agregar un rol, el aviso viejo («Subí al menos una foto…») se va.
  useEffect(() => setError(null), [cantidadFotos, cantidadRoles]);
  // Mientras FotosObra sube una foto, publicar espera (#349).
  const [subiendoFoto, setSubiendoFoto] = useState(false);
  useEffect(() => {
    const alCambiar = (e: Event) => setSubiendoFoto(Boolean((e as CustomEvent<boolean>).detail));
    window.addEventListener("yalope:subiendo-fotos-obra", alCambiar);
    return () => window.removeEventListener("yalope:subiendo-fotos-obra", alCambiar);
  }, []);

  async function publicar() {
    setError(null);
    setCargando(true);
    const supabase = createClient();
    // #329: se cuenta en el momento. Los números que vinieron con la página quedaban viejos al
    // subir una foto o agregar un rol, y el aviso no se iba hasta salir y volver a entrar.
    const [{ count: roles, error: errorRoles }, { count: fotos, error: errorFotos }] = await Promise.all([
      supabase.from("roles").select("id", { count: "exact", head: true }).eq("obra_id", obraId),
      supabase.from("fotos_obra").select("id", { count: "exact", head: true }).eq("obra_id", obraId),
    ]);
    // Sin poder contar no se publica: mejor un reintento que una convocatoria sin foto.
    if (errorRoles || errorFotos || roles == null || fotos == null) {
      setCargando(false);
      setError(t("errorVerificar"));
      return;
    }
    if (roles === 0) {
      setCargando(false);
      setError(t("faltaRol"));
      return;
    }
    if (fotos < MIN_FOTOS) {
      setCargando(false);
      setError(t("faltaFoto"));
      return;
    }
    await supabase.from("obras").update({ estado: "publicada" }).eq("id", obraId);
    // Si se reabre, su espacio en Discord vuelve a ser de escritura (#269).
    await sincronizarEspacioDeIniciativa({ obraId }).catch(() => {});
    setCargando(false);
    router.refresh();
  }

  async function cerrar() {
    setCargando(true);
    const supabase = createClient();
    await supabase.from("obras").update({ estado: "cerrada" }).eq("id", obraId);
    // Cerrado: su espacio en Discord queda de solo lectura (#269).
    await sincronizarEspacioDeIniciativa({ obraId }).catch(() => {});
    setCargando(false);
    router.refresh();
  }

  async function borrar() {
    setError(null);
    setCargando(true);
    const supabase = createClient();
    // Primero el Storage (no cascadea con la fila); si algo falla, seguimos igual con el
    // borrado de la obra — no queremos dejar el proyecto a medio eliminar por un huérfano.
    if (fotosPaths.length > 0) {
      await supabase.storage.from("fotos-perfil").remove(fotosPaths);
    }
    // Los ids de sus canales de Discord, antes de que la sala caiga en cascada (#269).
    const canales = await canalesParaBorrar({ obraId }).catch(() => null);
    const { error: errorBd } = await supabase.from("obras").delete().eq("id", obraId);
    if (errorBd) {
      setCargando(false);
      setError(t("errorBorrar"));
      return;
    }
    // Recién con el proyecto borrado se borran sus canales.
    await borrarCanalesDeIniciativa(canales).catch(() => {});
    // Sin `setCargando(false)`: la pantalla ya se va.
    router.replace("/proyectos");
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-2">
      {error && <p className="text-xs text-error-600">{error}</p>}
      <div className="flex gap-2">
        {estado === "borrador" && (
          <Boton onClick={publicar} cargando={cargando || subiendoFoto} textoCargando={subiendoFoto ? t("subiendoFoto") : undefined}>
            {t("publicar")}
          </Boton>
        )}
        {estado === "publicada" && (
          <Boton variante="peligro" onClick={cerrar} cargando={cargando}>
            {t("cerrar")}
          </Boton>
        )}
        {estado === "cerrada" && (
          <p className="text-sm text-texto-tenue">{t("cerrada")}</p>
        )}
      </div>

      {esDueno && (
        <div className="mt-4 border-t border-borde pt-4">
          {!confirmarBorrado ? (
            <Boton
              variante="fantasma"
              className="!px-0 text-error-600 hover:!bg-transparent hover:underline"
              onClick={() => {
                setError(null);
                setConfirmarBorrado(true);
              }}
            >
              {t("borrar")}
            </Boton>
          ) : (
            <ConfirmarBorrado
              mensaje={t("confirmarBorrado", { palabra: tUi("palabraBorrar") })}
              textoBoton={t("borrarDefinitivamente")}
              cargando={cargando}
              onConfirmar={borrar}
              onCancelar={() => setConfirmarBorrado(false)}
            />
          )}
        </div>
      )}
    </div>
  );
}
