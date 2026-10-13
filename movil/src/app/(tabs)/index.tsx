import { useTranslations } from "use-intl";
import { Proximamente } from "~/ui/proximamente";

export default function Explorar() {
  const t = useTranslations("titulos");
  return <Proximamente titulo={t("convocatorias")} ruta="/" />;
}
