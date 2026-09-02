import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { Icono } from "@/components/ui/icono";
import type { RolUsuario } from "@/lib/supabase/types";
import { CampanitaNotificaciones } from "./campanita-notificaciones";
import { ConmutadorModo } from "./conmutador-modo";
import { TituloSeccion } from "./titulo-seccion";

export async function Encabezado({
  userId,
  modoActivo,
  tieneAmbosPerfiles,
  rolFaltante,
}: {
  userId: string;
  modoActivo: RolUsuario;
  tieneAmbosPerfiles: boolean;
  rolFaltante: RolUsuario | null;
}) {
  const t = await getTranslations("nav");
  return (
    <header className="superficie-portada safe-top sticky top-0 z-20 border-b border-borde bg-superficie/75 backdrop-blur-xl">
      <div className="flex w-full items-end justify-between px-5 pb-3 pt-4">
        <div className="flex min-w-0 flex-col gap-1.5">
          <ConmutadorModo
            modoActivo={modoActivo}
            tieneAmbosPerfiles={tieneAmbosPerfiles}
            rolFaltante={rolFaltante}
          />
          <TituloSeccion modoActivo={modoActivo} />
        </div>
        <div className="flex items-center gap-1">
          <CampanitaNotificaciones userId={userId} />
          <Link
            href="/ajustes"
            aria-label={t("ajustes")}
            className="rounded-lg p-1.5 text-ink-400 transition-colors hover:bg-fondo-sutil hover:text-ink-700"
          >
            <Icono nombre="ajustes" className="h-5 w-5" />
          </Link>
        </div>
      </div>
    </header>
  );
}
