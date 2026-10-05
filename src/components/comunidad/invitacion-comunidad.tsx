import { useTranslations } from "next-intl";
import { Icono } from "@/components/ui/icono";

/**
 * Invitación a la comunidad de Yalope en Discord (#267): la gente se encuentra en la app y
 * la charla sigue en un lugar con la marca, en vez de en grupos sueltos.
 *
 * Solo vive dentro de `(app)`, así que la ven únicamente cuentas aprobadas: el filtro de la
 * instancia de prueba vale también para el servidor. El link sale de
 * `NEXT_PUBLIC_DISCORD_INVITACION`; si no está cargado, no se muestra nada (así el código
 * puede estar antes que el servidor).
 *
 * `compacta`: una franja arriba de la lista de Chats. `seccion`: el bloque de Perfil, con el
 * mismo formato que «Compartir mi perfil».
 */
export function InvitacionComunidad({
  variante,
  children,
}: {
  variante: "compacta" | "seccion";
  /** Debajo del botón, en la sección del perfil (p. ej. «Vincular mi Discord», #269). */
  children?: React.ReactNode;
}) {
  const t = useTranslations("chats.comunidad");
  const url = process.env.NEXT_PUBLIC_DISCORD_INVITACION;
  if (!url) return null;

  if (variante === "compacta") {
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="mb-4 flex items-center gap-3 rounded-2xl border border-borde px-4 py-3 text-sm transition-colors hover:bg-fondo-sutil"
      >
        <Icono nombre="salas" className="h-5 w-5 shrink-0 text-brand-400" />
        <span className="min-w-0 flex-1 text-texto-tenue">
          {t.rich("compacta", {
            b: (texto) => <span className="font-medium text-texto">{texto}</span>,
          })}
        </span>
        <Icono nombre="enlace" className="h-4 w-4 shrink-0 text-texto-tenue" />
      </a>
    );
  }

  return (
    <section className="mt-8 max-w-2xl rounded-2xl border border-borde p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 className="text-base font-medium text-texto">{t("titulo")}</h2>
          <p className="mt-1 text-sm leading-relaxed text-texto-tenue">
            {t("texto")}
          </p>
        </div>
        <Icono nombre="salas" className="h-5 w-5 shrink-0 text-texto-tenue" />
      </div>
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="bg-accion brillo-accion mt-4 inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium text-accion-texto"
      >
        {t("unite")}
        <Icono nombre="enlace" className="h-4 w-4" />
      </a>
      {children}
    </section>
  );
}
