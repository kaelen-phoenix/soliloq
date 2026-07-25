"use client";

import { usePathname } from "next/navigation";
import type { RolUsuario } from "@/lib/supabase/types";

const TITULOS: { patron: RegExp; titulo: string }[] = [
  { patron: /^\/postulaciones/, titulo: "Postulaciones" },
  { patron: /^\/salas\/.+/, titulo: "Sala" },
  { patron: /^\/salas$/, titulo: "Salas" },
  { patron: /^\/notificaciones/, titulo: "Notificaciones" },
  { patron: /^\/perfil\/nuevo/, titulo: "Nuevo perfil" },
  { patron: /^\/perfil/, titulo: "Tu perfil" },
  { patron: /^\/obras\/nueva/, titulo: "Nueva obra" },
  { patron: /^\/obras\/.+\/roles\/.+/, titulo: "Postulantes" },
  { patron: /^\/obras\/.+/, titulo: "Obra" },
  { patron: /^\/talentos\/.+/, titulo: "Perfil" },
  { patron: /^\/creadores\/.+/, titulo: "Perfil" },
];

export function TituloSeccion({ modoActivo }: { modoActivo: RolUsuario }) {
  const pathname = usePathname();
  const coincidencia = TITULOS.find((t) => t.patron.test(pathname));
  const titulo =
    coincidencia?.titulo ?? (modoActivo === "talento" ? "Convocatorias" : "Tu tablero");

  return <h1 className="text-[22px] font-semibold leading-none text-ink-900">{titulo}</h1>;
}
