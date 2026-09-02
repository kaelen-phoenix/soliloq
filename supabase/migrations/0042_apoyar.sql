-- Página «Apoyar»: canal de contacto/sugerencias y sponsors con banner.
--   - `mensajes_contacto`: lo que se manda desde el formulario público. Sin sesión: el
--     insert va por RPC `security definer`, no se abre policy de escritura anónima.
--   - `sponsors`: quienes bancan la app. Lectura pública de los activos (para los banners);
--     alta/baja solo por RPC de admin.

-- ------------------------------------------------------------------------------------
-- mensajes_contacto
-- ------------------------------------------------------------------------------------
create table if not exists mensajes_contacto (
  id uuid primary key default gen_random_uuid(),
  nombre text not null check (char_length(nombre) between 1 and 120),
  email text not null check (char_length(email) between 3 and 200),
  tipo text not null check (tipo in ('sugerencia', 'sponsor', 'donacion', 'otro')),
  mensaje text not null check (char_length(mensaje) between 1 and 4000),
  creado_en timestamptz not null default now(),
  leido_en timestamptz
);
create index if not exists idx_mensajes_contacto_creado on mensajes_contacto (creado_en desc);
alter table mensajes_contacto enable row level security;
-- Sin policies: solo se escribe por la RPC de abajo y se lee por la RPC de admin.

create or replace function public.enviar_mensaje_contacto(
  p_nombre text,
  p_email text,
  p_tipo text,
  p_mensaje text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_tipo not in ('sugerencia', 'sponsor', 'donacion', 'otro') then
    raise exception 'tipo invalido';
  end if;
  if p_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'email invalido';
  end if;
  insert into mensajes_contacto (nombre, email, tipo, mensaje)
  values (trim(p_nombre), trim(p_email), p_tipo, trim(p_mensaje));
end;
$$;
revoke all on function public.enviar_mensaje_contacto(text, text, text, text) from public;
grant execute on function public.enviar_mensaje_contacto(text, text, text, text) to anon, authenticated;

-- ------------------------------------------------------------------------------------
-- sponsors
-- ------------------------------------------------------------------------------------
create table if not exists sponsors (
  id uuid primary key default gen_random_uuid(),
  nombre text not null check (char_length(nombre) between 1 and 120),
  logo_url text not null,
  sitio_url text,
  nivel text not null check (nivel in ('reparto', 'coproduccion', 'produccion')),
  activo boolean not null default true,
  orden int not null default 0,
  creado_en timestamptz not null default now()
);
create index if not exists idx_sponsors_activo on sponsors (activo, nivel, orden);
alter table sponsors enable row level security;

drop policy if exists "sponsors_lectura_publica" on sponsors;
create policy "sponsors_lectura_publica" on sponsors
  for select to anon, authenticated using (activo);

-- ------------------------------------------------------------------------------------
-- RPCs de admin (guard `es_admin()` de 0040)
-- ------------------------------------------------------------------------------------
create or replace function public.admin_mensajes(p_limite int default 50, p_offset int default 0)
returns table (
  id uuid, nombre text, email text, tipo text, mensaje text,
  creado_en timestamptz, leido boolean
)
language plpgsql security definer stable set search_path = public
as $$
begin
  if not public.es_admin() then raise exception 'no autorizado'; end if;
  return query
  select m.id, m.nombre, m.email, m.tipo, m.mensaje, m.creado_en, m.leido_en is not null
  from mensajes_contacto m
  order by (m.leido_en is null) desc, m.creado_en desc
  limit greatest(p_limite, 0) offset greatest(p_offset, 0);
end;
$$;

create or replace function public.admin_marcar_mensaje_leido(p_id uuid, p_leido boolean)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  if not public.es_admin() then raise exception 'no autorizado'; end if;
  update mensajes_contacto
  set leido_en = case when p_leido then now() else null end
  where id = p_id;
end;
$$;

create or replace function public.admin_sponsors()
returns setof sponsors
language plpgsql security definer stable set search_path = public
as $$
begin
  if not public.es_admin() then raise exception 'no autorizado'; end if;
  return query select * from sponsors order by nivel, orden, creado_en;
end;
$$;

create or replace function public.admin_guardar_sponsor(
  p_id uuid,
  p_nombre text,
  p_logo_url text,
  p_sitio_url text,
  p_nivel text,
  p_activo boolean,
  p_orden int
)
returns uuid
language plpgsql security definer set search_path = public
as $$
declare v_id uuid;
begin
  if not public.es_admin() then raise exception 'no autorizado'; end if;
  if p_nivel not in ('reparto', 'coproduccion', 'produccion') then
    raise exception 'nivel invalido';
  end if;
  if p_id is null then
    insert into sponsors (nombre, logo_url, sitio_url, nivel, activo, orden)
    values (p_nombre, p_logo_url, nullif(p_sitio_url, ''), p_nivel, p_activo, coalesce(p_orden, 0))
    returning id into v_id;
  else
    update sponsors set
      nombre = p_nombre, logo_url = p_logo_url, sitio_url = nullif(p_sitio_url, ''),
      nivel = p_nivel, activo = p_activo, orden = coalesce(p_orden, 0)
    where id = p_id
    returning id into v_id;
  end if;
  return v_id;
end;
$$;

create or replace function public.admin_borrar_sponsor(p_id uuid)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  if not public.es_admin() then raise exception 'no autorizado'; end if;
  delete from sponsors where id = p_id;
end;
$$;

do $$
declare fn text;
begin
  foreach fn in array array[
    'admin_mensajes(int,int)',
    'admin_marcar_mensaje_leido(uuid,boolean)',
    'admin_sponsors()',
    'admin_guardar_sponsor(uuid,text,text,text,text,boolean,int)',
    'admin_borrar_sponsor(uuid)'
  ] loop
    execute format('revoke all on function public.%s from public, anon', fn);
    execute format('grant execute on function public.%s to authenticated', fn);
  end loop;
end;
$$;
