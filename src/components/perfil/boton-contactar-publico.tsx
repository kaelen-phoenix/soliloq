"use client";

import Link from "next/link";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Boton } from "@/components/ui/boton";

/**
 * "Contactar" desde la vidriera anónima. Sin sesión, es un link a registro que vuelve acá
 * mismo (`?next=`). Con sesión, marca interés hacia el dueño y muestra el resultado — el
 * circuito completo (sala, si es mutuo) lo resuelve el trigger existente de `intereses_equipo`.
 */
export function BotonContactarPublico({
  token,
  haySesion,
}: {
  token: string;
  haySesion: boolean;
}) {
  const [estado, setEstado] = useState<"inicial" | "cargando" | "exito" | "error">("inicial");

  if (!haySesion) {
    return (
      <Link
        href={`/ingresar?next=${encodeURIComponent(`/p/${token}`)}`}
        className="inline-flex items-center justify-center gap-2 rounded-xl bg-accion px-4 py-2.5 text-sm font-medium text-accion-texto transition-colors hover:opacity-90"
      >
        Contactar
      </Link>
    );
  }

  if (estado === "exito") {
    return (
      <p role="status" className="text-sm font-medium text-exito-600">
        Le llegó tu interés. Si responde, se abre una sala para hablar.
      </p>
    );
  }

  async function contactar() {
    setEstado("cargando");
    const supabase = createClient();
    const { error } = await supabase.rpc("contactar_desde_perfil", { p_token: token });
    setEstado(error ? "error" : "exito");
  }

  return (
    <div className="flex flex-col gap-2">
      <Boton onClick={contactar} cargando={estado === "cargando"} textoCargando="Enviando…">
        Contactar
      </Boton>
      {estado === "error" && (
        <p className="text-xs text-error-600">No pudimos enviar tu interés. Probá de nuevo.</p>
      )}
    </div>
  );
}
