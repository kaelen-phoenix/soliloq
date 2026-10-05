import Link from "next/link";
import { CerrarSesionBoton } from "@/components/cerrar-sesion-boton";
import { FormularioTalento } from "@/components/perfil/formulario-talento";
import { PerfilTalentoDetalle } from "@/components/perfil/perfil-talento-detalle";
import { Icono } from "@/components/ui/icono";
import { VistaPerfilPropio } from "@/components/perfil/vista-perfil-propio";
import { BotonCompartir } from "@/components/perfil/boton-compartir";
import { InvitacionComunidad } from "@/components/comunidad/invitacion-comunidad";
import { VincularDiscord } from "@/components/comunidad/vincular-discord";
import { discordConfigurado } from "@/lib/discord-servidor";
import { PerfilCreadorDetalle } from "@/components/perfil/perfil-creador-detalle";
import { calcularEdad } from "@/lib/constantes";
import { createClient } from "@/lib/supabase/server";
import { usuarioDeLaRequest, estadoCuentaDeLaRequest } from "@/lib/sesion-servidor";
import { redesDeJson } from "@/lib/redes";

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
  searchParams: { editar?: string; discord?: string };
}) {
  const supabase = createClient();
  const user = await usuarioDeLaRequest();
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
  const estado = await estadoCuentaDeLaRequest(user.id);

  const [{ data: cuenta }, { data: perfilTalento }, { data: fotos }, { data: perfilCreador }] =
    await Promise.all([
      supabase
        .from("perfiles")
        .select("enlace_token, enlace_publico_activo, discord_usuario")
        .eq("id", user.id)
        .single(),
      // La fila propia entera, con fecha y ubicación exacta: por `select` la base ya no las da (#255).
      supabase.rpc("mi_perfil_talento").maybeSingle(),
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
            datosIniciales={
              perfilTalento ? { ...perfilTalento, redes: redesDeJson(perfilTalento.redes) } : undefined
            }
            fotosIniciales={fotosConUrl}
            datosCreador={perfilCreador ?? undefined}
          />
        </>
      ) : (
        <VistaPerfilPropio
          hrefEditar="/perfil?editar=1"
          aviso={
            perfilTalento.aparece_en_buscador
              ? "Tu ubicación exacta nunca se muestra: solo el barrio o la ciudad."
              : // #265: la opción «Ocultar mi perfil a personas nuevas» está tildada.
                "Tu perfil está oculto a personas nuevas: solo te ven tus chats abiertos."
          }
        >
          <PerfilTalentoDetalle
            talento={{
              ...perfilTalento,
              redes: redesDeJson(perfilTalento.redes),
              edad: perfilTalento.fecha_nacimiento ? calcularEdad(perfilTalento.fecha_nacimiento) : null,
              fotos: fotosConUrl,
            }}
            esPropio
          />
          {perfilCreador && (
            <div className="mt-2 border-t border-borde pt-4">
              <PerfilCreadorDetalle creador={perfilCreador} />
            </div>
          )}
        </VistaPerfilPropio>
      )}

      {/* Con el perfil oculto el enlace no muestra nada (#265, `perfil_publico`): no se ofrece. */}
      {!editando && perfilTalento && cuenta && perfilTalento.aparece_en_buscador && (
        <BotonCompartir
          userId={user.id}
          nombre={perfilTalento.nombre}
          tokenInicial={cuenta.enlace_token}
          activoInicial={cuenta.enlace_publico_activo}
        />
      )}
      {!editando && (
        <InvitacionComunidad variante="seccion">
          {discordConfigurado() && (
            <VincularDiscord usuario={cuenta?.discord_usuario ?? null} resultado={searchParams.discord} />
          )}
        </InvitacionComunidad>
      )}
      <AccionesCuenta />
    </main>
  );
}
