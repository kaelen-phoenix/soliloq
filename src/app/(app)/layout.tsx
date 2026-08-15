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
    // El ancho del contenido es **continuo**, no escalonado: ocupa lo que haya hasta un
    // único tope. Antes subía por saltos (`lg`, `xl`) y eso dejaba tamaños intermedios
    // —una tablet apaisada, una ventana a medio maximizar— con espacio libre al costado
    // esperando a cruzar un número arbitrario.
    //
    // El tope existe igual, y no es negociable: lo que se ensancha es el **marco**, no la
    // línea de texto. La tarjeta del feed se capea sola en `max-w-sm`, los párrafos largos
    // llevan `max-w-prose`, y las listas suman columnas cuando entran —no cuando el
    // viewport cruza un breakpoint— con `auto-fill` sobre el ancho real del contenedor.
    //
    // Lo único que sigue siendo por breakpoint es la navegación, y ahí corresponde: una
    // barra abajo y una lateral no son la misma forma con otro tamaño.
    <div className="min-h-screen pb-20 sm:bg-ink-50 sm:pb-28 lg:flex lg:gap-0 lg:pb-0">
      <BarraLateral rol={estado.modoActivo} />

      <div className="min-w-0 flex-1">
        <Encabezado
          userId={user.id}
          modoActivo={estado.modoActivo}
          tieneAmbosPerfiles={estado.tieneAmbosPerfiles}
          rolFaltante={rolFaltante(estado)}
        />
        <div className="mx-auto w-full max-w-5xl bg-white sm:min-h-[calc(100vh-9rem)] sm:border-x sm:border-ink-100 lg:border-x-0">
          {children}
        </div>
      </div>

      <BarraNavegacion rol={estado.modoActivo} />
    </div>
  );
}
