import Link from "next/link";
import { Icono } from "@/components/ui/icono";

/**
 * El perfil propio, tal como lo ve el resto. El formulario de edición pasó a estar detrás
 * de un botón en vez de ser lo primero que aparece.
 *
 * El motivo no es estético: entrar directo al formulario hace que nadie vea nunca cómo se
 * presenta ante los demás, que es justamente lo que decide si lo eligen para un proyecto.
 */
export function VistaPerfilPropio({
  children,
  hrefEditar,
  aviso,
}: {
  children: React.ReactNode;
  hrefEditar: string;
  aviso?: string;
}) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3 rounded-xl bg-ink-50 px-4 py-3">
        <p className="text-[12px] leading-snug text-ink-500">
          Así te ven los demás.
          {aviso && <span className="block text-ink-400">{aviso}</span>}
        </p>
        <Link
          href={hrefEditar}
          className="flex shrink-0 items-center gap-1.5 rounded-lg border border-ink-200 bg-white px-3 py-1.5 text-[13px] font-medium text-ink-900 transition-colors hover:border-ink-300"
        >
          <Icono nombre="cambiar" className="h-3.5 w-3.5" />
          Editar
        </Link>
      </div>

      {children}
    </div>
  );
}
