import { redirect } from "next/navigation";
import { BarraLateral } from "@/components/layout/barra-lateral";
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
    // Tres formas según el ancho:
    //
    // - Teléfono: columna a pantalla completa con la barra abajo, al alcance del pulgar.
    // - Tablet: la columna se centra sobre un fondo teñido.
    // - Escritorio: navegación lateral fija y la columna de contenido más ancha.
    //
    // Lo ancho es el **marco**, no el texto: la tarjeta del feed se capea sola en `max-w-sm`
    // (`pila-tarjetas.tsx`), así que ensanchar acá le da aire a las listas, los formularios y
    // el chat sin deformarla.
    //
    // En `xl` sube otro escalón, pero el texto **no** se estira hasta ahí: a partir de ese
    // ancho las listas de tarjetas pasan a dos columnas (`xl:grid-cols-2`). Un renglón de
    // 200 caracteres es ilegible, así que el espacio se usa poniendo más cosas al lado, no
    // alargando la línea. Por eso tampoco hay un escalón para `2xl`: llegado ese punto, el
    // espacio que sobra es margen y está bien que lo sea.
    <div className="min-h-screen pb-20 sm:bg-ink-50 sm:pb-28 lg:flex lg:gap-0 lg:pb-0">
      <BarraLateral rol={estado.modoActivo} />

      <div className="min-w-0 flex-1">
        <Encabezado
          userId={user.id}
          modoActivo={estado.modoActivo}
          tieneAmbosPerfiles={estado.tieneAmbosPerfiles}
          rolFaltante={rolFaltante(estado)}
        />
        <div className="mx-auto max-w-lg bg-white sm:min-h-[calc(100vh-9rem)] sm:border-x sm:border-ink-100 lg:max-w-3xl lg:border-x-0 xl:max-w-5xl">
          {children}
        </div>
      </div>

      <BarraNavegacion rol={estado.modoActivo} />
    </div>
  );
}
