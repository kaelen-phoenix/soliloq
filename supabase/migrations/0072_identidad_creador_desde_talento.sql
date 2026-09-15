-- 0072 — El feed resuelve la identidad del Creador desde perfiles_talento (issue #175, 2/2 DB).
--
-- `feed_talento` y `feed_equipos_para_talento` mostraban nombre/foto leyendo
-- `perfiles_creador` (que va a perder esas columnas en una migración futura, una vez que
-- toda la app deje de leerlas — ver openspec/changes/perfil-talento-unico). Pasan a leer
-- `perfiles_talento`. La foto ya no es una URL guardada en una columna: sale de la primera
-- fila de `fotos_talento` (mismo patrón que las fotos de obra/equipo), así que el nombre de
-- columna cambia de `creador_imagen_url` a `creador_foto_path` — la resolución a URL pública
-- queda del lado de la app, como con cualquier otra foto.
--
-- Renombrar una columna de vista no lo permite `create or replace view` (sólo agregar al
-- final); hay que dropear. `feed_para_talento` depende de la vista (`returns setof
-- feed_talento`), así que también hay que recrearla — CASCADE se lleva puesto el `revoke`/
-- `grant`, así que se vuelven a poner al final.
drop function if exists public.feed_para_talento(uuid, integer);
drop view if exists feed_talento;

create view feed_talento as
  select r.id as rol_id,
    r.nombre as rol_nombre,
    r.tipo as rol_tipo,
    r.edad_minima,
    r.edad_maxima,
    r.descripcion as rol_descripcion,
    r.vacantes,
    r.generos_buscados,
    o.id as obra_id,
    o.titulo as obra_titulo,
    o.sinopsis as obra_sinopsis,
    o.ubicacion_texto as obra_ubicacion_texto,
    o.ubicacion_lat as obra_ubicacion_lat,
    o.ubicacion_lng as obra_ubicacion_lng,
    o.ubicacion_pais as obra_ubicacion_pais,
    o.creado_en as obra_creado_en,
    t.id as creador_id,
    t.nombre as creador_nombre,
    (select f.storage_path from fotos_talento f where f.talento_id = t.id order by f.orden limit 1)
      as creador_foto_path,
    coalesce((select array_agg(fo.storage_path order by fo.orden)
              from fotos_obra fo where fo.obra_id = o.id), '{}'::text[]) as obra_fotos
  from roles r
    join obras o on o.id = r.obra_id
    join perfiles_talento t on t.id = o.creador_id
  where o.estado = 'publicada'::estado_obra
    and not iniciativa_en_cierre(o.id, null::uuid);

create function public.feed_para_talento(p_talento_id uuid, p_radio_metros integer default null)
returns setof feed_talento
language sql
stable
as $function$
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
      select 1 from intereses_match im
      where im.de_perfil = p_talento_id and im.obra_id = f.obra_id
    )
    and not exists (
      select 1 from sala_integrantes si
      join salas s on s.id = si.sala_id
      where s.obra_id = f.obra_id and si.perfil_id = p_talento_id
    )
  order by f.obra_creado_en desc;
$function$;

drop function if exists public.feed_equipos_para_talento();

create function public.feed_equipos_para_talento()
returns table (equipo_id uuid, titulo text, cupo integer, creado_en timestamp with time zone,
              creador_id uuid, creador_nombre text, creador_foto_path text, fotos text[])
language sql
stable
set search_path to 'public'
as $$
  select
    e.id, e.titulo, e.cupo, e.creado_en,
    t.id, t.nombre,
    (select f.storage_path from fotos_talento f where f.talento_id = t.id order by f.orden limit 1),
    coalesce(
      (select array_agg(f.storage_path order by f.orden) from fotos_equipo f where f.equipo_id = e.id),
      '{}'::text[]
    )
  from equipos e
    join perfiles_talento t on t.id = e.creador_id
  where e.activo
    and e.creador_id <> auth.uid()
    and (select count(*) from fotos_equipo f where f.equipo_id = e.id) >= 3
    and not public.hay_bloqueo(e.creador_id)
    and not public.iniciativa_en_cierre(null, e.id)
    and not exists (
      select 1 from intereses_match im
      where im.de_perfil = auth.uid() and im.equipo_id = e.id
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
