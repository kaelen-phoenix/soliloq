import { useTranslations } from "use-intl";
import { Proximamente } from "~/ui/proximamente";

export default function Convocatorias() {
  const t = useTranslations("titulos");
  return <Proximamente titulo={t("matches")} ruta="/matches" />;
}
