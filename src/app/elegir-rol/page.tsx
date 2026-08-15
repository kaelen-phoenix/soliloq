"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Icono } from "@/components/ui/icono";
import { createClient } from "@/lib/supabase/client";
import type { RolUsuario } from "@/lib/supabase/types";

const OPCIONES: { rol: RolUsuario; titulo: string; detalle: string }[] = [
  {
    rol: "talento",
    titulo: "Soy Talento",
    detalle: "Actor, actriz o técnico. Armá tu perfil y postulate a convocatorias.",
  },
  {
    rol: "creador",
    titulo: "Soy Creador",
    detalle: "Director o compañía. Publicá tu obra y armá tu elenco.",
  },
];

export default function ElegirRolPage() {
  const [cargando, setCargando] = useState<RolUsuario | null>(null);
  const router = useRouter();

  async function elegir(rol: RolUsuario) {
    setCargando(rol);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    await supabase.from("perfiles").update({ rol }).eq("id", user.id);
    router.replace("/completar-perfil");
    router.refresh();
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-3 px-6 py-12">
      <div className="mb-4">
        <h1 className="text-2xl font-semibold leading-tight tracking-[-0.025em] text-ink-900">
          ¿Con cuál querés empezar?
        </h1>
        <p className="mt-2 text-base leading-snug text-ink-500">
          Elegí tu primer perfil. Después vas a poder sumar el otro y alternar entre los dos.
        </p>
      </div>

      {OPCIONES.map((opcion) => (
        <button
          key={opcion.rol}
          onClick={() => elegir(opcion.rol)}
          disabled={cargando !== null}
          className="group flex items-center gap-4 rounded-2xl border border-ink-200 p-5 text-left transition-colors hover:border-ink-900 disabled:opacity-50"
        >
          <div className="flex-1">
            <h2 className="text-base font-semibold text-ink-900">{opcion.titulo}</h2>
            <p className="mt-1 text-sm leading-snug text-ink-500">{opcion.detalle}</p>
          </div>
          <Icono
            nombre="flecha-derecha"
            className="h-4 w-4 shrink-0 text-ink-300 transition-colors group-hover:text-ink-900"
          />
        </button>
      ))}
    </main>
  );
}
