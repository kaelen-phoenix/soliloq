import type { Metadata } from "next";
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
export default function SuspendidoPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-6 py-12">
      <Logotipo tamano="sm" />
      <h1 className="mt-8 font-display text-xl font-semibold tracking-[-0.02em] text-ink-900">
        Tu cuenta está suspendida
      </h1>
      <p className="mt-2 text-base leading-relaxed text-ink-500">
        Un administrador suspendió el acceso a esta cuenta. Si creés que es un error,
        escribinos y lo revisamos.
      </p>
      <div className="mt-7">
        <CerrarSesionBoton />
      </div>
    </main>
  );
}
