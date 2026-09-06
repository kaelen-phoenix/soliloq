-- Estado "Cierre" en el feed y baja de convocados (issue #107).
--
-- 1. `aceptados_iniciativa` / `iniciativa_en_cierre` pasan a SECURITY DEFINER: cuentan
--    `convocatorias` / `matches`, que tienen RLS sin políticas, así que un invoker las
--    veía en 0 y el "cierre" nunca se activaba.
-- 2. El feed del talento (roles y equipos) deja de ofrecer iniciativas que ya llenaron el
--    cupo.
-- 3. `mis_convocados()`: el Creador ve a los talentos que aceptaron, para poder darlos de
--    baja y liberar un lugar.

create or replace function public.aceptados_iniciativa(p_obra_id uuid, p_equipo_id uuid)
returns int language sql stable security definer set search_path = public as $$
  select count(*)::int
  from convocatorias c
  join matches m on m.id = c.match_id
  where c.estado = 'aceptada'
    and coalesce(m.obra_id, m.equipo_id) = coalesce(p_obra_id, p_equipo_id);
$$;

create or replace function public.iniciativa_en_cierre(p_obra_id uuid, p_equipo_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.aceptados_iniciativa(p_obra_id, p_equipo_id)
       >= public.cupo_iniciativa(p_obra_id, p_equipo_id);
$$;

-- ------------------------------------------------------------------------------------------
-- Feed de roles: sin cambios de columnas, solo se suma el filtro de cierre al WHERE.
-- ------------------------------------------------------------------------------------------
create or replace view feed_talento as
  select
    r.id as rol_id,
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
    c.id as creador_id,
    c.nombre as creador_nombre,
    c.imagen_url as creador_imagen_url,
    coalesce(
      (select array_agg(fo.storage_path order by fo.orden) from fotos_obra fo where fo.obra_id = o.id),
      '{}'::text[]
    ) as obra_fotos
  from roles r
  join obras o on o.id = r.obra_id
  join perfiles_creador c on c.id = o.creador_id
  where o.estado = 'publicada'::estado_obra
    and (select count(*) from postulaciones p
         where p.rol_id = r.id and p.estado = 'aprobado'::estado_postulacion) < r.vacantes
    and not public.iniciativa_en_cierre(o.id, null);

-- ------------------------------------------------------------------------------------------
-- Feed de equipos: mismo filtro.
-- ------------------------------------------------------------------------------------------
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
  order by e.creado_en desc;
$$;
revoke all on function public.feed_equipos_para_talento() from public;
grant execute on function public.feed_equipos_para_talento() to authenticated;

-- ------------------------------------------------------------------------------------------
-- Los talentos que aceptaron la convocatoria del Creador (para darlos de baja).
-- ------------------------------------------------------------------------------------------
create or replace function public.mis_convocados()
returns table (
  convocatoria_id uuid,
  talento_id uuid,
  nombre text,
  foto_path text
)
language sql security definer stable set search_path = public as $$
  select
    c.id,
    m.talento_id,
    t.nombre,
    (select f.storage_path from fotos_talento f
     where f.talento_id = m.talento_id order by f.orden limit 1)
  from convocatorias c
  join matches m on m.id = c.match_id
  join perfiles_talento t on t.id = m.talento_id
  where m.creador_id = auth.uid()
    and c.estado = 'aceptada'
  order by c.respondido_en desc;
$$;

do $$
declare fn text;
begin
  foreach fn in array array[
    'aceptados_iniciativa(uuid,uuid)',
    'iniciativa_en_cierre(uuid,uuid)',
    'mis_convocados()'
  ]
  loop
    execute format('revoke all on function public.%s from public, anon', fn);
    execute format('grant execute on function public.%s to authenticated', fn);
  end loop;
end;
$$;
