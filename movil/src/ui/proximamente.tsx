import { useTranslations } from "use-intl";
import { abrirWeb } from "~/lib/web";
import { Boton } from "./boton";
import { Pantalla } from "./pantalla";
import { Texto } from "./texto";

/**
 * Una sección que todavía no es nativa (vista previa, #396): la abre en la web. Cada etapa
 * (#392–#395) reemplaza estas pantallas por las de verdad.
 */
export function Proximamente({ titulo, ruta, children }: { titulo: string; ruta: string; children?: React.ReactNode }) {
  const t = useTranslations("app");
  return (
    <Pantalla>
      <Texto variante="titulo">{titulo}</Texto>
      <Texto variante="tenue">{t("proximamente")}</Texto>
      <Boton variante="secundario" onPress={() => abrirWeb(ruta)}>
        {t("abrirWeb")}
      </Boton>
      {children}
    </Pantalla>
  );
}
