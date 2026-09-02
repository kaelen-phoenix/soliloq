"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icono } from "@/components/ui/icono";
import { LogotipoInline } from "@/components/ui/logotipo";
import { itemsParaNavegacion } from "./items-navegacion";
import type { RolUsuario } from "@/lib/supabase/types";

/**
 * Navegación de escritorio. Es un componente aparte de `BarraNavegacion` en vez de un
 * mismo componente con clases para los dos casos: son dos formas distintas —una fila de
 * íconos abajo contra una lista vertical con el logo arriba— y meterlas en el mismo JSX
 * termina en un enredo de `hidden` que nadie puede leer.
 *
 * Los ítems sí son compartidos: si divergieran, la app tendría dos navegaciones distintas
 * según el tamaño de pantalla, que es el bug clásico de este patrón.
 */
export function BarraLateral({ rol, esAdmin = false }: { rol: RolUsuario; esAdmin?: boolean }) {
  const pathname = usePathname();
  const t = useTranslations("nav");
  const items = itemsParaNavegacion(rol, { esAdmin });

  return (
    <aside className="hidden shrink-0 lg:sticky lg:top-0 lg:flex lg:h-screen lg:w-60 lg:flex-col lg:border-r lg:border-borde lg:bg-superficie lg:px-4 lg:py-6">
      <Link href="/" className="mb-8 px-3">
        <LogotipoInline />
      </Link>

      <nav className="flex-1">
        <ul className="flex flex-col gap-1">
          {items.map((item) => {
            const activo = pathname === item.href;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={activo ? "page" : undefined}
                  className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                    activo
                      ? "acento-fondo acento-texto"
                      : "text-texto-tenue hover:bg-fondo-sutil/60 hover:text-texto"
                  }`}
                >
                  <Icono nombre={item.icono} className="h-[18px] w-[18px]" />
                  {t(item.clave)}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <Link
        href="/ajustes"
        aria-current={pathname === "/ajustes" ? "page" : undefined}
        className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
          pathname === "/ajustes"
            ? "acento-fondo acento-texto"
            : "text-texto-tenue hover:bg-fondo-sutil/60 hover:text-texto"
        }`}
      >
        <Icono nombre="ajustes" className="h-[18px] w-[18px]" />
        {t("ajustes")}
      </Link>
    </aside>
  );
}
