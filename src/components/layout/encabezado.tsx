import type { RolUsuario } from "@/lib/supabase/types";
import { CampanitaNotificaciones } from "./campanita-notificaciones";
import { ConmutadorModo } from "./conmutador-modo";

export function Encabezado({
  titulo,
  userId,
  modoActivo,
  tieneAmbosPerfiles,
  rolFaltante,
}: {
  titulo: string;
  userId: string;
  modoActivo: RolUsuario;
  tieneAmbosPerfiles: boolean;
  rolFaltante: RolUsuario | null;
}) {
  return (
    <header className="safe-top sticky top-0 z-20 border-b border-ink-100 bg-white/95 backdrop-blur">
      <div className="flex items-center justify-between px-4 pb-1 pt-3">
        <h1 className="text-lg font-semibold text-ink-900">{titulo}</h1>
        <CampanitaNotificaciones userId={userId} />
      </div>
      <div className="px-4 pb-2">
        <ConmutadorModo
          modoActivo={modoActivo}
          tieneAmbosPerfiles={tieneAmbosPerfiles}
          rolFaltante={rolFaltante}
        />
      </div>
    </header>
  );
}
