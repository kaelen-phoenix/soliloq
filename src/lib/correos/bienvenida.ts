import { armarMail, SITIO } from "./plantilla";

/**
 * Mail de bienvenida (#272): el mismo para todos, con el link de la app y el de la landing.
 * Sale al aceptar las Normas (cuando alguien ya puede entrar) y desde el panel de admin.
 */
export function mailBienvenida(opciones: { discord?: string | null } = {}) {
  const discord = opciones.discord || null;
  return armarMail({
    asunto: "🎭 Te damos la bienvenida a Yalope",
    previa: "Ya sos parte de la comunidad de actores, actrices y creadores de Yalope.",
    titulo: "¡Te damos la bienvenida a Yalope!",
    parrafos: [
      "Ya sos parte de la comunidad donde actores, actrices y creadores se encuentran para armar proyectos: deslizás perfiles y propuestas, y cuando el interés es de los dos lados, se abre el chat.",
      "Ya podés entrar y completar tu perfil para empezar.",
    ],
    botones: [
      { href: `${SITIO}/ingresar`, texto: "Entrar a Yalope", primario: true },
      // Abre el recorrido guiado; sin sesión, la portada que explica cómo funciona.
      { href: `${SITIO}/?tour=1`, texto: "Conocé cómo funciona" },
    ],
    lista: {
      titulo: "Para arrancar con todo",
      items: [
        "🎬 &nbsp;Subí al menos 3 fotos y tu videoreel: es lo primero que miran.",
        "🔔 &nbsp;Activá las notificaciones para enterarte de cada match y cada mensaje.",
        "📱 &nbsp;Instalá la app desde el navegador del celular: «Agregar a la pantalla de inicio».",
        ...(discord
          ? [`💬 &nbsp;Sumate a la comunidad en <a href="${discord}" style="color:#f2571e;text-decoration:underline;">Discord</a>.`]
          : []),
      ],
    },
    motivo: "Te llega este mail porque tenés una cuenta en Yalope.",
  });
}
