import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { SalaChat, type Integrante } from "@/components/salas/sala-chat";
import { usuarioDeLaRequest } from "@/lib/sesion-servidor";
import { EspacioDiscord } from "@/components/comunidad/espacio-discord";
import { discordConfigurado, urlCanal } from "@/lib/discord-servidor";

export default async function SalaPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const user = await usuarioDeLaRequest();
  if (!user) return null;
  const t = await getTranslations("chats.paginas");

  const { data: sala } = await supabase
    .from("salas")
    .select("id, obra_id, equipo_id, titulo, discord_canal_id, obras(titulo, creador_id), equipos(titulo, creador_id)")
    .eq("id", params.id)
    .single();
  if (!sala) notFound();

  // La obra/equipo puede venir vacío aunque la sala exista: si quien mira bloqueó al
  // creador, la política restrictiva de 0022 esconde esa fila y el join queda en null. La
  // sala sigue siendo suya y sigue teniendo al resto del elenco, así que se muestra igual.
  const obra = (Array.isArray(sala.obras) ? sala.obras[0] : sala.obras) as
    | { titulo: string; creador_id: string }
    | null
    | undefined;
  const equipo = (Array.isArray(sala.equipos) ? sala.equipos[0] : sala.equipos) as
    | { titulo: string; creador_id: string }
    | null
    | undefined;

  const esDeIniciativa = !!(sala.obra_id || sala.equipo_id);
  const esDueno = obra?.creador_id === user.id || equipo?.creador_id === user.id;

  const conDiscord = esDeIniciativa && discordConfigurado();
  const [{ data: mensajes }, { data: integrantesRaw }, { data: miPerfil }] = await Promise.all([
    supabase.from("mensajes").select("*").eq("sala_id", params.id).order("creado_en"),
    supabase.from("sala_integrantes").select("perfil_id").eq("sala_id", params.id),
    conDiscord
      ? supabase.from("perfiles").select("discord_user_id").eq("id", user.id).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const integrantesIds = (integrantesRaw ?? []).map((i) => i.perfil_id);

  // La identidad de cualquier integrante —incluido el Creador— sale siempre de su Perfil de
  // Talento (issue #175): el Creador ya no tiene un perfil de identidad aparte, y como es
  // miembro de su propia sala (`convocar`/`aceptar_match`), esta única consulta ya lo trae.
  const { data: talentos } = await supabase
    .from("perfiles_talento")
    .select("id, nombre, fotos_talento(storage_path, orden)")
    .in("id", integrantesIds);

  const integrantes: Integrante[] = integrantesIds.map((id) => {
    const talento = talentos?.find((t) => t.id === id);
    const fotoPrincipal = talento?.fotos_talento?.find((f: any) => f.orden === 0);
    const esDirector = obra?.creador_id === id || equipo?.creador_id === id;
    return {
      perfil_id: id,
      nombre: talento?.nombre ?? (esDeIniciativa ? t("integrante") : t("perfilSinCompletar")),
      foto_url: fotoPrincipal ? supabase.storage.from("fotos-perfil").getPublicUrl(fotoPrincipal.storage_path).data.publicUrl : null,
      // La sala nace de un interés mutuo + convocatoria, no de un casting con roles.
      rol_en_obra: esDirector ? t("director") : esDeIniciativa ? t("elenco") : t("contacto"),
      // #149: sólo los mensajes de quien tiene perfil de Talento abren la placa de perfil.
      esTalento: !!talento,
    };
  });

  return (
    // Alto fijo = pantalla menos el Encabezado sticky (safe-area + su contenido, ~5.25rem) y
    // menos el espacio que AppLayout reserva para BarraNavegacion (pb-20 = 5rem). Con esto la
    // barra de título y el chat se reparten ese alto vía flex, en lugar de que SalaChat adivine
    // por su cuenta cuánto mide la barra de título: así el input queda anclado al fondo real de
    // la pantalla sin importar cuántos mensajes haya, y sólo la lista de mensajes scrollea.
    //
    // En escritorio la barra inferior no existe —la reemplaza la lateral— así que ese
    // descuento de 5rem sobra y el chat quedaría corto. La variable lo absorbe.
    <div
      className="flex flex-col [--alto-barra:5rem] lg:[--alto-barra:0rem]"
      style={{ height: "calc(100dvh - env(safe-area-inset-top) - 5.25rem - var(--alto-barra))" }}
    >
      <div className="flex items-center gap-3 border-b border-borde px-4 py-2">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium uppercase tracking-wide text-texto-tenue">
            {sala.obra_id ? t("salaDeProyecto") : sala.equipo_id ? t("salaDeEquipo") : t("chatDirecto")}
          </p>
          {/* Título de la obra o el equipo; si no, el de una sala sin iniciativa, o el
              genérico cuando esa fila está escondida por bloqueo (0022). */}
          <h1 className="font-display font-semibold tracking-[-0.02em] text-texto">
            {obra?.titulo ??
              equipo?.titulo ??
              (!esDeIniciativa
                ? integrantes.filter((i) => i.perfil_id !== user.id).map((i) => i.nombre).join(t("separadorNombres")) || sala.titulo
                : sala.titulo) ??
              t("proyecto")}
          </h1>
        </div>
        {/* Espacio privado en Discord (#269), solo en Proyectos y Equipos. */}
        {conDiscord && (
          <EspacioDiscord
            salaId={params.id}
            url={sala.discord_canal_id ? urlCanal(sala.discord_canal_id) : null}
            esDueno={esDueno}
            vinculado={!!miPerfil?.discord_user_id}
          />
        )}
      </div>
      <SalaChat
        salaId={params.id}
        userId={user.id}
        mensajesIniciales={mensajes ?? []}
        integrantes={integrantes}
        esDueno={esDeIniciativa && esDueno}
      />
    </div>
  );
}
