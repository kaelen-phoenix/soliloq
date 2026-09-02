"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Icono } from "@/components/ui/icono";
import { createClient } from "@/lib/supabase/client";

export function CampanitaNotificaciones({ userId }: { userId: string }) {
  const [noLeidas, setNoLeidas] = useState(0);

  useEffect(() => {
    const supabase = createClient();

    async function cargarConteo() {
      const { count } = await supabase
        .from("notificaciones")
        .select("id", { count: "exact", head: true })
        .eq("destinatario_id", userId)
        .is("leida_en", null);
      setNoLeidas(count ?? 0);
    }

    cargarConteo();

    const canal = supabase
      .channel(`notificaciones-badge-${userId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notificaciones", filter: `destinatario_id=eq.${userId}` },
        () => cargarConteo()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(canal);
    };
  }, [userId]);

  return (
    <Link
      href="/notificaciones"
      aria-label={noLeidas > 0 ? `Notificaciones, ${noLeidas} sin leer` : "Notificaciones"}
      className="relative inline-flex h-9 w-9 items-center justify-center rounded-full text-texto-tenue transition-colors hover:bg-fondo-sutil hover:text-texto"
    >
      <Icono nombre="campana" />
      {noLeidas > 0 && (
        <span className="absolute right-1 top-1 flex h-[15px] min-w-[15px] items-center justify-center rounded-full bg-brand-500 px-1 text-2xs font-semibold leading-none text-white ring-2 ring-white">
          {noLeidas > 9 ? "9+" : noLeidas}
        </span>
      )}
    </Link>
  );
}
