/**
 * Base común de los mails de Yalope (#272): el mismo diseño para la bienvenida y los avisos.
 *
 * HTML de mail, no de web: tablas y estilos en línea, que es lo único que Gmail, Outlook y
 * los clientes del celular respetan igual. Colores de la marca (negro cálido; la acción en el
 * naranja de `.bg-accion`, sólido porque Outlook no pinta degradés). Siempre sale también la
 * versión en texto plano.
 */
import type { Idioma } from "@/i18n/request";
import { textosCorreo } from "./textos";

export const SITIO = "https://yalope.com";
const CORREO = "info@yalope.com";
const ISOTIPO = `${SITIO}/icons/icon-192.png?v=2`;

export type BotonMail = { href: string; texto: string; primario?: boolean };

export function armarMail(contenido: {
  /** El de quien recibe el mail: el pie y el `lang` salen en ese idioma. */
  idioma: Idioma;
  asunto: string;
  /** Texto corto que muestran las bandejas al lado del asunto. */
  previa: string;
  titulo: string;
  parrafos: string[];
  botones: BotonMail[];
  /** Bloque opcional debajo de los botones (título + ítems). */
  lista?: { titulo: string; items: string[] };
  /** Por qué le llega este mail. */
  motivo: string;
}) {
  const esc = (t: string) =>
    t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  const boton = (b: BotonMail) => `
      <tr><td style="padding-bottom:12px;">
        <a href="${b.href}" style="display:inline-block;padding:13px 26px;border-radius:999px;font-weight:600;font-size:15px;text-decoration:none;${
          b.primario
            ? "background-color:#c4350c;color:#ffffff;"
            : "background-color:transparent;color:#f5efe9;border:1px solid #3a3234;"
        }">${esc(b.texto)}</a>
      </td></tr>`;

  const lista = contenido.lista
    ? `
      <tr><td style="border-top:1px solid #2a2325;padding-top:24px;">
        <p style="margin:0 0 12px;font-size:15px;font-weight:600;color:#ffffff;">${esc(contenido.lista.titulo)}</p>
        ${contenido.lista.items
          .map((i) => `<p style="margin:0 0 8px;font-size:15px;line-height:1.55;color:#d9cfc7;">${i}</p>`)
          .join("\n        ")}
      </td></tr>`
    : "";

  const pie = textosCorreo(contenido.idioma)("plantilla.pie", { correo: CORREO });

  const html = `<!doctype html>
<html lang="${contenido.idioma}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="dark light">
<title>${esc(contenido.asunto)}</title>
</head>
<body style="margin:0;padding:0;background-color:#0c0a0b;">
<div style="display:none;max-height:0;overflow:hidden;">${esc(contenido.previa)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#0c0a0b;">
  <tr><td align="center" style="padding:32px 16px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;font-family:Inter,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#f5efe9;">
      <tr><td style="padding-bottom:28px;">
        <img src="${ISOTIPO}" width="44" height="44" alt="Yalope" style="display:block;border-radius:12px;">
      </td></tr>
      <tr><td>
        <h1 style="margin:0 0 16px;font-size:26px;line-height:1.25;font-weight:700;color:#ffffff;">${esc(contenido.titulo)}</h1>
        ${contenido.parrafos
          .map((p, i) => `<p style="margin:0 0 ${i === contenido.parrafos.length - 1 ? 28 : 14}px;font-size:16px;line-height:1.6;color:#d9cfc7;">${esc(p)}</p>`)
          .join("\n        ")}
      </td></tr>
      ${contenido.botones.map(boton).join("")}
      <tr><td style="padding-bottom:20px;"></td></tr>
      ${lista}
      <tr><td style="padding-top:32px;">
        <p style="margin:0;font-size:12px;line-height:1.6;color:#8c8079;">${esc(contenido.motivo)} ${esc(pie).replace(CORREO, `<a href="mailto:${CORREO}" style="color:#8c8079;">${CORREO}</a>`)}<br><a href="${SITIO}" style="color:#8c8079;">yalope.com</a></p>
      </td></tr>
    </table>
  </td></tr>
</table>
</body>
</html>`;

  // En el texto plano los ítems de la lista van sin HTML (pueden traer un link).
  const sinHtml = (t: string) =>
    t.replace(/<a [^>]*href="([^"]+)"[^>]*>([^<]*)<\/a>/g, "$2 ($1)").replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ");
  const texto = [
    contenido.titulo,
    "",
    ...contenido.parrafos.flatMap((p) => [p, ""]),
    ...contenido.botones.map((b) => `${b.texto}: ${b.href}`),
    ...(contenido.lista ? ["", `${contenido.lista.titulo}:`, ...contenido.lista.items.map((i) => `- ${sinHtml(i).trim()}`)] : []),
    "",
    `${contenido.motivo} ${pie}`,
    SITIO,
  ].join("\n");

  return { asunto: contenido.asunto, html, texto };
}
