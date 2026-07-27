"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { mensajeErrorAuth, validarClave } from "@/lib/clave";
import { Boton } from "@/components/ui/boton";
import { CampoTexto } from "@/components/ui/campo-texto";

export function CambiarClaveFormulario({ destinoAlTerminar }: { destinoAlTerminar: string }) {
  const router = useRouter();
  const [clave, setClave] = useState("");
  const [repetida, setRepetida] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);
  const [listo, setListo] = useState(false);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const errorClave = validarClave(clave);
    if (errorClave) {
      setError(errorClave);
      return;
    }
    if (clave !== repetida) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    setCargando(true);
    const supabase = createClient();
    const { error: errorCambio } = await supabase.auth.updateUser({ password: clave });
    setCargando(false);

    if (errorCambio) {
      setError(mensajeErrorAuth(errorCambio.code, errorCambio.message));
      return;
    }

    setListo(true);
    router.replace(destinoAlTerminar);
    router.refresh();
  }

  if (listo) {
    return (
      <p className="rounded-xl bg-green-50 px-4 py-3 text-[13px] text-green-800">
        Listo, tu contraseña quedó actualizada.
      </p>
    );
  }

  return (
    <form onSubmit={enviar} className="flex flex-col gap-4">
      <CampoTexto
        id="clave"
        etiqueta="Contraseña nueva"
        type="password"
        autoComplete="new-password"
        placeholder="Al menos 8 caracteres"
        value={clave}
        onChange={(e) => setClave(e.target.value)}
      />
      <CampoTexto
        id="clave-repetida"
        etiqueta="Repetila"
        type="password"
        autoComplete="new-password"
        value={repetida}
        onChange={(e) => setRepetida(e.target.value)}
        error={error ?? undefined}
      />
      <Boton type="submit" cargando={cargando}>
        Guardar contraseña
      </Boton>
    </form>
  );
}
