import type { Idioma } from "@/i18n/request";
import { armarMail, SITIO } from "./plantilla";
import { localeDe, textosCorreo } from "./textos";

/** A la persona, cuando un admin la habilita (#247). En el idioma de esa persona. */
export function mailAccesoHabilitado(idioma: Idioma) {
  const t = textosCorreo(idioma);
  return armarMail({
    idioma,
    asunto: t("accesoHabilitado.asunto"),
    previa: t("accesoHabilitado.previa"),
    titulo: t("accesoHabilitado.titulo"),
    parrafos: [t("accesoHabilitado.parrafo1"), t("accesoHabilitado.parrafo2")],
    botones: [{ href: `${SITIO}/ingresar`, texto: t("accesoHabilitado.boton"), primario: true }],
    motivo: t("accesoHabilitado.motivo"),
  });
}

/** A cada admin, cuando alguien sin invitación pide entrar (#248). En el idioma del admin. */
export function mailSolicitudAcceso(datos: { email: string | null; fecha: Date; idioma: Idioma }) {
  const t = textosCorreo(datos.idioma);
  const cuando = datos.fecha.toLocaleString(localeDe(datos.idioma), {
    timeZone: "America/Argentina/Buenos_Aires",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  });
  return armarMail({
    idioma: datos.idioma,
    asunto: t("solicitudAcceso.asunto"),
    previa: datos.email ? t("solicitudAcceso.previa", { email: datos.email }) : t("solicitudAcceso.previaSinEmail"),
    titulo: t("solicitudAcceso.titulo"),
    parrafos: [
      t("solicitudAcceso.parrafo1"),
      t("solicitudAcceso.email", { email: datos.email ?? t("solicitudAcceso.sinEmail") }),
      t("solicitudAcceso.fecha", { fecha: cuando }),
      t("solicitudAcceso.parrafo2"),
    ],
    botones: [{ href: `${SITIO}/admin`, texto: t("solicitudAcceso.boton"), primario: true }],
    motivo: t("solicitudAcceso.motivo"),
  });
}

/**
 * A un email que un admin invitó y todavía no tiene cuenta (#272): entra directo, sin
 * esperar aprobación (0078). El link abre «Crear cuenta»; con Google también sirve.
 * Sin cuenta no hay `perfiles.idioma`: quien llama elige el idioma (por defecto, castellano).
 */
export function mailInvitacion(idioma: Idioma = "es") {
  const t = textosCorreo(idioma);
  return armarMail({
    idioma,
    asunto: t("invitacion.asunto"),
    previa: t("invitacion.previa"),
    titulo: t("invitacion.titulo"),
    parrafos: [t("invitacion.parrafo1"), t("invitacion.parrafo2")],
    botones: [
      { href: `${SITIO}/ingresar?modo=registrarme`, texto: t("invitacion.crearCuenta"), primario: true },
      { href: `${SITIO}/bienvenida`, texto: t("invitacion.comoFunciona") },
    ],
    motivo: t("invitacion.motivo"),
  });
}
