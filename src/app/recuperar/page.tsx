import Link from "next/link";
import { MarcoAcceso } from "@/components/layout/marco-acceso";
import { RecuperarFormulario } from "./recuperar-formulario";

export default function RecuperarPage() {
  return (
    <MarcoAcceso>
      <div className="mb-8 mt-4 lg:mt-0">
        <h1 className="font-display text-xl font-semibold tracking-[-0.02em] text-ink-900">
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
    </MarcoAcceso>
  );
}
