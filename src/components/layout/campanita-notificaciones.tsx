"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
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
    <Link href="/notificaciones" className="relative inline-flex h-9 w-9 items-center justify-center rounded-full hover:bg-ink-100">
      <span className="text-xl" aria-hidden>
        🔔
      </span>
      {noLeidas > 0 && (
        <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-brand-500 px-1 text-[10px] font-bold leading-none text-white">
          {noLeidas > 9 ? "9+" : noLeidas}
        </span>
      )}
    </Link>
  );
}
