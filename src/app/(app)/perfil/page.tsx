import Link from "next/link";
import { CerrarSesionBoton } from "@/components/cerrar-sesion-boton";
import { FormularioCreador } from "@/components/perfil/formulario-creador";
import { FormularioTalento } from "@/components/perfil/formulario-talento";
import { ObrasPrevias } from "@/components/perfil/obras-previas";
import { PerfilTalentoDetalle } from "@/components/perfil/perfil-talento-detalle";
import { Icono } from "@/components/ui/icono";
import { VistaPerfilPropio } from "@/components/perfil/vista-perfil-propio";
import { BuscarEquipo } from "@/components/perfil/buscar-equipo";
import { EtiquetasDisciplina } from "@/components/perfil/etiquetas-disciplina";
import { leerEstadoCuenta } from "@/lib/cuenta-servidor";
import { createClient } from "@/lib/supabase/server";

function AccionesCuenta() {
  return (
    <section className="mt-8 flex flex-col items-start gap-3">
      <Link
        href="/cambiar-clave?volver=/perfil"
        className="text-sm text-ink-500 underline underline-offset-4 hover:text-ink-900"
      >
        Cambiar contraseña
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
      className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-ink-500 hover:text-ink-900"
    >
      <Icono nombre="chevron" className="h-3.5 w-3.5 rotate-90" />
      Ver mi perfil
    </Link>
  );

  // Se edita el perfil del modo activo; el otro se edita conmutando de modo.
  const estado = await leerEstadoCuenta(supabase, user.id);

  const { data: cuenta } = await supabase
    .from("perfiles")
    .select("busca_equipo, pitch")
    .eq("id", user.id)
    .single();

  // Vive fuera de los dos formularios porque es de la cuenta, no del perfil de talento ni
  // del de creador: quien tiene los dos se anota una sola vez.
  const armarEquipo = (
    <BuscarEquipo buscaEquipo={cuenta?.busca_equipo ?? false} pitchInicial={cuenta?.pitch ?? null} />
  );

  if (estado.modoActivo === "talento") {
    const [{ data: perfilTalento }, { data: fotos }] = await Promise.all([
      supabase.from("perfiles_talento").select("*").eq("id", user.id).single(),
      supabase.from("fotos_talento").select("*").eq("talento_id", user.id).order("orden"),
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
              esAlta={false}
              datosIniciales={perfilTalento ?? undefined}
              fotosIniciales={fotosConUrl}
            />
          </>
        ) : (
          <VistaPerfilPropio
            hrefEditar="/perfil?editar=1"
            aviso="Tu ubicación exacta nunca se muestra: solo el barrio o la ciudad."
          >
            <PerfilTalentoDetalle talento={{ ...perfilTalento, fotos: fotosConUrl }} />
          </VistaPerfilPropio>
        )}
        {!editando && armarEquipo}
        <AccionesCuenta />
      </main>
    );
  }

  const [{ data: perfilCreador }, { data: obrasPrevias }] = await Promise.all([
    supabase.from("perfiles_creador").select("*").eq("id", user.id).single(),
    supabase.from("obras_previas").select("*").eq("creador_id", user.id),
  ]);

  return (
    <main className="px-5 py-5">
      {editando || !perfilCreador ? (
        <>
          {perfilCreador && volverAVista}
          <FormularioCreador
            userId={user.id}
            esAlta={false}
            datosIniciales={perfilCreador ?? undefined}
          />
        </>
      ) : (
        <VistaPerfilPropio
          hrefEditar="/perfil?editar=1"
          aviso="Tu ubicación exacta nunca se muestra: solo el barrio o la ciudad."
        >
          <div className="flex items-center gap-4">
            {perfilCreador.imagen_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={perfilCreador.imagen_url}
                alt=""
                className="h-16 w-16 rounded-full object-cover"
              />
            ) : (
              <span className="flex h-16 w-16 items-center justify-center rounded-full bg-ink-100 text-lg font-semibold text-ink-600">
                {perfilCreador.nombre[0]}
              </span>
            )}
            <div className="min-w-0">
              <h2 className="font-display text-xl font-semibold tracking-[-0.02em] text-ink-900">
                {perfilCreador.nombre}
              </h2>
              <EtiquetasDisciplina
                disciplinas={perfilCreador.disciplinas}
                otroDetalle={perfilCreador.otro_detalle}
                className="mt-1.5"
              />
              <p className="text-sm text-ink-400">{perfilCreador.ubicacion_publica}</p>
            </div>
          </div>

          {perfilCreador.descripcion && (
            <p className="max-w-prose text-sm leading-relaxed text-ink-700">{perfilCreador.descripcion}</p>
          )}
        </VistaPerfilPropio>
      )}

      <section className="mt-8 flex flex-col gap-3">
        <h2 className="text-2xs font-medium uppercase tracking-wide text-ink-400">
          Historial de obras previas
        </h2>
        <ObrasPrevias creadorId={user.id} obras={obrasPrevias ?? []} />
      </section>
      {!editando && armarEquipo}
      <AccionesCuenta />
    </main>
  );
}
