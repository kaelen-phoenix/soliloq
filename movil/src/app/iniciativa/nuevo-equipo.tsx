import { router, type Href } from "expo-router";
import { useTranslations } from "use-intl";
import { useSesion } from "~/lib/sesion";
import { FormularioEquipo } from "~/ui/iniciativas/formulario-equipo";
import { Volver } from "~/ui/iniciativas/volver";
import { Pantalla } from "~/ui/pantalla";
import { Texto } from "~/ui/texto";

/** Armar un Equipo (#341, #57). Armado, va a su pantalla, como el Proyecto. */
export default function NuevoEquipo() {
  const t = useTranslations("proyectos.crearProyecto");
  const tEquipo = useTranslations("proyectos.equipo");
  const tc = useTranslations("comun");
  const { sesion } = useSesion();
  if (!sesion) return null;
  return (
    <Pantalla>
      <Volver texto={tc("volver")} />
      <Texto variante="titulo" accessibilityRole="header">
        {t("equipoTitulo")}
      </Texto>
      <Texto variante="tenue">{tEquipo("invitacion")}</Texto>
      <FormularioEquipo
        creadorId={sesion.user.id}
        alTerminar={(id) => router.replace(`/equipos/${id}` as Href)}
        onCancelar={() => router.back()}
      />
    </Pantalla>
  );
}
