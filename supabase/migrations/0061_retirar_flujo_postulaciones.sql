-- 0061 — Retirar el flujo viejo de postulaciones / intereses_equipo (issue #117).
--
-- El circuito de match (0054+) pasa a ser el único: el swipe del feed sólo escribe
-- `intereses_match` (vía `marcar_interes`), y el Creador suma gente desde `/matches` →
-- `convocar()`. Se retiran del feed las dependencias de `postulaciones` / `descartes` /
-- `intereses_equipo` / `descartes_equipo`, y las RPC del flujo de equipo viejo.
--
-- Las TABLAS (`postulaciones`, `descartes`, `intereses_equipo`, `descartes_equipo`), el
-- enum `estado_postulacion` y sus triggers NO se eliminan: se preserva la data. Sólo dejan
-- de leerse/escribirse desde la app.

-- ── Feed de roles ────────────────────────────────────────────────────────────────
-- La vista deja de filtrar por "postulaciones aprobadas < vacantes": el cupo del proyecto
-- ya lo maneja `iniciativa_en_cierre` (cuenta convocatorias aceptadas).
create or replace view feed_talento as
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
    c.id as creador_id,
    c.nombre as creador_nombre,
    c.imagen_url as creador_imagen_url,
    coalesce((select array_agg(fo.storage_path order by fo.orden)
              from fotos_obra fo where fo.obra_id = o.id), '{}'::text[]) as obra_fotos
  from roles r
    join obras o on o.id = r.obra_id
    join perfiles_creador c on c.id = o.creador_id
  where o.estado = 'publicada'::estado_obra
    and not iniciativa_en_cierre(o.id, null::uuid);

-- El feed personalizado ya no mira `postulaciones` / `descartes`: excluye lo que el talento
-- ya decidió en `intereses_match` y lo que ya tiene sala.
create or replace function public.feed_para_talento(p_talento_id uuid, p_radio_metros integer default null)
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

-- ── Feed de equipos ──────────────────────────────────────────────────────────────
create or replace function public.feed_equipos_para_talento()
returns table(equipo_id uuid, titulo text, cupo integer, creado_en timestamp with time zone,
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
$function$;

-- ── Deshacer un "Me interesa" desde el feed ──────────────────────────────────────
-- Reemplaza el borrado directo de `postulaciones` / `descartes` que hacía el botón
-- "Deshacer". Sólo borra la fila propia y sólo si todavía no se materializó un match.
create or replace function public.deshacer_interes(p_obra_id uuid, p_equipo_id uuid)
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  if exists (
    select 1 from matches m
    where m.talento_id = auth.uid()
      and coalesce(m.obra_id, m.equipo_id) = coalesce(p_obra_id, p_equipo_id)
  ) then
    raise exception 'ya hay match, no se puede deshacer';
  end if;

  delete from intereses_match
  where de_perfil = auth.uid()
    and coalesce(obra_id, equipo_id) = coalesce(p_obra_id, p_equipo_id);
end;
$function$;

revoke all on function public.deshacer_interes(uuid, uuid) from public, anon;
grant execute on function public.deshacer_interes(uuid, uuid) to authenticated;

-- ── RPC del flujo de equipo viejo ───────────────────────────────────────────────
drop function if exists public.interes_en_equipo(uuid, boolean);
drop function if exists public.interesados_en_equipo(uuid);
drop function if exists public.aceptar_en_equipo(uuid, uuid);
