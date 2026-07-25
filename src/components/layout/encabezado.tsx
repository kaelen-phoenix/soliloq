import { CampanitaNotificaciones } from "./campanita-notificaciones";

export function Encabezado({ titulo, userId }: { titulo: string; userId: string | null }) {
  return (
    <header className="safe-top sticky top-0 z-20 flex items-center justify-between border-b border-ink-100 bg-white/95 px-4 py-3 backdrop-blur">
      <h1 className="text-lg font-semibold text-ink-900">{titulo}</h1>
      {userId && <CampanitaNotificaciones userId={userId} />}
    </header>
  );
}
