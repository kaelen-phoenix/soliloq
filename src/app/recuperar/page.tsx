import Link from "next/link";
import { RecuperarFormulario } from "./recuperar-formulario";

export default function RecuperarPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-6 py-12">
      <div className="mb-10">
        <h1 className="text-2xl font-semibold leading-none tracking-[-0.03em] text-ink-900">
          Recuperar acceso
        </h1>
        <p className="mt-2.5 text-base leading-snug text-ink-500">
          Te mandamos un enlace para elegir una contraseña nueva.
        </p>
      </div>

      <RecuperarFormulario />

      <Link
        href="/ingresar"
        className="mt-5 self-start text-sm text-ink-500 underline underline-offset-4 hover:text-ink-900"
      >
        Volver al ingreso
      </Link>
    </main>
  );
}
