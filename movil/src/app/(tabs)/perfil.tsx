import { useTranslations } from "use-intl";
import { useSesion } from "~/lib/sesion";
import { Boton } from "~/ui/boton";
import { Proximamente } from "~/ui/proximamente";
import { Texto } from "~/ui/texto";

export default function Perfil() {
  const t = useTranslations();
  const { sesion, cerrarSesion } = useSesion();
  return (
    <Proximamente titulo={t("titulos.perfil")} ruta="/perfil">
      <Texto variante="chico">{t("app.sesionComo", { email: sesion?.user.email ?? "" })}</Texto>
      <Boton variante="fantasma" onPress={cerrarSesion}>
        {t("cuenta.cerrarSesion")}
      </Boton>
    </Proximamente>
  );
}
