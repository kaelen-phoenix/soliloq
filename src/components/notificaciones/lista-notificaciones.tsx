"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Boton } from "@/components/ui/boton";

interface Notificacion {
  id: string;
  tipo: "match" | "sala_creada";
  leida_en: string | null;
  creado_en: string;
  obra_id: string | null;
  rol_id: string | null;
  sala_id: string | null;
  obras: { titulo: string } | { titulo: string }[] | null;
}

function tituloObra(n: Notificacion): string {
  if (!n.obras) return "una obra";
  return Array.isArray(n.obras) ? n.obras[0]?.titulo ?? "una obra" : n.obras.titulo;
}

export function ListaNotificaciones({ notificacionesIniciales }: { notificacionesIniciales: Notificacion[] }) {
  const [notificaciones, setNotificaciones] = useState(notificacionesIniciales);
  const router = useRouter();

  async function marcarLeida(id: string) {
    setNotificaciones((prev) => prev.map((n) => (n.id === id ? { ...n, leida_en: n.leida_en ?? new Date().toISOString() } : n)));
    const supabase = createClient();
    await supabase.from("notificaciones").update({ leida_en: new Date().toISOString() }).eq("id", id);
  }

  async function marcarTodasLeidas() {
    const ahora = new Date().toISOString();
    setNotificaciones((prev) => prev.map((n) => ({ ...n, leida_en: n.leida_en ?? ahora })));
    const supabase = createClient();
    await supabase.from("notificaciones").update({ leida_en: ahora }).is("leida_en", null);
  }

  async function abrir(n: Notificacion) {
    await marcarLeida(n.id);
    if (n.tipo === "sala_creada" && n.sala_id) {
      router.push(`/salas/${n.sala_id}`);
    } else if (n.tipo === "match" && n.obra_id) {
      router.push(`/obras/${n.obra_id}`);
    }
  }

  if (notificaciones.length === 0) {
    return (
      <div className="rounded-card border border-dashed border-ink-200 p-8 text-center">
        <p className="text-3xl">🔔</p>
        <p className="mt-2 font-medium text-ink-900">Sin notificaciones por ahora</p>
        <p className="mt-1 text-sm text-ink-500">
          Acá vas a ver los avisos de match y de nuevas salas de proyecto.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-ink-900">Notificaciones</h1>
        <Boton variante="fantasma" onClick={marcarTodasLeidas}>
          Marcar todas como leídas
        </Boton>
      </div>

      <ul className="flex flex-col gap-2">
        {notificaciones.map((n) => (
          <li key={n.id}>
            <button
              type="button"
              onClick={() => abrir(n)}
              className={`flex w-full items-start gap-3 rounded-card border p-4 text-left ${
                n.leida_en ? "border-ink-100 bg-white" : "border-brand-200 bg-brand-50"
              }`}
            >
              <span className="text-xl">{n.tipo === "match" ? "🎉" : "💬"}</span>
              <div>
                <p className="text-sm font-medium text-ink-900">
                  {n.tipo === "match"
                    ? `¡Match! Fuiste aprobado/a para ${tituloObra(n)}`
                    : `Se abrió la sala de proyecto de ${tituloObra(n)}`}
                </p>
                <p className="text-xs text-ink-500">{new Date(n.creado_en).toLocaleString("es-AR")}</p>
              </div>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
