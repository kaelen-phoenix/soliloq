"use client";

import { useTranslations } from "next-intl";
import { usePathname } from "next/navigation";
import type { RolUsuario } from "@/lib/supabase/types";

/** El valor es la clave en el namespace `titulos` de los mensajes. */
const TITULOS: { patron: RegExp; clave: string }[] = [
  { patron: /^\/postulaciones/, clave: "postulaciones" },
  { patron: /^\/equipo/, clave: "armarEquipo" },
  { patron: /^\/salas\/.+/, clave: "sala" },
  { patron: /^\/salas$/, clave: "salas" },
  { patron: /^\/notificaciones/, clave: "notificaciones" },
  { patron: /^\/perfil\/nuevo/, clave: "nuevoPerfil" },
  { patron: /^\/perfil/, clave: "tuPerfil" },
  { patron: /^\/ajustes/, clave: "ajustes" },
  { patron: /^\/admin/, clave: "admin" },
  { patron: /^\/obras\/nueva/, clave: "nuevaObra" },
  { patron: /^\/obras\/.+\/roles\/.+/, clave: "postulantes" },
  { patron: /^\/obras\/.+/, clave: "obra" },
  { patron: /^\/talentos\/.+/, clave: "perfil" },
  { patron: /^\/talentos$/, clave: "buscarTalento" },
  { patron: /^\/creadores\/.+/, clave: "perfil" },
];

export function TituloSeccion({ modoActivo }: { modoActivo: RolUsuario }) {
  const pathname = usePathname();
  const t = useTranslations("titulos");
  const coincidencia = TITULOS.find((x) => x.patron.test(pathname));
  const titulo = coincidencia
    ? t(coincidencia.clave)
    : modoActivo === "talento"
      ? t("convocatorias")
      : t("misProyectos");

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
