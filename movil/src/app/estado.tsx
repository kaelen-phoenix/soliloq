import { useState } from "react";
import { useTranslations } from "use-intl";
import { useSesion } from "~/lib/sesion";
import { abrirWeb } from "~/lib/web";
import { Boton } from "~/ui/boton";
import { Marca } from "~/ui/marca";
import { Pantalla } from "~/ui/pantalla";
import { Texto } from "~/ui/texto";

/**
 * La cuenta todavía no puede entrar a la app: solicitud pendiente, falta aceptar las Normas o
 * completar el perfil, o está suspendida (las mismas guardas que la web).
 *
 * Normas y alta del perfil todavía se hacen en la web (llegan a la app en #392): se abre la
 * página y, al volver, «Ya terminé» relee el estado.
 */
export default function Estado() {
  const { destino, recargar, cerrarSesion } = useSesion();
  const t = useTranslations();
  const [releyendo, setReleyendo] = useState(false);

  const enWeb = destino === "aceptar-normas" ? "/aceptar-normas" : destino === "completar-perfil" ? "/completar-perfil" : null;

  const titulo =
    destino === "solicitud-pendiente"
      ? t("solicitudPendiente.titulo")
      : destino === "aceptar-normas"
        ? t("aceptarNormas.titulo")
        : destino === "completar-perfil"
          ? t("app.completarPerfilTitulo")
          : t("suspendido.titulo");
  const texto =
    destino === "solicitud-pendiente"
      ? t("solicitudPendiente.texto")
      : destino === "suspendido"
        ? t("suspendido.texto")
        : t("app.pasoEnWeb");

  async function releer() {
    setReleyendo(true);
    await recargar();
    setReleyendo(false);
  }

  return (
    <Pantalla contentContainerStyle={{ justifyContent: "center", gap: 20 }}>
      <Marca />
      <Texto variante="titulo">{titulo}</Texto>
      <Texto variante="tenue">{texto}</Texto>
      {enWeb && <Boton onPress={() => abrirWeb(enWeb)}>{t("app.abrirWeb")}</Boton>}
      {destino !== "suspendido" && (
        <Boton variante="secundario" onPress={releer} cargando={releyendo}>
          {t("app.yaTermine")}
        </Boton>
      )}
      <Boton variante="fantasma" onPress={cerrarSesion}>
        {t("cuenta.cerrarSesion")}
      </Boton>
    </Pantalla>
  );
}
