import { useTranslations } from "use-intl";
import { Proximamente } from "~/ui/proximamente";

export default function Iniciativas() {
  const t = useTranslations("nav");
  return <Proximamente titulo={t("iniciativas")} ruta="/proyectos" />;
}
