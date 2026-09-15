import Link from "next/link";
import { CerrarSesionBoton } from "@/components/cerrar-sesion-boton";
import { FormularioCreador } from "@/components/perfil/formulario-creador";
import { FormularioTalento } from "@/components/perfil/formulario-talento";
import { PerfilTalentoDetalle } from "@/components/perfil/perfil-talento-detalle";
import { Icono } from "@/components/ui/icono";
import { VistaPerfilPropio } from "@/components/perfil/vista-perfil-propio";
import { BotonCompartir } from "@/components/perfil/boton-compartir";
import { PerfilCreadorDetalle } from "@/components/perfil/perfil-creador-detalle";
import { leerEstadoCuenta } from "@/lib/cuenta-servidor";
import { createClient } from "@/lib/supabase/server";

function AccionesCuenta() {
  return (
    <section className="mt-8 flex flex-col items-start gap-3">
      <Link
        href="/ajustes"
        className="text-sm text-texto-tenue underline underline-offset-4 hover:text-texto"
      >
        Ajustes
      </Link>
      <Link
        href="/cambiar-clave?volver=/perfil"
        className="text-sm text-texto-tenue underline underline-offset-4 hover:text-texto"
      >
        Cambiar contraseña
      </Link>
      <Link
        href="/apoyar"
        className="text-sm text-texto-tenue underline underline-offset-4 hover:text-texto"
      >
        Apoyar Yalope
      </Link>
      <CerrarSesionBoton />
    </section>
  );
}

export default async function PerfilPage({
  searchParams,
}: {
  searchParams: { editar?: string };
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  // El formulario está detrás de `?editar=1`: por defecto se ve el perfil como lo ve el
  // resto. Va por URL y no por estado local para que "volver" funcione y el link a editar
  // se pueda compartir entre pantallas.
  const editando = searchParams.editar === "1";

  // Salida del modo edición sin guardar. Sin esto, la única forma de volver a la vista es
  // guardar o navegar a otra sección, que es exactamente cuando se pierden los cambios.
  const volverAVista = (
    <Link
      href="/perfil"
      className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-texto-tenue hover:text-texto"
    >
      <Icono nombre="chevron" className="h-3.5 w-3.5 rotate-90" />
      Ver mi perfil
    </Link>
  );

  // El Perfil de Talento es la única identidad personal (issue #175): se muestra siempre,
  // sin importar en qué modo esté operando la cuenta. Si además tiene la función de Creador
  // activa (creó un Proyecto o Equipo), se suma su perfil artístico como sección aparte.
  const estado = await leerEstadoCuenta(supabase, user.id);

  const [{ data: cuenta }, { data: perfilTalento }, { data: fotos }, { data: perfilCreador }] =
    await Promise.all([
      supabase.from("perfiles").select("enlace_token, enlace_publico_activo").eq("id", user.id).single(),
      supabase.from("perfiles_talento").select("*").eq("id", user.id).single(),
      supabase.from("fotos_talento").select("*").eq("talento_id", user.id).order("orden"),
      estado.tienePerfilCreador
        ? supabase.from("perfiles_creador").select("disciplinas, otro_detalle").eq("id", user.id).single()
        : Promise.resolve({ data: null }),
    ]);

  const fotosConUrl = (fotos ?? []).map((f) => ({
    id: f.id,
    storage_path: f.storage_path,
    orden: f.orden,
    url: supabase.storage.from("fotos-perfil").getPublicUrl(f.storage_path).data.publicUrl,
    enBd: true,
  }));

  return (
    <main className="px-5 py-5">
      {editando || !perfilTalento ? (
        <>
          {perfilTalento && volverAVista}
          <FormularioTalento
            userId={user.id}
            esAlta={!perfilTalento}
            datosIniciales={perfilTalento ?? undefined}
            fotosIniciales={fotosConUrl}
          />
          {perfilCreador && (
            <div className="mt-8 max-w-2xl border-t border-borde pt-6">
              <FormularioCreador userId={user.id} datosIniciales={perfilCreador} />
            </div>
          )}
        </>
      ) : (
        <VistaPerfilPropio
          hrefEditar="/perfil?editar=1"
          aviso="Tu ubicación exacta nunca se muestra: solo el barrio o la ciudad."
        >
          <PerfilTalentoDetalle talento={{ ...perfilTalento, fotos: fotosConUrl }} esPropio />
          {perfilCreador && (
            <div className="mt-2 border-t border-borde pt-4">
              <PerfilCreadorDetalle creador={perfilCreador} />
            </div>
          )}
        </VistaPerfilPropio>
      )}

      {!editando && perfilTalento && cuenta && (
        <BotonCompartir
          userId={user.id}
          nombre={perfilTalento.nombre}
          tokenInicial={cuenta.enlace_token}
          activoInicial={cuenta.enlace_publico_activo}
        />
      )}
      <AccionesCuenta />
    </main>
  );
}
