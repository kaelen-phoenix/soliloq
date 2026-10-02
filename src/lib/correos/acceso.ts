import { armarMail, SITIO } from "./plantilla";

/** A la persona, cuando un admin la habilita (#247). */
export function mailAccesoHabilitado() {
  return armarMail({
    asunto: "🎭 Ya tenés acceso a Yalope",
    previa: "Tu solicitud fue aprobada: ya podés entrar.",
    titulo: "¡Ya tenés acceso a Yalope!",
    parrafos: [
      "Tu solicitud fue aprobada. Ya podés entrar a la plataforma y crear tu perfil para empezar a formar parte de la comunidad.",
      "¡Te esperamos!",
    ],
    botones: [{ href: `${SITIO}/ingresar`, texto: "Entrar a Yalope", primario: true }],
    motivo: "Te llega este mail porque pediste acceso a Yalope.",
  });
}

/** A cada admin, cuando alguien sin invitación pide entrar (#248). */
export function mailSolicitudAcceso(datos: { email: string | null; fecha: Date }) {
  const cuando = datos.fecha.toLocaleString("es-AR", {
    timeZone: "America/Argentina/Buenos_Aires",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  });
  return armarMail({
    asunto: "🔔 Nueva solicitud de acceso a Yalope",
    previa: `${datos.email ?? "Alguien"} pidió entrar a Yalope.`,
    titulo: "Nueva solicitud de acceso",
    parrafos: [
      "Hay una nueva solicitud de acceso a Yalope pendiente de revisión.",
      `Email: ${datos.email ?? "(sin email)"}`,
      `Fecha: ${cuando}`,
      "Podés entrar al panel de administración para revisarla y decidir si habilitás el acceso.",
    ],
    botones: [{ href: `${SITIO}/admin`, texto: "Ver solicitud", primario: true }],
    motivo: "Te llega este mail porque sos Administrador de Yalope.",
  });
}

/**
 * A un email que un admin invitó y todavía no tiene cuenta (#272): entra directo, sin
 * esperar aprobación (0078). El link abre «Crear cuenta»; con Google también sirve.
 */
export function mailInvitacion() {
  return armarMail({
    asunto: "🎭 Te invitaron a Yalope",
    previa: "Creá tu cuenta y entrá directo, sin esperar aprobación.",
    titulo: "¡Te invitaron a Yalope!",
    parrafos: [
      "Yalope es la comunidad donde actores, actrices y creadores se encuentran para armar proyectos: deslizás perfiles y propuestas, y cuando el interés es de los dos lados, se abre el chat.",
      "Tenés una invitación: creá tu cuenta con este mismo email (o con Google, si es tu cuenta de Gmail) y entrás directo, sin esperar aprobación.",
    ],
    botones: [
      { href: `${SITIO}/ingresar?modo=registrarme`, texto: "Crear mi cuenta", primario: true },
      { href: `${SITIO}/bienvenida`, texto: "Conocé cómo funciona" },
    ],
    motivo: "Te llega este mail porque alguien del equipo de Yalope te invitó.",
  });
}
