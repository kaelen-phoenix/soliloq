"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icono } from "@/components/ui/icono";
import { itemsParaNavegacion } from "./items-navegacion";
import type { RolUsuario } from "@/lib/supabase/types";

/**
 * Navegación de teléfono: barra fija abajo, al alcance del pulgar.
 *
 * Desaparece en escritorio, donde el lugar lo toma `BarraLateral`. Los ítems salen de
 * `ITEMS_NAVEGACION`, compartidos con ella.
 */
export function BarraNavegacion({
  rol,
  esAdmin = false,
}: {
  rol: RolUsuario;
  esAdmin?: boolean;
}) {
  const pathname = usePathname();
  const items = itemsParaNavegacion(rol, { esAdmin });

  return (
    <nav className="safe-bottom fixed inset-x-0 bottom-0 z-30 border-t border-ink-100 bg-white/85 backdrop-blur-xl lg:hidden">
      <ul className="mx-auto flex max-w-lg items-stretch">
        {items.map((item) => {
          const activo = pathname === item.href;
          return (
            <li key={item.href} className="flex-1">
              <Link
                href={item.href}
                aria-current={activo ? "page" : undefined}
                className={`flex flex-col items-center gap-1 pb-1.5 pt-2.5 text-2xs font-medium transition-colors ${
                  activo ? "acento-texto" : "text-ink-400 hover:text-ink-600"
                }`}
              >
                <Icono nombre={item.icono} className="h-[22px] w-[22px]" />
                {item.labelCorto ?? item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
