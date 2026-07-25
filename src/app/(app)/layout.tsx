import { redirect } from "next/navigation";
import { BarraNavegacion } from "@/components/layout/barra-navegacion";
import { Encabezado } from "@/components/layout/encabezado";
import { rolFaltante } from "@/lib/cuenta";
import { leerEstadoCuenta } from "@/lib/cuenta-servidor";
import { createClient } from "@/lib/supabase/server";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/ingresar");

  const estado = await leerEstadoCuenta(supabase, user.id);
  if (!estado.modoActivo) redirect("/completar-perfil");

  const titulo = estado.modoActivo === "talento" ? "Convocatorias" : "Tu tablero";

  return (
    <div className="pb-20">
      <Encabezado
        titulo={titulo}
        userId={user.id}
        modoActivo={estado.modoActivo}
        tieneAmbosPerfiles={estado.tieneAmbosPerfiles}
        rolFaltante={rolFaltante(estado)}
      />
      <div className="mx-auto max-w-lg">{children}</div>
      <BarraNavegacion rol={estado.modoActivo} />
    </div>
  );
}
