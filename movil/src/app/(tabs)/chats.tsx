import { useTranslations } from "use-intl";
import { Proximamente } from "~/ui/proximamente";

export default function Chats() {
  const t = useTranslations("titulos");
  return <Proximamente titulo={t("salas")} ruta="/salas" />;
}
