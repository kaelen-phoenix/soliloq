import type { RolUsuario } from "@/lib/supabase/types";
import { CampanitaNotificaciones } from "./campanita-notificaciones";
import { ConmutadorModo } from "./conmutador-modo";
import { TituloSeccion } from "./titulo-seccion";

export function Encabezado({
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
  return (
    <header className="safe-top sticky top-0 z-20 border-b border-ink-100 bg-white/85 backdrop-blur-xl">
      <div className="mx-auto flex max-w-lg items-end justify-between px-5 pb-3 pt-4 lg:max-w-3xl xl:max-w-5xl">
        <div className="flex min-w-0 flex-col gap-1.5">
          <ConmutadorModo
            modoActivo={modoActivo}
            tieneAmbosPerfiles={tieneAmbosPerfiles}
            rolFaltante={rolFaltante}
          />
          <TituloSeccion modoActivo={modoActivo} />
        </div>
        <CampanitaNotificaciones userId={userId} />
      </div>
    </header>
  );
}
