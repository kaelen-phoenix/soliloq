// Mails de Supabase Auth (#351): salen por el SMTP de Resend, desde info@yalope.com, en
// castellano y con el mismo diseño que los mails de la app (src/lib/correos/plantilla.ts).
// Antes salían del servidor de Supabase: en inglés y con un tope de 2 mails por hora.
//
//   node scripts/supabase-auth-mails.mts            → muestra qué se aplicaría (sin secretos)
//   node scripts/supabase-auth-mails.mts --aplicar  → lo aplica a prod
//
// Necesita SUPABASE_ACCESS_TOKEN y RESEND_API_KEY (o los archivos de ~/.soliloq-deploy/), y
// Node 22.18 o más: corre TypeScript directo, sin compilar (el CI usa Node 20, pero este
// script se corre a mano).
// Staging queda con el SMTP de Supabase a propósito: los E2E usan dominios de prueba.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { armarMail } from "../src/lib/correos/plantilla.ts";

const PROD = "ydnafjmznntfmzrsijko";
const ENLACE = "{{ .ConfirmationURL }}";
const NO_FUISTE = "Si no fuiste vos, ignorá este mail.";

function secreto(variable: string, archivo: string): string {
  return (process.env[variable] ?? fs.readFileSync(path.join(os.homedir(), ".soliloq-deploy", archivo), "utf8")).trim();
}

const mails = {
  confirmation: armarMail({
    asunto: "Confirmá tu email para entrar a Yalope",
    previa: "Un paso más para terminar de crear tu cuenta.",
    titulo: "Confirmá tu email",
    parrafos: ["Para terminar de crear tu cuenta en Yalope, confirmá que este email es tuyo."],
    botones: [{ href: ENLACE, texto: "Confirmar mi email", primario: true }],
    motivo: `Te llega este mail porque se creó una cuenta en Yalope con esta dirección. ${NO_FUISTE}`,
  }),
  recovery: armarMail({
    asunto: "Cambiá tu contraseña de Yalope",
    previa: "El enlace vence en una hora.",
    titulo: "Cambiá tu contraseña",
    parrafos: [
      "Recibimos un pedido para cambiar la contraseña de tu cuenta de Yalope.",
      "Tocá el botón para elegir una nueva. El enlace sirve una sola vez y vence en una hora.",
    ],
    botones: [{ href: ENLACE, texto: "Elegir una contraseña nueva", primario: true }],
    motivo: "Si no lo pediste vos, ignorá este mail: tu contraseña no cambia.",
  }),
  magic_link: armarMail({
    asunto: "Tu enlace para entrar a Yalope",
    previa: "El enlace vence en una hora.",
    titulo: "Entrá a Yalope",
    parrafos: ["Tocá el botón para entrar. El enlace sirve una sola vez y vence en una hora."],
    botones: [{ href: ENLACE, texto: "Entrar", primario: true }],
    motivo: `Te llega este mail porque se pidió un enlace para entrar con esta dirección. ${NO_FUISTE}`,
  }),
  email_change: armarMail({
    asunto: "Confirmá tu nuevo email en Yalope",
    previa: "Confirmá el cambio de email de tu cuenta.",
    titulo: "Confirmá tu nuevo email",
    parrafos: ["Para cambiar el email de tu cuenta de Yalope a {{ .NewEmail }}, confirmá con el botón."],
    botones: [{ href: ENLACE, texto: "Confirmar el cambio", primario: true }],
    motivo: `Te llega este mail porque se pidió cambiar el email de una cuenta de Yalope. ${NO_FUISTE}`,
  }),
  invite: armarMail({
    asunto: "Te invitaron a Yalope",
    previa: "Creá tu cuenta con el enlace.",
    titulo: "Te invitaron a Yalope",
    parrafos: ["Tocá el botón para crear tu cuenta en Yalope."],
    botones: [{ href: ENLACE, texto: "Crear mi cuenta", primario: true }],
    motivo: "Te llega este mail porque alguien te invitó a Yalope.",
  }),
  reauthentication: armarMail({
    asunto: "Tu código de verificación de Yalope: {{ .Token }}",
    previa: "Usalo para confirmar que sos vos.",
    titulo: "Tu código: {{ .Token }}",
    parrafos: ["Escribí este código en Yalope para confirmar que sos vos. Vence en una hora."],
    botones: [],
    motivo: `Te llega este mail porque se pidió un código para tu cuenta de Yalope. ${NO_FUISTE}`,
  }),
};

const config: Record<string, unknown> = {
  smtp_host: "smtp.resend.com",
  smtp_port: "465",
  smtp_user: "resend",
  smtp_admin_email: "info@yalope.com",
  smtp_sender_name: "Yalope",
  // Con SMTP propio el tope lo pone Resend; 30 por hora alcanza para las altas sin abrir la
  // puerta a que alguien use el formulario para mandar mails en masa.
  rate_limit_email_sent: 30,
};
for (const [tipo, m] of Object.entries(mails)) {
  config[`mailer_subjects_${tipo}`] = m.asunto;
  config[`mailer_templates_${tipo}_content`] = m.html;
}

if (!process.argv.includes("--aplicar")) {
  for (const [k, v] of Object.entries(config)) {
    console.log(k, "→", typeof v === "string" && v.length > 80 ? `${v.length} caracteres de HTML` : v);
  }
  console.log("\nSin --aplicar no se cambia nada.");
} else {
  const r = await fetch(`https://api.supabase.com/v1/projects/${PROD}/config/auth`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${secreto("SUPABASE_ACCESS_TOKEN", "supabase-token.txt")}`,
      "Content-Type": "application/json; charset=utf-8",
    },
    body: JSON.stringify({ ...config, smtp_pass: secreto("RESEND_API_KEY", "resend-key.txt") }),
  });
  console.log(r.ok ? "Aplicado." : `Falló: HTTP ${r.status} ${(await r.text()).slice(0, 300)}`);
  if (!r.ok) process.exit(1);
}
