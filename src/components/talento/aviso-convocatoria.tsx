"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Icono } from "@/components/ui/icono";
import { Imagen } from "@/components/ui/imagen";
import { Superposicion } from "@/components/ui/superposicion";
import { createClient } from "@/lib/supabase/client";
import { responderConvocatoria } from "@/app/(app)/convocatoria/acciones";

interface AvisoFila {
  convocatoriaId: string;
  esEquipo: boolean;
  iniciativaTitulo: string;
  talentoFotoUrl: string | null;
  iniciativaFotoUrl: string | null;
}

/**
 * Ventana emergente de convocatoria definitiva (issue #203): a diferencia de
 * `ConvocatoriasLista` (la lista de `/convocatoria`, que solo se ve si el Talento navega
 * ahí), esta vive en el layout de toda el área logueada — aparece sola, en cualquier
 * pantalla, apenas hay una convocatoria pendiente (al entrar a la app, o en vivo por
 * Realtime si llega mientras ya está usándola).
 *
 * Cerrarla (Esc/click afuera) no rechaza nada — la convocatoria sigue "pendiente" en el
 * servidor y este mismo aviso vuelve a aparecer la próxima vez que se entra a la app. La
 * única acción real es "Aceptar", que es la misma que ya existía en `/convocatoria`
 * (`responderConvocatoria`) — no una instancia nueva de aceptación.
 */
export function AvisoConvocatoria({ userId }: { userId: string }) {
  const router = useRouter();
  const [cola, setCola] = useState<AvisoFila[]>([]);
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    const url = (path: string | null) =>
      path ? supabase.storage.from("fotos-perfil").getPublicUrl(path).data.publicUrl : null;

    async function cargar() {
      const { data } = await supabase.rpc("mis_convocatorias");
      const filas: AvisoFila[] = (data ?? []).map((c) => ({
        convocatoriaId: c.convocatoria_id,
        esEquipo: c.es_equipo,
        iniciativaTitulo: c.iniciativa_titulo,
        talentoFotoUrl: url(c.talento_foto),
        iniciativaFotoUrl: url(c.iniciativa_foto),
      }));
      setCola((prev) => {
        const vistas = new Set(prev.map((f) => f.convocatoriaId));
        return [...prev, ...filas.filter((f) => !vistas.has(f.convocatoriaId))];
      });
    }

    cargar();

    // El propio `convocar()` inserta esta notificación (0063) — reusarla evita un canal
    // Realtime nuevo, ya probado en vivo por `CampanitaNotificaciones`.
    const canal = supabase
      .channel(`convocatorias-aviso-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notificaciones",
          filter: `destinatario_id=eq.${userId}`,
        },
        (payload) => {
          if ((payload.new as { tipo?: string }).tipo === "convocado") cargar();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(canal);
    };
  }, [userId]);

  if (cola.length === 0) return null;
  const actual = cola[0];

  async function aceptar() {
    setOcupado(true);
    const res = await responderConvocatoria(actual.convocatoriaId, true);
    setOcupado(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setError(null);
    setCola((prev) => prev.slice(1));
    router.push("/salas");
  }

  return (
    <Superposicion
      onCerrar={() => setCola((prev) => prev.slice(1))}
      etiqueta={actual.esEquipo ? "Hay equipo" : "Hay proyecto"}
    >
      <div className="mx-auto w-full max-w-xs rounded-2xl bg-superficie p-5 text-center shadow-tarjeta">
        <p className="text-2xs font-semibold uppercase tracking-wide text-coral-700">
          {actual.esEquipo ? "Hay equipo" : "Hay proyecto"}
        </p>
        <div className="mt-4 flex items-center justify-center gap-3">
          {actual.talentoFotoUrl ? (
            <Imagen
              src={actual.talentoFotoUrl}
              alt=""
              width={64}
              height={64}
              contenedorClassName="h-16 w-16 rounded-full"
            />
          ) : (
            <span className="flex h-16 w-16 items-center justify-center rounded-full bg-ink-100 text-lg font-semibold text-texto-tenue">
              ·
            </span>
          )}
          <Icono nombre="corazon" relleno className="h-5 w-5 text-coral" />
          {actual.iniciativaFotoUrl ? (
            <Imagen
              src={actual.iniciativaFotoUrl}
              alt={actual.iniciativaTitulo}
              width={64}
              height={64}
              contenedorClassName="h-16 w-16 rounded-xl"
            />
          ) : (
            <span className="flex h-16 w-16 items-center justify-center rounded-xl bg-ink-100 p-1 text-2xs font-medium text-texto-tenue">
              {actual.iniciativaTitulo}
            </span>
          )}
        </div>
        <p className="mt-3 text-sm text-texto">
          Te convocan a <span className="font-medium">{actual.iniciativaTitulo}</span>
        </p>
        {error && <p className="mt-2 text-xs text-error-600">{error}</p>}
        <button
          type="button"
          disabled={ocupado}
          onClick={aceptar}
          className="mt-4 w-full rounded-xl bg-accion px-4 py-2.5 text-sm font-medium text-accion-texto disabled:opacity-50"
        >
          {ocupado ? "…" : "Aceptar"}
        </button>
      </div>
    </Superposicion>
  );
}
