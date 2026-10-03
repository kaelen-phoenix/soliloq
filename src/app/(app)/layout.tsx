import { redirect } from "next/navigation";
import { Suspense } from "react";
import { ActualizarAlVolver } from "@/components/layout/actualizar-al-volver";
import { BarraLateral } from "@/components/layout/barra-lateral";
import { BarraNavegacion } from "@/components/layout/barra-navegacion";
import { Encabezado } from "@/components/layout/encabezado";
import { TransicionPagina } from "@/components/ui/transicion-pagina";
import { AvisoConvocatoria } from "@/components/talento/aviso-convocatoria";
import { ProveedorNoLeidos, type FilaNoLeidos } from "@/components/salas/no-leidos";
import { TourGuiado } from "@/components/tour/tour-guiado";
import { reportarErrorSupabase } from "@/lib/observabilidad";
import { createClient } from "@/lib/supabase/server";
import { usuarioDeLaRequest, estadoCuentaDeLaRequest } from "@/lib/sesion-servidor";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const user = await usuarioDeLaRequest();
  // Sin sesión no se entra al área de la app: se va a la landing, que explica qué es
  // Yalope y tiene los accesos a "Entrar" y "Crear mi perfil". El middleware (src/middleware.ts)
  // ya cubre esto mismo para casi todas las rutas desde #10, pero este chequeo se mantiene
  // como segunda línea: es el único gate que corre para lo que se renderiza en este layout.
  if (!user) redirect("/bienvenida");

  // Mensajes sin leer de Salas (#216): la primera carga viene de acá para que el badge no
  // aparezca un instante después; de ahí en más lo mantiene `ProveedorNoLeidos`. Sale en
  // paralelo con el estado de la cuenta: son dos viajes a la base que no dependen uno del otro.
  const [estado, { data: noLeidos, error: errorNoLeidos }] = await Promise.all([
    estadoCuentaDeLaRequest(user.id),
    supabase.rpc("salas_no_leidas"),
  ]);
  if (estado.suspendido) redirect("/suspendido");
  if (!estado.normasAceptadas) redirect("/aceptar-normas");
  if (!estado.tienePerfilTalento) redirect("/completar-perfil");
  if (errorNoLeidos) reportarErrorSupabase(errorNoLeidos, { rpc: "salas_no_leidas" });

  return (
    // El ancho del contenido es **continuo**, no escalonado: ocupa lo que haya hasta un
    // único tope. Antes subía por saltos (`lg`, `xl`) y eso dejaba tamaños intermedios
    // —una tablet apaisada, una ventana a medio maximizar— con espacio libre al costado
    // esperando a cruzar un número arbitrario.
    //
    // Y sin tope: el marco no le impone un ancho a nadie. **Cada componente declara el suyo**
    // — la tarjeta del feed en `max-w-sm`, los formularios en `max-w-2xl`, los párrafos en
    // `max-w-prose`, los mensajes del chat en `max-w-3xl`— y las listas suman columnas cuando
    // entran, con `auto-fill` sobre el ancho real del contenedor.
    //
    // Es al revés de como estaba: antes el contenedor capeaba todo por igual, y eso obligaba
    // a elegir un número que a las listas les quedaba chico y a los formularios grande.
    //
    // Lo único que sigue siendo por breakpoint es la navegación, y ahí corresponde: una
    // barra abajo y una lateral no son la misma forma con otro tamaño.
    <ProveedorNoLeidos userId={user.id} inicial={(noLeidos ?? []) as FilaNoLeidos[]}>
      <div className="min-h-screen pb-20 sm:bg-fondo-sutil sm:pb-28 lg:flex lg:gap-0 lg:pb-0"
      >
        <ActualizarAlVolver />
        <AvisoConvocatoria userId={user.id} />
        <BarraLateral esAdmin={estado.esAdmin} />

        <div className="min-w-0 flex-1">
          <Encabezado userId={user.id} />
          <div className="w-full bg-superficie px-0 sm:min-h-[calc(100vh-9rem)]">
            <TransicionPagina>{children}</TransicionPagina>
          </div>
        </div>

        <BarraNavegacion esAdmin={estado.esAdmin} />
        {/* Suspense: el tour lee `?tour=1` con useSearchParams. */}
        <Suspense fallback={null}>
          <TourGuiado userId={user.id} visto={estado.tourVisto} />
        </Suspense>
      </div>
    </ProveedorNoLeidos>
  );
}
