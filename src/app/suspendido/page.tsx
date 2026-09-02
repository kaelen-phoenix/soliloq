import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { CerrarSesionBoton } from "@/components/cerrar-sesion-boton";
import { Logotipo } from "@/components/ui/logotipo";

export const metadata: Metadata = {
  title: "Cuenta suspendida — Yalope",
  robots: { index: false, follow: false },
};

/**
 * A donde cae una cuenta suspendida por un admin (el gate está en `(app)/layout.tsx`).
 * Fuera del grupo `(app)` para no entrar en el mismo layout que la rebota.
 */
export default async function SuspendidoPage() {
  const t = await getTranslations("suspendido");
  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-6 py-12">
      <Logotipo tamano="sm" />
      <h1 className="mt-8 font-display text-xl font-semibold tracking-[-0.02em] text-ink-900">
        {t("titulo")}
      </h1>
      <p className="mt-2 text-base leading-relaxed text-ink-500">{t("texto")}</p>
      <div className="mt-7">
        <CerrarSesionBoton />
      </div>
    </main>
  );
}
