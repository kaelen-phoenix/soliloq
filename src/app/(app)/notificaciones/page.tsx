import { createClient } from "@/lib/supabase/server";
import { ListaNotificaciones } from "@/components/notificaciones/lista-notificaciones";

export default async function NotificacionesPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: notificacionesRaw } = await supabase
    .from("notificaciones")
    .select(
      "id, tipo, leida_en, creado_en, obra_id, rol_id, sala_id, de_perfil, obras(titulo, creador_id)"
    )
    .eq("destinatario_id", user.id)
    .order("creado_en", { ascending: false });

  const primeraObra = <T,>(v: T | T[] | null | undefined): T | null =>
    !v ? null : Array.isArray(v) ? (v[0] ?? null) : v;

  // La cara del proyecto es la del Creador que lo publica (issue #175: sale de su Perfil
  // de Talento, ya no tiene foto propia de Creador). Se resuelve aparte porque `obras` no
  // tiene una FK directa a `perfiles_talento` para pedirlo embebido.
  const creadorIds = [
    ...new Set(
      (notificacionesRaw ?? [])
        .map((n) => primeraObra(n.obras)?.creador_id)
        .filter((id): id is string => !!id)
    ),
  ];

  const { data: creadoresRaw } = creadorIds.length
    ? await supabase
        .from("perfiles_talento")
        .select("id, fotos_talento(storage_path, orden)")
        .in("id", creadorIds)
    : { data: [] };

  const fotoPorCreador = new Map(
    (creadoresRaw ?? []).map((c) => {
      const principal = c.fotos_talento?.find((f) => f.orden === 0);
      return [
        c.id,
        principal ? supabase.storage.from("fotos-perfil").getPublicUrl(principal.storage_path).data.publicUrl : null,
      ];
    })
  );

  const notificaciones = (notificacionesRaw ?? []).map((n) => ({
    ...n,
    proyecto_foto_url: fotoPorCreador.get(primeraObra(n.obras)?.creador_id ?? "") ?? null,
  }));

  // La foto propia, para el par de avatares del aviso de equipo armado. El talento guarda
  // varias fotos ordenadas y la principal es la primera: no hay una columna "principal".
  const { data: foto } = await supabase
    .from("fotos_talento")
    .select("storage_path")
    .eq("talento_id", user.id)
    .order("orden", { ascending: true })
    .limit(1)
    .maybeSingle();

  const fotoPropia = foto
    ? supabase.storage.from("fotos-perfil").getPublicUrl(foto.storage_path).data.publicUrl
    : null;

  return (
    <main className="px-6 py-6">
      <ListaNotificaciones
        notificacionesIniciales={notificaciones ?? []}
        fotoPropia={fotoPropia}
      />
    </main>
  );
}
