"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icono } from "@/components/ui/icono";
import { BadgeNoLeidos, useNoLeidos } from "@/components/salas/no-leidos";
import { useConvocatoriasNuevas } from "@/components/convocatorias/convocatorias-nuevas";
import { esActivo, idTourNav, itemsParaNavegacion, PuntoNuevo } from "./items-navegacion";

/**
 * Navegación de teléfono: barra fija abajo, al alcance del pulgar.
 *
 * Desaparece en escritorio, donde el lugar lo toma `BarraLateral`. Los ítems salen de
 * `itemsParaNavegacion`, compartidos con ella.
 */
export function BarraNavegacion({
  esAdmin = false,
}: {
  esAdmin?: boolean;
}) {
  const pathname = usePathname();
  const t = useTranslations("nav");
  const tLayout = useTranslations("cuenta.layout");
  const items = itemsParaNavegacion({ esAdmin });
  const { total: noLeidos } = useNoLeidos();
  const convocatoriasNuevas = useConvocatoriasNuevas();

  return (
    <nav className="safe-bottom fixed inset-x-0 bottom-0 z-30 border-t border-borde bg-superficie/85 backdrop-blur-xl lg:hidden">
      <ul className="mx-auto flex max-w-lg items-stretch">
        {items.map((item) => {
          const activo = esActivo(pathname, item.href);
          const badge = item.href === "/salas" ? noLeidos : 0;
          // #366: el corazón se resalta mientras haya un Talento nuevo sin ver en Convocatorias.
          const resaltado = item.href === "/matches" && convocatoriasNuevas;
          return (
            <li key={item.href} className="flex-1">
              <Link
                href={item.href}
                data-tour={idTourNav(item.href)}
                aria-current={activo ? "page" : undefined}
                aria-label={
                  badge > 0
                    ? tLayout("sinLeer", { etiqueta: t(item.clave), n: badge })
                    : resaltado
                      ? tLayout("convocatoriasNuevas", { etiqueta: t(item.clave) })
                      : undefined
                }
                className={`flex flex-col items-center gap-1 pb-1.5 pt-2.5 text-2xs font-medium transition-colors ${
                  activo ? "acento-texto" : "text-texto-tenue hover:text-texto-tenue"
                }`}
              >
                <span className="relative">
                  <Icono
                    nombre={item.icono}
                    relleno={resaltado}
                    className={`h-[22px] w-[22px] ${resaltado ? "text-brand-400" : ""}`}
                  />
                  <BadgeNoLeidos cantidad={badge} className="absolute -right-2 -top-1.5" />
                  {resaltado && <PuntoNuevo className="absolute -right-1 -top-0.5" />}
                </span>
                {t(item.claveCorto ?? item.clave)}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
