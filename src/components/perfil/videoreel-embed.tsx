import { useTranslations } from "next-intl";
import { parsearVideoreel, urlEmbedVideoreel } from "@/lib/videoreel";

export function VideoreelEmbed({ url }: { url: string }) {
  const t = useTranslations("perfil.videoreel");
  const videoreel = parsearVideoreel(url);
  if (!videoreel) return null;

  return (
    <div className="aspect-video w-full overflow-hidden rounded-xl bg-black">
      <iframe
        src={urlEmbedVideoreel(videoreel)}
        title={t("titulo")}
        className="h-full w-full"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
      />
    </div>
  );
}
