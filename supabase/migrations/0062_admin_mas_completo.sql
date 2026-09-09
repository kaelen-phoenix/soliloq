-- 0062 — Panel de admin más completo (issue #140).
--
-- 1. `admin_usuarios`: buscaba/mostraba con `coalesce(t.nombre, c.nombre)`, así que las
--    cuentas con doble perfil sólo exponían el nombre de Talento (bug "lauravrey"). Ahora
--    busca contra los dos nombres + email y muestra ambos. Suma `enlace_token` /
--    `enlace_publico_activo` / `modo_activo` para el botón "Ver como en la app".
-- 2. `admin_metricas`: suma contadores del modelo de match.
-- 3. `admin_publicaciones`: nueva RPC de sólo lectura — obras (todos los estados) + equipos.

-- ── admin_usuarios ──────────────────────────────────────────────────────────────
drop function if exists public.admin_usuarios(text, integer, integer);

create function public.admin_usuarios(p_texto text default null, p_limite integer default 50, p_offset integer default 0)
returns table (
  id uuid, nombre text, email text, roles text[], suspendido boolean, es_admin boolean,
  modo_activo text, enlace_token uuid, enlace_publico_activo boolean,
  creado_en timestamptz, ultimo_acceso timestamptz
)
language plpgsql
stable
security definer
set search_path to 'public'
as $function$
begin
  if not public.es_admin() then
    raise exception 'no autorizado';
  end if;

  return query
  select
    p.id,
    nullif(
      array_to_string(array(
        select distinct x from unnest(array[c.nombre, t.nombre]) x where x is not null
      ), ' / '),
      ''
    ) as nombre,
    u.email::text,
    (
      case when t.id is not null then array['talento'] else array[]::text[] end
      || case when c.id is not null then array['creador'] else array[]::text[] end
    ) as roles,
    p.suspendido_en is not null as suspendido,
    p.es_admin,
    p.modo_activo::text,
    p.enlace_token,
    p.enlace_publico_activo,
    u.created_at as creado_en,
    u.last_sign_in_at as ultimo_acceso
  from perfiles p
  join auth.users u on u.id = p.id
  left join perfiles_talento t on t.id = p.id
  left join perfiles_creador c on c.id = p.id
  where p_texto is null
     or t.nombre ilike '%' || p_texto || '%'
     or c.nombre ilike '%' || p_texto || '%'
     or u.email ilike '%' || p_texto || '%'
  order by u.created_at desc
  limit greatest(p_limite, 0)
  offset greatest(p_offset, 0);
end;
$function$;

revoke all on function public.admin_usuarios(text, integer, integer) from public, anon;
grant execute on function public.admin_usuarios(text, integer, integer) to authenticated;

-- ── admin_metricas ─────────────────────────────────────────────────────────────
drop function if exists public.admin_metricas();

create function public.admin_metricas()
returns table (
  total integer, con_talento integer, con_creador integer, con_ambos integer,
  suspendidos integer, con_enlace_publico integer, bloqueos integer, denuncias_abiertas integer,
  registros_7d integer,
  obras_publicadas integer, equipos_activos integer, matches_activos integer,
  convocatorias_aceptadas integer, salas integer, interes_7d integer
)
language plpgsql
stable
security definer
set search_path to 'public'
as $function$
begin
  if not public.es_admin() then
    raise exception 'no autorizado';
  end if;

  return query
  select
    (select count(*)::int from perfiles),
    (select count(*)::int from perfiles_talento),
    (select count(*)::int from perfiles_creador),
    (select count(*)::int from perfiles p
       where exists (select 1 from perfiles_talento t where t.id = p.id)
         and exists (select 1 from perfiles_creador c where c.id = p.id)),
    (select count(*)::int from perfiles where suspendido_en is not null),
    (select count(*)::int from perfiles where enlace_publico_activo),
    (select count(*)::int from bloqueos),
    (select count(*)::int from denuncias where estado in ('abierta', 'en_revision')),
    (select count(*)::int from auth.users where created_at >= now() - interval '7 days'),
    (select count(*)::int from obras where estado = 'publicada'),
    (select count(*)::int from equipos where activo),
    (select count(*)::int from matches where expira_en > now()),
    (select count(*)::int from convocatorias where estado = 'aceptada'),
    (select count(*)::int from salas),
    (select count(*)::int from intereses_match where creado_en >= now() - interval '7 days');
end;
$function$;

revoke all on function public.admin_metricas() from public, anon;
grant execute on function public.admin_metricas() to authenticated;

-- ── admin_publicaciones ────────────────────────────────────────────────────────
create or replace function public.admin_publicaciones(p_texto text default null, p_limite integer default 50, p_offset integer default 0)
returns table (
  tipo text, id uuid, titulo text, estado text,
  creador_id uuid, creador_nombre text, creador_email text,
  fotos integer, detalle text, creado_en timestamptz
)
language plpgsql
stable
security definer
set search_path to 'public'
as $function$
begin
  if not public.es_admin() then
    raise exception 'no autorizado';
  end if;

  return query
  with pubs as (
    select
      'obra'::text as tipo, o.id, o.titulo, o.estado::text as estado, o.creador_id,
      (select count(*)::int from fotos_obra f where f.obra_id = o.id) as fotos,
      (
        (select count(*)::int from roles r where r.obra_id = o.id) || ' rol(es), '
        || coalesce((select sum(r.vacantes)::int from roles r where r.obra_id = o.id), 0) || ' vacante(s)'
      ) as detalle,
      o.creado_en
    from obras o
    union all
    select
      'equipo'::text, e.id, e.titulo, (case when e.activo then 'activo' else 'cerrado' end),
      e.creador_id,
      (select count(*)::int from fotos_equipo f where f.equipo_id = e.id),
      ('cupo ' || e.cupo)::text,
      e.creado_en
    from equipos e
  )
  select
    pubs.tipo, pubs.id, pubs.titulo, pubs.estado,
    pubs.creador_id, c.nombre as creador_nombre, u.email::text as creador_email,
    pubs.fotos, pubs.detalle, pubs.creado_en
  from pubs
  join auth.users u on u.id = pubs.creador_id
  left join perfiles_creador c on c.id = pubs.creador_id
  where p_texto is null
     or pubs.titulo ilike '%' || p_texto || '%'
     or c.nombre ilike '%' || p_texto || '%'
     or u.email ilike '%' || p_texto || '%'
  order by pubs.creado_en desc
  limit greatest(p_limite, 0)
  offset greatest(p_offset, 0);
end;
$function$;

revoke all on function public.admin_publicaciones(text, integer, integer) from public, anon;
grant execute on function public.admin_publicaciones(text, integer, integer) to authenticated;
