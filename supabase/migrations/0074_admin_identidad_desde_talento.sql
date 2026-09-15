-- 0074 — El panel de admin resuelve nombres desde perfiles_talento (issue #175, 4/4 DB).
--
-- `admin_denuncias`/`admin_bloqueos` (0040) usaban `coalesce(t.nombre, c.nombre)` — el mismo
-- patrón que #140 identificó como fuente de inconsistencias. Con el backfill de 0071, todo
-- perfil tiene Talento, así que el `coalesce` ya no hace falta: se deja `t.nombre` solo.
-- `admin_usuarios` (0062) mostraba los dos nombres concatenados ("Talento / Creador") para
-- no esconder el segundo — con una sola identidad posible, eso también sobra.
-- `admin_publicaciones` (0062) mostraba `creador_nombre` desde `perfiles_creador`.

create or replace function public.admin_usuarios(p_texto text default null, p_limite integer default 50, p_offset integer default 0)
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
    t.nombre,
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
     or u.email ilike '%' || p_texto || '%'
  order by u.created_at desc
  limit greatest(p_limite, 0)
  offset greatest(p_offset, 0);
end;
$function$;

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
    pubs.creador_id, t.nombre as creador_nombre, u.email::text as creador_email,
    pubs.fotos, pubs.detalle, pubs.creado_en
  from pubs
  join auth.users u on u.id = pubs.creador_id
  left join perfiles_talento t on t.id = pubs.creador_id
  where p_texto is null
     or pubs.titulo ilike '%' || p_texto || '%'
     or t.nombre ilike '%' || p_texto || '%'
     or u.email ilike '%' || p_texto || '%'
  order by pubs.creado_en desc
  limit greatest(p_limite, 0)
  offset greatest(p_offset, 0);
end;
$function$;

create or replace function public.admin_denuncias(
  p_estado text default null,
  p_limite int default 50,
  p_offset int default 0
)
returns table (
  id uuid,
  motivo text,
  detalle text,
  estado text,
  resolucion text,
  creado_en timestamptz,
  resuelto_en timestamptz,
  denunciante text,
  denunciado text,
  denunciado_id uuid,
  obra_titulo text
)
language plpgsql
security definer
stable
set search_path = public
as $$
begin
  if not public.es_admin() then
    raise exception 'no autorizado';
  end if;

  return query
  select
    d.id,
    d.motivo::text,
    d.detalle,
    d.estado::text,
    d.resolucion,
    d.creado_en,
    d.resuelto_en,
    (select t.nombre from perfiles_talento t where t.id = d.denunciante_id) as denunciante,
    (select t.nombre from perfiles_talento t where t.id = d.perfil_denunciado_id) as denunciado,
    d.perfil_denunciado_id as denunciado_id,
    (select o.titulo from obras o where o.id = d.obra_id) as obra_titulo
  from denuncias d
  where p_estado is null or d.estado::text = p_estado
  order by
    case when d.estado in ('abierta', 'en_revision') then 0 else 1 end,
    d.creado_en desc
  limit greatest(p_limite, 0)
  offset greatest(p_offset, 0);
end;
$$;

create or replace function public.admin_bloqueos(
  p_limite int default 50,
  p_offset int default 0
)
returns table (
  perfil_menor uuid,
  perfil_mayor uuid,
  nombre_menor text,
  nombre_mayor text,
  creado_por uuid,
  nombre_autor text,
  motivo text,
  creado_en timestamptz
)
language plpgsql
security definer
stable
set search_path = public
as $$
begin
  if not public.es_admin() then
    raise exception 'no autorizado';
  end if;

  return query
  select
    b.perfil_menor,
    b.perfil_mayor,
    (select t.nombre from perfiles_talento t where t.id = b.perfil_menor),
    (select t.nombre from perfiles_talento t where t.id = b.perfil_mayor),
    b.creado_por,
    (select t.nombre from perfiles_talento t where t.id = b.creado_por),
    b.motivo,
    b.creado_en
  from bloqueos b
  order by b.creado_en desc
  limit greatest(p_limite, 0)
  offset greatest(p_offset, 0);
end;
$$;
