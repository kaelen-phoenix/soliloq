import { router, type Href } from "expo-router";
import { useTranslations } from "use-intl";
import { useSesion } from "~/lib/sesion";
import { FormularioObra } from "~/ui/iniciativas/formulario-obra";
import { Volver } from "~/ui/iniciativas/volver";
import { Pantalla } from "~/ui/pantalla";
import { Texto } from "~/ui/texto";

/** Crear un Proyecto con roles (#341, #157). Creado, va a su pantalla a subir las fotos. */
export default function NuevoProyecto() {
  const t = useTranslations("proyectos.crearProyecto");
  const tc = useTranslations("comun");
  const { sesion } = useSesion();
  if (!sesion) return null;
  return (
    <Pantalla>
      <Volver texto={tc("volver")} />
      <Texto variante="titulo" accessibilityRole="header">
        {t("proyectoTitulo")}
      </Texto>
      <FormularioObra
        creadorId={sesion.user.id}
        alTerminar={(id) => router.replace(`/obras/${id}` as Href)}
        onCancelar={() => router.back()}
      />
    </Pantalla>
  );
}
