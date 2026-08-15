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

  return (
    // En escritorio el fondo se tiñe y la columna queda sobre blanco: sin eso, una columna
    // angosta sobre una pantalla toda blanca se lee como una app de teléfono estirada, que
    // es exactamente lo que pasaba. El ancho de lectura no cambia — cambiarlo rompería la
    // tarjeta del feed, que está pensada para el pulgar.
    <div className="min-h-screen pb-20 sm:bg-ink-50 sm:pb-28">
      <Encabezado
        userId={user.id}
        modoActivo={estado.modoActivo}
        tieneAmbosPerfiles={estado.tieneAmbosPerfiles}
        rolFaltante={rolFaltante(estado)}
      />
      <div className="mx-auto max-w-lg bg-white sm:min-h-[calc(100vh-9rem)] sm:border-x sm:border-ink-100">
        {children}
      </div>
      <BarraNavegacion rol={estado.modoActivo} />
    </div>
  );
}
