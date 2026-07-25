"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icono } from "@/components/ui/icono";
import type { RolUsuario } from "@/lib/supabase/types";

interface Item {
  href: string;
  label: string;
  icono: "feed" | "postulaciones" | "salas" | "perfil" | "tablero";
}

const itemsTalento: Item[] = [
  { href: "/", label: "Feed", icono: "feed" },
  { href: "/postulaciones", label: "Postulaciones", icono: "postulaciones" },
  { href: "/salas", label: "Salas", icono: "salas" },
  { href: "/perfil", label: "Perfil", icono: "perfil" },
];

const itemsCreador: Item[] = [
  { href: "/", label: "Tablero", icono: "tablero" },
  { href: "/salas", label: "Salas", icono: "salas" },
  { href: "/perfil", label: "Perfil", icono: "perfil" },
];

export function BarraNavegacion({ rol }: { rol: RolUsuario }) {
  const pathname = usePathname();
  const items = rol === "talento" ? itemsTalento : itemsCreador;

  return (
    <nav className="safe-bottom fixed inset-x-0 bottom-0 z-30 border-t border-ink-100 bg-white/85 backdrop-blur-xl">
      <ul className="mx-auto flex max-w-lg items-stretch">
        {items.map((item) => {
          const activo = pathname === item.href;
          return (
            <li key={item.href} className="flex-1">
              <Link
                href={item.href}
                aria-current={activo ? "page" : undefined}
                className={`flex flex-col items-center gap-1 pb-1.5 pt-2.5 text-[10px] font-medium transition-colors ${
                  activo ? "text-ink-900" : "text-ink-400 hover:text-ink-600"
                }`}
              >
                <Icono nombre={item.icono} className="h-[22px] w-[22px]" />
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
