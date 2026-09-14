-- 0067 — Tope de fotos de Proyecto/Equipo: de 3–6 a 1–2 (issue #162).
--
-- El feed de equipos sólo mostraba a los que llegaban a 3 fotos. Bajar el mínimo del
-- uploader a 1 sin tocar esto dejaría a cualquier equipo nuevo sin poder aparecer nunca.

create or replace function public.feed_equipos_para_talento()
returns table(equipo_id uuid, titulo text, cupo integer, creado_en timestamptz,
              creador_id uuid, creador_nombre text, creador_imagen_url text, fotos text[])
language sql
stable
set search_path to 'public'
as $function$
  select
    e.id, e.titulo, e.cupo, e.creado_en,
    c.id, c.nombre, c.imagen_url,
    coalesce(
      (select array_agg(f.storage_path order by f.orden) from fotos_equipo f where f.equipo_id = e.id),
      '{}'::text[]
    )
  from equipos e
  join perfiles_creador c on c.id = e.creador_id
  where e.activo
    and e.creador_id <> auth.uid()
    and (select count(*) from fotos_equipo f where f.equipo_id = e.id) >= 1
    and not public.hay_bloqueo(e.creador_id)
    and not public.iniciativa_en_cierre(null, e.id)
    and not exists (
      select 1 from intereses_equipo i
      where i.de_perfil = auth.uid() and i.equipo_id = e.id and i.interesa
    )
    and not exists (
      select 1 from descartes_equipo d
      where d.talento_id = auth.uid() and d.equipo_id = e.id
    )
    and not exists (
      select 1 from sala_integrantes si
      join salas s on s.id = si.sala_id
      where s.equipo_id = e.id and si.perfil_id = auth.uid()
    )
  order by e.creado_en desc;
$function$;
