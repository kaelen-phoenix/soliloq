"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import * as Sentry from "@sentry/nextjs";
import { Boton } from "@/components/ui/boton";
import { PantallaMensaje } from "@/components/ui/pantalla-mensaje";

/**
 * Cualquier error no manejado dentro de la app.
 *
 * El caso más probable no es un bug: **el proyecto de Supabase se pausa tras 7 días de
 * inactividad** y hay que reactivarlo a mano desde el dashboard. Por eso el texto no dice
 * "algo salió mal" a secas — dice qué hacer, y "reintentar" es la acción principal porque
 * con la base ya despierta suele alcanzar.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations("cuenta.error");
  useEffect(() => {
    // Next.js atrapa el error antes que Sentry acá — sin este captureException manual,
    // este límite (el más genérico, el que ve cualquiera) no manda nada.
    Sentry.captureException(error);
  }, [error]);

  return (
    <PantallaMensaje
      titulo={t("titulo")}
      detalle={t("detalle")}
      accion={<Boton onClick={reset}>{t("reintentar")}</Boton>}
    />
  );
}
