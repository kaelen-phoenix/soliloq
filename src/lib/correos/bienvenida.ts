import type { Idioma } from "@/i18n/request";
import { armarMail, SITIO } from "./plantilla";
import { textosCorreo } from "./textos";

/**
 * Mail de bienvenida (#272): el mismo para todos, con el link de la app y el de la landing.
 * Sale al aceptar las Normas (cuando alguien ya puede entrar) y desde el panel de admin.
 * En el idioma de quien lo recibe (`perfiles.idioma`; por defecto, castellano).
 */
export function mailBienvenida(opciones: { discord?: string | null; idioma?: Idioma } = {}) {
  const discord = opciones.discord || null;
  const idioma = opciones.idioma ?? "es";
  const t = textosCorreo(idioma);
  return armarMail({
    idioma,
    asunto: t("bienvenida.asunto"),
    previa: t("bienvenida.previa"),
    titulo: t("bienvenida.titulo"),
    parrafos: [t("bienvenida.parrafo1"), t("bienvenida.parrafo2")],
    botones: [
      { href: `${SITIO}/ingresar`, texto: t("bienvenida.entrar"), primario: true },
      // Abre el recorrido guiado; sin sesión, la portada que explica cómo funciona.
      { href: `${SITIO}/?tour=1`, texto: t("bienvenida.comoFunciona") },
    ],
    lista: {
      titulo: t("bienvenida.lista.titulo"),
      items: [
        t("bienvenida.lista.fotos"),
        t("bienvenida.lista.notificaciones"),
        t("bienvenida.lista.instalar"),
        ...(discord
          ? [
              t("bienvenida.lista.discord", {
                discord: `<a href="${discord}" style="color:#f2571e;text-decoration:underline;">Discord</a>`,
              }),
            ]
          : []),
      ],
    },
    motivo: t("bienvenida.motivo"),
  });
}
