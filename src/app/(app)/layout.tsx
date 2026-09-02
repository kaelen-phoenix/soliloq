import { redirect } from "next/navigation";
import { BarraLateral } from "@/components/layout/barra-lateral";
import { BarraNavegacion } from "@/components/layout/barra-navegacion";
import { Encabezado } from "@/components/layout/encabezado";
import { TransicionPagina } from "@/components/ui/transicion-pagina";
import { rolFaltante } from "@/lib/cuenta";
import { leerEstadoCuenta } from "@/lib/cuenta-servidor";
import { createClient } from "@/lib/supabase/server";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  // Sin sesión no se entra al área de la app: se va a la landing, que explica qué es
  // Yalope y tiene los accesos a "Entrar" y "Crear mi perfil". (El middleware no corre
  // en este proyecto —vive en la raíz y con `src/` Next lo ignora—, así que el corte
  // de sesión del área autenticada es este.)
  if (!user) redirect("/bienvenida");

  const estado = await leerEstadoCuenta(supabase, user.id);
  if (!estado.modoActivo) redirect("/completar-perfil");

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
    // `data-rol` fija el acento de color de toda el área autenticada: encabezado, ítem
    // de navegación activo y anillo de foco leen `--acento` (ver `globals.css`).
    <div
      data-rol={estado.modoActivo}
      className="min-h-screen pb-20 sm:bg-ink-50 sm:pb-28 lg:flex lg:gap-0 lg:pb-0"
    >
      <BarraLateral rol={estado.modoActivo} />

      <div className="min-w-0 flex-1">
        <Encabezado
          userId={user.id}
          modoActivo={estado.modoActivo}
          tieneAmbosPerfiles={estado.tieneAmbosPerfiles}
          rolFaltante={rolFaltante(estado)}
        />
        <div className="w-full bg-white px-0 sm:min-h-[calc(100vh-9rem)]">
          <TransicionPagina>{children}</TransicionPagina>
        </div>
      </div>

      <BarraNavegacion rol={estado.modoActivo} />
    </div>
  );
}
