"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Icono } from "@/components/ui/icono";
import { createClient } from "@/lib/supabase/client";

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

  const hayNoLeidas = notificaciones.some((n) => !n.leida_en);

  async function marcarLeida(id: string) {
    setNotificaciones((prev) =>
      prev.map((n) => (n.id === id ? { ...n, leida_en: n.leida_en ?? new Date().toISOString() } : n))
    );
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
      <div className="flex flex-col items-center rounded-2xl border border-dashed border-ink-200 px-8 py-12 text-center">
        <Icono nombre="campana" className="h-8 w-8 text-ink-300" />
        <p className="mt-3 text-[15px] font-medium text-ink-900">Sin notificaciones</p>
        <p className="mt-1 text-[13px] leading-snug text-ink-500">
          Acá vas a ver los avisos de match y de nuevas salas de proyecto.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {hayNoLeidas && (
        <button
          type="button"
          onClick={marcarTodasLeidas}
          className="self-end text-[12px] font-medium text-ink-500 hover:text-ink-900"
        >
          Marcar todas como leídas
        </button>
      )}

      <ul className="flex flex-col gap-2">
        {notificaciones.map((n) => (
          <li key={n.id}>
            <button
              type="button"
              onClick={() => abrir(n)}
              className={`flex w-full items-start gap-3 rounded-xl border p-4 text-left transition-colors ${
                n.leida_en ? "border-ink-100 bg-white" : "border-ink-200 bg-ink-50"
              }`}
            >
              {!n.leida_en && <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-500" />}
              <div className={n.leida_en ? "pl-[18px]" : ""}>
                <p className="text-[14px] leading-snug text-ink-900">
                  {n.tipo === "match" ? (
                    <>
                      Te aprobaron para <span className="font-medium">{tituloObra(n)}</span>
                    </>
                  ) : (
                    <>
                      Se abrió la sala de <span className="font-medium">{tituloObra(n)}</span>
                    </>
                  )}
                </p>
                <p className="mt-0.5 text-[11px] text-ink-400">
                  {new Date(n.creado_en).toLocaleString("es-AR", {
                    day: "numeric",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
