import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { CerrarSesionBoton } from "@/components/cerrar-sesion-boton";
import { Icono } from "@/components/ui/icono";
import { Logotipo } from "@/components/ui/logotipo";
import { BotonNotificaciones } from "@/components/pwa/boton-notificaciones";
import { DespacharAvisosAcceso } from "@/components/pwa/despachar-avisos-acceso";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("cuenta.metadatos");
  return { title: t("solicitudPendiente"), robots: { index: false, follow: false } };
}

/**
 * A donde cae una cuenta sin invitación ni aprobación mientras Yalope está en prueba (el
 * gate está en el middleware: bloquea incluso antes de `/completar-perfil`). Fuera del
 * grupo `(app)` por el mismo motivo que `/suspendido`.
 */
export default async function SolicitudPendientePage() {
  const t = await getTranslations("solicitudPendiente");
  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-6 py-12">
      {/* Recién registrada, la base ya dejó el aviso a los admins en la campanita (0092): el
          push sale desde el navegador, después de mostrar la pantalla. Si ya salió, no hace nada. */}
      <DespacharAvisosAcceso />
      <Logotipo tamano="sm" />
      <span className="mt-8 flex h-11 w-11 items-center justify-center rounded-full acento-fondo text-brand-600">
        <Icono nombre="campana" className="h-5 w-5" />
      </span>
      <h1 className="mt-4 font-display text-xl font-semibold tracking-[-0.02em] text-texto">
        {t("titulo")}
      </h1>
      <p className="mt-2 text-base leading-relaxed text-texto-tenue">{t("texto")}</p>
      <div className="mt-7">
        <BotonNotificaciones titulo={t("avisoTitulo")} ayuda={t("avisoAyuda")} />
      </div>
      <div className="mt-7">
        <CerrarSesionBoton />
      </div>
    </main>
  );
}
