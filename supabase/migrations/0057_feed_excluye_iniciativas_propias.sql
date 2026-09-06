-- El feed del talento deja de ofrecer proyectos/equipos en los que ya está adentro.
--
-- Contexto: mientras el circuito de match (0054–0056) convive con el flujo viejo de
-- postulaciones, un talento que aceptó una convocatoria (flujo nuevo) seguía viendo los
-- otros roles de esa misma obra en el feed —el filtro solo miraba `postulaciones` /
-- `descartes`—. Se agrega la exclusión por pertenencia a la sala, que cubre las dos vías.

create or replace function public.feed_para_talento(p_talento_id uuid, p_radio_metros integer default null)
returns setof feed_talento
language sql
stable
as $$
  select f.*
  from feed_talento f
  join perfiles_talento t on t.id = p_talento_id
  where f.creador_id <> p_talento_id
    and (
      f.edad_minima is null
      or f.edad_maxima is null
      or extract(year from age(t.fecha_nacimiento))::int between f.edad_minima and f.edad_maxima
    )
    and (
      cardinality(f.generos_buscados) = 0
      or t.genero = 'sin_especificar'
      or t.genero = any (f.generos_buscados)
    )
    and (
      p_radio_metros is null
      or (
        ll_to_earth(f.obra_ubicacion_lat, f.obra_ubicacion_lng)
          <@ earth_box(ll_to_earth(t.ubicacion_lat, t.ubicacion_lng), p_radio_metros)
        and earth_distance(
              ll_to_earth(f.obra_ubicacion_lat, f.obra_ubicacion_lng),
              ll_to_earth(t.ubicacion_lat, t.ubicacion_lng)
            ) <= p_radio_metros
      )
    )
    and not exists (
      select 1 from postulaciones p where p.rol_id = f.rol_id and p.talento_id = p_talento_id
    )
    and not exists (
      select 1 from descartes d where d.rol_id = f.rol_id and d.talento_id = p_talento_id
    )
    and not exists (
      select 1 from sala_integrantes si
      join salas s on s.id = si.sala_id
      where s.obra_id = f.obra_id and si.perfil_id = p_talento_id
    )
  order by f.obra_creado_en desc;
$$;

create or replace function public.feed_equipos_para_talento()
returns table (
  equipo_id uuid,
  titulo text,
  cupo int,
  creado_en timestamptz,
  creador_id uuid,
  creador_nombre text,
  creador_imagen_url text,
  fotos text[]
)
language sql
stable
set search_path = public
as $$
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
    and (select count(*) from fotos_equipo f where f.equipo_id = e.id) >= 3
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
$$;
revoke all on function public.feed_equipos_para_talento() from public;
grant execute on function public.feed_equipos_para_talento() to authenticated;
