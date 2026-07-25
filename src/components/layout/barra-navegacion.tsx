"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { RolUsuario } from "@/lib/supabase/types";

interface Item {
  href: string;
  label: string;
  icono: string;
}

const itemsTalento: Item[] = [
  { href: "/", label: "Feed", icono: "🎭" },
  { href: "/postulaciones", label: "Postulaciones", icono: "📋" },
  { href: "/salas", label: "Salas", icono: "💬" },
  { href: "/perfil", label: "Perfil", icono: "👤" },
];

const itemsCreador: Item[] = [
  { href: "/", label: "Tablero", icono: "🗂️" },
  { href: "/salas", label: "Salas", icono: "💬" },
  { href: "/perfil", label: "Perfil", icono: "👤" },
];

export function BarraNavegacion({ rol }: { rol: RolUsuario }) {
  const pathname = usePathname();
  const items = rol === "talento" ? itemsTalento : itemsCreador;

  return (
    <nav className="safe-bottom fixed inset-x-0 bottom-0 z-30 border-t border-ink-100 bg-white/95 backdrop-blur">
      <ul className="mx-auto flex max-w-lg items-stretch justify-around">
        {items.map((item) => {
          const activo = pathname === item.href;
          return (
            <li key={item.href} className="flex-1">
              <Link
                href={item.href}
                className={`flex flex-col items-center gap-0.5 py-2 text-xs font-medium transition-colors ${
                  activo ? "text-brand-600" : "text-ink-500"
                }`}
              >
                <span className="text-xl">{item.icono}</span>
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
