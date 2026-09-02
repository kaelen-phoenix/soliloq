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

export default function ElegirRolPage({
  searchParams,
}: {
  searchParams: { next?: string };
}) {
  const [cargando, setCargando] = useState<RolUsuario | null>(null);
  const router = useRouter();

  // Solo destinos internos: sin esto, `next` sería un redirect abierto.
  const next =
    searchParams.next?.startsWith("/") && !searchParams.next.startsWith("//")
      ? searchParams.next
      : undefined;

  async function elegir(rol: RolUsuario) {
    setCargando(rol);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    await supabase.from("perfiles").update({ rol }).eq("id", user.id);
    router.replace(
      next ? `/completar-perfil?next=${encodeURIComponent(next)}` : "/completar-perfil"
    );
    router.refresh();
  }

  return (
    // En escritorio: fondo teñido y la decisión dentro de una tarjeta. En móvil no cambia
    // nada — ahí la pantalla entera ya es la tarjeta.
    <main className="flex min-h-screen flex-col justify-center px-6 py-12 sm:bg-fondo-sutil">
      <div className="mx-auto flex w-full max-w-sm flex-col gap-3 sm:rounded-2xl sm:border sm:border-borde sm:bg-superficie sm:p-8 sm:shadow-tarjeta">
      <div className="mb-4">
        <h1 className="text-2xl font-semibold leading-tight tracking-[-0.025em] text-texto">
          ¿Con cuál querés empezar?
        </h1>
        <p className="mt-2 text-base leading-snug text-texto-tenue">
          Elegí tu primer perfil. Después vas a poder sumar el otro y alternar entre los dos.
        </p>
      </div>

      {OPCIONES.map((opcion) => (
        <button
          key={opcion.rol}
          onClick={() => elegir(opcion.rol)}
          disabled={cargando !== null}
          className="group flex items-center gap-4 rounded-2xl border border-borde p-5 text-left transition-colors hover:border-texto disabled:opacity-50"
        >
          <div className="flex-1">
            <h2 className="text-base font-semibold text-texto">{opcion.titulo}</h2>
            <p className="mt-1 text-sm leading-snug text-texto-tenue">{opcion.detalle}</p>
          </div>
          <Icono
            nombre="flecha-derecha"
            className="h-4 w-4 shrink-0 text-texto-tenue transition-colors group-hover:text-texto"
          />
        </button>
      ))}
      </div>
    </main>
  );
}
