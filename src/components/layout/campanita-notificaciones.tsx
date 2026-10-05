"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { EVENTO_NOTIFICACIONES } from "@/lib/notificaciones-cliente";
import { avisarConvocatoriasNuevas } from "@/components/convocatorias/convocatorias-nuevas";
import { Icono } from "@/components/ui/icono";
import { createClient } from "@/lib/supabase/client";
import { suscribirConSesion } from "@/lib/supabase/realtime";

export function CampanitaNotificaciones({ userId }: { userId: string }) {
  const t = useTranslations("cuenta.layout");
  const [noLeidas, setNoLeidas] = useState(0);
  const pathname = usePathname();
  const [revision, setRevision] = useState(0);

  // #347: la campanita vive en el layout y no se vuelve a montar al navegar. Además de
  // Realtime (0106), recuenta al cambiar de pantalla, al volver a la app y cuando la lista
  // avisa que marcó algo como leído.
  useEffect(() => {
    const recontar = () => setRevision((r) => r + 1);
    const alVolver = () => {
      if (document.visibilityState === "visible") recontar();
    };
    window.addEventListener(EVENTO_NOTIFICACIONES, recontar);
    document.addEventListener("visibilitychange", alVolver);
    return () => {
      window.removeEventListener(EVENTO_NOTIFICACIONES, recontar);
      document.removeEventListener("visibilitychange", alVolver);
    };
  }, []);

  // El conteo: al montar, al navegar, al volver a la app y cuando la lista avisa.
  useEffect(() => {
    let vigente = true;
    createClient()
      .from("notificaciones")
      .select("id", { count: "exact", head: true })
      .eq("destinatario_id", userId)
      .is("leida_en", null)
      .then(({ count, error }) => {
        if (vigente && !error) setNoLeidas(count ?? 0);
      });
    return () => {
      vigente = false;
    };
  }, [userId, pathname, revision]);

  // Realtime (0106): una sola suscripción; cada cambio pide un recuento.
  useEffect(() => {
    const supabase = createClient();
    return suscribirConSesion(supabase, () =>
      supabase
        .channel(`notificaciones-badge-${userId}`)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "notificaciones", filter: `destinatario_id=eq.${userId}` },
          () => {
            setRevision((r) => r + 1);
            // Un match formado del otro lado llega como notificación `nuevo_match`: el corazón
            // de Convocatorias (#366) recuenta en el momento, sin esperar a que se navegue.
            avisarConvocatoriasNuevas();
          },
        )
        .subscribe(),
    );
  }, [userId]);

  return (
    <Link
      href="/notificaciones"
      data-tour="campanita"
      aria-label={
        noLeidas > 0 ? t("sinLeer", { etiqueta: t("notificaciones"), n: noLeidas }) : t("notificaciones")
      }
      className="relative inline-flex h-9 w-9 items-center justify-center rounded-full text-texto-tenue transition-colors hover:bg-fondo-sutil hover:text-texto"
    >
      <Icono nombre="campana" />
      {noLeidas > 0 && (
        <span className="absolute right-1 top-1 flex h-[15px] min-w-[15px] items-center justify-center rounded-full bg-brand-500 px-1 text-2xs font-semibold leading-none text-white ring-2 ring-superficie">
          {noLeidas > 9 ? "9+" : noLeidas}
        </span>
      )}
    </Link>
  );
}
