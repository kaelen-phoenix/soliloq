import { useState } from "react";
import { View } from "react-native";
import { useTranslations } from "use-intl";
import { problemaParaPublicar } from "@/lib/iniciativa-reglas";
import type { EstadoObra } from "@/lib/supabase/types";
import { BUCKET_FOTOS } from "@/lib/perfil-talento";
import { llamarApi } from "~/lib/api";
import { supabase } from "~/lib/supabase";
import { Boton } from "../boton";
import { Texto } from "../texto";
import { useColores } from "../tema";
import { ConfirmarBorrado } from "./piezas";

/**
 * Publicar, cerrar y borrar un Proyecto (`AccionesObra` de la web). Publicar cuenta roles y
 * fotos en el momento (#329) y espera si se está subiendo una foto (#349).
 */
export function AccionesObra({
  obraId,
  estado,
  fotosPaths,
  subiendoFoto,
  alCambiar,
  alBorrar,
}: {
  obraId: string;
  estado: EstadoObra;
  /** `storage_path` de cada foto, para limpiarlas del Storage al borrar. */
  fotosPaths: string[];
  subiendoFoto: boolean;
  alCambiar: () => void;
  alBorrar: () => void;
}) {
  const t = useTranslations("proyectos.accionesObra");
  const tUi = useTranslations("cuenta.ui");
  const color = useColores();
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);
  const [confirmarBorrado, setConfirmarBorrado] = useState(false);

  async function publicar() {
    setError(null);
    setCargando(true);
    const [{ count: roles, error: e1 }, { count: fotos, error: e2 }] = await Promise.all([
      supabase.from("roles").select("id", { count: "exact", head: true }).eq("obra_id", obraId),
      supabase.from("fotos_obra").select("id", { count: "exact", head: true }).eq("obra_id", obraId),
    ]);
    // Sin poder contar no se publica: mejor un reintento que una convocatoria sin foto.
    if (e1 || e2 || roles == null || fotos == null) {
      setCargando(false);
      return setError(t("errorVerificar"));
    }
    const problema = problemaParaPublicar(roles, fotos);
    if (problema) {
      setCargando(false);
      return setError(t(problema));
    }
    await supabase.from("obras").update({ estado: "publicada" }).eq("id", obraId);
    // Si se reabre, su espacio en Discord vuelve a ser de escritura (#269).
    await llamarApi("discord", { accion: "iniciativa", obraId });
    setCargando(false);
    alCambiar();
  }

  async function cerrar() {
    setCargando(true);
    await supabase.from("obras").update({ estado: "cerrada" }).eq("id", obraId);
    // Cerrado: su espacio en Discord queda de solo lectura (#269).
    await llamarApi("discord", { accion: "iniciativa", obraId });
    setCargando(false);
    alCambiar();
  }

  async function borrar() {
    setError(null);
    setCargando(true);
    // Primero el Storage (no cascadea con la fila); si algo falla, se sigue con el borrado.
    if (fotosPaths.length > 0) await supabase.storage.from(BUCKET_FOTOS).remove(fotosPaths);
    // Los ids de sus canales de Discord, antes de que la sala caiga en cascada (#269).
    const r = await llamarApi<{ permiso: unknown }>("discord", { accion: "canales-para-borrar", obraId });
    const { error: e } = await supabase.from("obras").delete().eq("id", obraId);
    if (e) {
      setCargando(false);
      return setError(t("errorBorrar"));
    }
    // Recién con el proyecto borrado se borran sus canales.
    if (r.ok && r.permiso) await llamarApi("discord", { accion: "borrar-canales", permiso: r.permiso });
    alBorrar();
  }

  return (
    <View style={{ gap: 10 }}>
      {error && <Texto variante="error">{error}</Texto>}
      {estado === "borrador" && (
        <Boton onPress={publicar} cargando={cargando || subiendoFoto}>
          {subiendoFoto ? t("subiendoFoto") : t("publicar")}
        </Boton>
      )}
      {estado === "publicada" && (
        <Boton variante="peligro" onPress={cerrar} cargando={cargando}>
          {t("cerrar")}
        </Boton>
      )}
      {estado === "cerrada" && <Texto variante="tenue">{t("cerrada")}</Texto>}

      <View style={{ borderTopWidth: 1, borderTopColor: color.borde, paddingTop: 12, marginTop: 8 }}>
        {!confirmarBorrado ? (
          <Texto
            accessibilityRole="button"
            style={{ color: color.error }}
            onPress={() => {
              setError(null);
              setConfirmarBorrado(true);
            }}
          >
            {t("borrar")}
          </Texto>
        ) : (
          <ConfirmarBorrado
            mensaje={t("confirmarBorrado", { palabra: tUi("palabraBorrar") })}
            textoBoton={t("borrarDefinitivamente")}
            cargando={cargando}
            onConfirmar={borrar}
            onCancelar={() => setConfirmarBorrado(false)}
          />
        )}
      </View>
    </View>
  );
}
