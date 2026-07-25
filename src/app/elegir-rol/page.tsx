"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Boton } from "@/components/ui/boton";
import type { RolUsuario } from "@/lib/supabase/types";

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
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-6 px-6 py-10">
      <div className="text-center">
        <h1 className="text-xl font-bold text-ink-900">¿Cómo querés usar Soliloq?</h1>
        <p className="mt-1 text-sm text-ink-500">
          Podés corregirlo mientras no hayas creado tu perfil. Después queda fijo.
        </p>
      </div>

      <button
        onClick={() => elegir("talento")}
        disabled={cargando !== null}
        className="rounded-card border border-ink-100 bg-white p-5 text-left transition-shadow hover:shadow-md disabled:opacity-60"
      >
        <p className="text-2xl">🎭</p>
        <h2 className="mt-2 font-semibold text-ink-900">Soy Talento</h2>
        <p className="text-sm text-ink-500">Actor, actriz o técnico. Armá tu perfil y postulate a convocatorias.</p>
      </button>

      <button
        onClick={() => elegir("creador")}
        disabled={cargando !== null}
        className="rounded-card border border-ink-100 bg-white p-5 text-left transition-shadow hover:shadow-md disabled:opacity-60"
      >
        <p className="text-2xl">🎬</p>
        <h2 className="mt-2 font-semibold text-ink-900">Soy Creador</h2>
        <p className="text-sm text-ink-500">Director o compañía. Publicá tu obra y armá tu elenco.</p>
      </button>

      {cargando && <Boton cargando className="mx-auto" disabled />}
    </main>
  );
}
