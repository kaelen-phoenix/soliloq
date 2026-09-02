-- Panel de administración. Hasta ahora la moderación se hacía a mano en el SQL Editor
-- (registro abierto, sin concepto de admin). Esto introduce:
--   - `perfiles.es_admin` (flag, no un rol nuevo) y `perfiles.suspendido_en` (baja lógica,
--     reversible — no hay borrado real).
--   - `dlucchelli@gmail.com` como admin.
--   - RPCs `security definer` con guard `es_admin()` para métricas, listado de usuarios,
--     suspensión, y gestión de denuncias (`0029`) y bloqueos (`0022`).
-- No se abren políticas RLS nuevas: todo el acceso del panel pasa por estas funciones.

-- ------------------------------------------------------------------------------------
-- 1. Columnas
-- ------------------------------------------------------------------------------------
alter table perfiles add column if not exists es_admin boolean not null default false;
alter table perfiles add column if not exists suspendido_en timestamptz;

update perfiles
set es_admin = true
where id = (select id from auth.users where lower(email) = 'dlucchelli@gmail.com');

-- ------------------------------------------------------------------------------------
-- 2. Guard
-- ------------------------------------------------------------------------------------
create or replace function public.es_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select coalesce((select es_admin from perfiles where id = auth.uid()), false);
$$;

revoke all on function public.es_admin() from public, anon;
grant execute on function public.es_admin() to authenticated;

-- ------------------------------------------------------------------------------------
-- 3. Métricas
-- ------------------------------------------------------------------------------------
create or replace function public.admin_metricas()
returns table (
  total int,
  con_talento int,
  con_creador int,
  con_ambos int,
  suspendidos int,
  con_enlace_publico int,
  bloqueos int,
  denuncias_abiertas int,
  registros_7d int
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
    (select count(*)::int from auth.users where created_at >= now() - interval '7 days');
end;
$$;

-- ------------------------------------------------------------------------------------
-- 4. Usuarios
-- ------------------------------------------------------------------------------------
create or replace function public.admin_usuarios(
  p_texto text default null,
  p_limite int default 50,
  p_offset int default 0
)
returns table (
  id uuid,
  nombre text,
  email text,
  roles text[],
  suspendido boolean,
  es_admin boolean,
  creado_en timestamptz,
  ultimo_acceso timestamptz
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
    p.id,
    coalesce(t.nombre, c.nombre) as nombre,
    u.email::text,
    (
      case when t.id is not null then array['talento'] else array[]::text[] end
      || case when c.id is not null then array['creador'] else array[]::text[] end
    ) as roles,
    p.suspendido_en is not null as suspendido,
    p.es_admin,
    u.created_at as creado_en,
    u.last_sign_in_at as ultimo_acceso
  from perfiles p
  join auth.users u on u.id = p.id
  left join perfiles_talento t on t.id = p.id
  left join perfiles_creador c on c.id = p.id
  where p_texto is null
     or coalesce(t.nombre, c.nombre) ilike '%' || p_texto || '%'
     or u.email ilike '%' || p_texto || '%'
  order by u.created_at desc
  limit greatest(p_limite, 0)
  offset greatest(p_offset, 0);
end;
$$;

-- ------------------------------------------------------------------------------------
-- 5. Suspender / reactivar
-- ------------------------------------------------------------------------------------
create or replace function public.admin_suspender_usuario(p_id uuid, p_suspender boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.es_admin() then
    raise exception 'no autorizado';
  end if;
  if p_id = auth.uid() then
    raise exception 'no podés suspenderte a vos mismo';
  end if;
  if exists (select 1 from perfiles where id = p_id and es_admin) then
    raise exception 'no podés suspender a otro admin';
  end if;

  update perfiles
  set suspendido_en = case when p_suspender then now() else null end
  where id = p_id;
end;
$$;

-- ------------------------------------------------------------------------------------
-- 6. Denuncias
-- ------------------------------------------------------------------------------------
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
    (select coalesce(t.nombre, c.nombre) from perfiles pp
       left join perfiles_talento t on t.id = pp.id
       left join perfiles_creador c on c.id = pp.id
       where pp.id = d.denunciante_id) as denunciante,
    (select coalesce(t.nombre, c.nombre) from perfiles pp
       left join perfiles_talento t on t.id = pp.id
       left join perfiles_creador c on c.id = pp.id
       where pp.id = d.perfil_denunciado_id) as denunciado,
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

create or replace function public.admin_resolver_denuncia(
  p_id uuid,
  p_estado text,
  p_resolucion text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.es_admin() then
    raise exception 'no autorizado';
  end if;
  if p_estado not in ('abierta', 'en_revision', 'resuelta', 'descartada') then
    raise exception 'estado invalido';
  end if;

  update denuncias
  set estado = p_estado::estado_denuncia,
      resolucion = coalesce(p_resolucion, resolucion),
      resuelto_en = case when p_estado in ('resuelta', 'descartada') then now() else null end
  where id = p_id;
end;
$$;

-- ------------------------------------------------------------------------------------
-- 7. Bloqueos
-- ------------------------------------------------------------------------------------
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
    (select coalesce(t.nombre, c.nombre) from perfiles pp
       left join perfiles_talento t on t.id = pp.id
       left join perfiles_creador c on c.id = pp.id where pp.id = b.perfil_menor),
    (select coalesce(t.nombre, c.nombre) from perfiles pp
       left join perfiles_talento t on t.id = pp.id
       left join perfiles_creador c on c.id = pp.id where pp.id = b.perfil_mayor),
    b.creado_por,
    (select coalesce(t.nombre, c.nombre) from perfiles pp
       left join perfiles_talento t on t.id = pp.id
       left join perfiles_creador c on c.id = pp.id where pp.id = b.creado_por),
    b.motivo,
    b.creado_en
  from bloqueos b
  order by b.creado_en desc
  limit greatest(p_limite, 0)
  offset greatest(p_offset, 0);
end;
$$;

create or replace function public.admin_levantar_bloqueo(p_menor uuid, p_mayor uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.es_admin() then
    raise exception 'no autorizado';
  end if;
  delete from bloqueos where perfil_menor = p_menor and perfil_mayor = p_mayor;
end;
$$;

create or replace function public.admin_crear_bloqueo(
  p_a uuid,
  p_b uuid,
  p_motivo text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.es_admin() then
    raise exception 'no autorizado';
  end if;
  if p_a = p_b then
    raise exception 'son el mismo usuario';
  end if;

  insert into bloqueos (perfil_menor, perfil_mayor, creado_por, motivo)
  values (least(p_a, p_b), greatest(p_a, p_b), auth.uid(), p_motivo)
  on conflict (perfil_menor, perfil_mayor) do nothing;
end;
$$;

-- ------------------------------------------------------------------------------------
-- 8. Permisos
-- ------------------------------------------------------------------------------------
do $$
declare fn text;
begin
  foreach fn in array array[
    'admin_metricas()',
    'admin_usuarios(text,int,int)',
    'admin_suspender_usuario(uuid,boolean)',
    'admin_denuncias(text,int,int)',
    'admin_resolver_denuncia(uuid,text,text)',
    'admin_bloqueos(int,int)',
    'admin_levantar_bloqueo(uuid,uuid)',
    'admin_crear_bloqueo(uuid,uuid,text)'
  ]
  loop
    execute format('revoke all on function public.%s from public, anon', fn);
    execute format('grant execute on function public.%s to authenticated', fn);
  end loop;
end;
$$;
