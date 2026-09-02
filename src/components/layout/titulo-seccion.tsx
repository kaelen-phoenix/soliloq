"use client";

import { usePathname } from "next/navigation";
import type { RolUsuario } from "@/lib/supabase/types";

const TITULOS: { patron: RegExp; titulo: string }[] = [
  { patron: /^\/postulaciones/, titulo: "Postulaciones" },
  { patron: /^\/equipo/, titulo: "Armar equipo" },
  { patron: /^\/salas\/.+/, titulo: "Sala" },
  { patron: /^\/salas$/, titulo: "Salas" },
  { patron: /^\/notificaciones/, titulo: "Notificaciones" },
  { patron: /^\/perfil\/nuevo/, titulo: "Nuevo perfil" },
  { patron: /^\/perfil/, titulo: "Tu perfil" },
  { patron: /^\/obras\/nueva/, titulo: "Nueva obra" },
  { patron: /^\/obras\/.+\/roles\/.+/, titulo: "Postulantes" },
  { patron: /^\/obras\/.+/, titulo: "Obra" },
  { patron: /^\/talentos\/.+/, titulo: "Perfil" },
  { patron: /^\/talentos$/, titulo: "Buscar talento" },
  { patron: /^\/creadores\/.+/, titulo: "Perfil" },
];

export function TituloSeccion({ modoActivo }: { modoActivo: RolUsuario }) {
  const pathname = usePathname();
  const coincidencia = TITULOS.find((t) => t.patron.test(pathname));
  const titulo =
    coincidencia?.titulo ?? (modoActivo === "talento" ? "Convocatorias" : "Mis proyectos");

  // En `display`: es el título de portada de cada pantalla y lo que le da a la app el
  // registro editorial de la marca. La interfaz (botones, etiquetas, campos) sigue en sans.
  // Sube a `2xl` en pantallas medianas para separarlo del cuerpo; en el teléfono se
  // queda en `xl` para no comerse el encabezado.
  return (
    <h1 className="font-display text-xl font-semibold leading-none tracking-[-0.02em] text-ink-900 sm:text-2xl">
      {titulo}
    </h1>
  );
}
