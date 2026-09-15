-- 0078 — Ingreso cerrado durante la etapa de prueba: invitación o aprobación manual.
--
-- Mientras se prueba y modifica la app, nadie entra sin que un admin lo habilite. Dos
-- caminos:
--   1. Un admin invita a un email de antemano (`admin_crear_invitacion`). Quien se registre
--      con ese email queda aprobado automáticamente, sin pasos extra.
--   2. Quien se registra sin invitación queda "pendiente" (`aprobado_en is null`): no puede
--      completar su Perfil de Talento todavía, ve un aviso de solicitud enviada, y un admin
--      la aprueba a mano (`admin_aprobar_usuario`) desde el panel.
--
-- Las cuentas que ya existían quedan aprobadas: esto no es retroactivo, sólo cierra la
-- puerta a partir de ahora.

alter table perfiles add column if not exists aprobado_en timestamptz;
update perfiles set aprobado_en = now() where aprobado_en is null;

create table invitaciones (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  creado_por uuid references perfiles (id) on delete set null,
  usado_por uuid references perfiles (id) on delete set null,
  usado_en timestamptz,
  creado_en timestamptz not null default now()
);

-- Sin políticas a propósito (mismo patrón que 0033/0046): todo pasa por las RPC
-- `security definer` de abajo, que ya verifican `es_admin()`.
alter table invitaciones enable row level security;

-- El alta automática de `perfiles` ahora también resuelve si hay una invitación esperando
-- a ese email, y si la hay, aprueba la cuenta en el mismo insert.
create or replace function public.manejar_nuevo_usuario()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_invitacion_id uuid;
begin
  select id into v_invitacion_id
  from invitaciones
  where email = lower(new.email) and usado_en is null;

  insert into public.perfiles (id, aprobado_en)
    values (new.id, case when v_invitacion_id is not null then now() else null end);

  if v_invitacion_id is not null then
    update invitaciones set usado_por = new.id, usado_en = now() where id = v_invitacion_id;
  end if;

  return new;
end;
$$;

-- Un admin invita a un email. Si ya existe una cuenta con ese email (se registró antes de
-- la invitación y quedó pendiente), se aprueba directo en vez de dejarla esperando a que
-- alguien la vuelva a tocar.
create or replace function public.admin_crear_invitacion(p_email text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text := lower(trim(p_email));
  v_existente uuid;
begin
  if not public.es_admin() then
    raise exception 'no autorizado';
  end if;
  if v_email !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' then
    raise exception 'email inválido';
  end if;

  insert into invitaciones (email, creado_por) values (v_email, auth.uid())
    on conflict (email) do nothing;

  select u.id into v_existente from auth.users u where lower(u.email) = v_email;
  if v_existente is not null then
    update perfiles set aprobado_en = coalesce(aprobado_en, now()) where id = v_existente;
    update invitaciones set usado_por = v_existente, usado_en = now()
      where email = v_email and usado_en is null;
  end if;
end;
$$;

-- Habilita a mano una cuenta que se registró sin invitación.
create or replace function public.admin_aprobar_usuario(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.es_admin() then
    raise exception 'no autorizado';
  end if;
  update perfiles set aprobado_en = now() where id = p_id and aprobado_en is null;
end;
$$;

-- Cuentas sin aprobar: no tienen Perfil de Talento todavía (no se les dejó completarlo), así
-- que lo único que hay para mostrar es el email y cuándo se registraron.
create or replace function public.admin_solicitudes_pendientes(p_limite int default 50, p_offset int default 0)
returns table (id uuid, email text, creado_en timestamptz)
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
  select p.id, u.email::text, u.created_at
  from perfiles p
  join auth.users u on u.id = p.id
  where p.aprobado_en is null
  order by u.created_at desc
  limit greatest(p_limite, 0)
  offset greatest(p_offset, 0);
end;
$$;

-- Invitaciones ya enviadas, para que el admin vea qué mandó y si ya se usó.
create or replace function public.admin_invitaciones(p_limite int default 50, p_offset int default 0)
returns table (id uuid, email text, creado_en timestamptz, usado_en timestamptz)
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
  select i.id, i.email, i.creado_en, i.usado_en
  from invitaciones i
  order by i.creado_en desc
  limit greatest(p_limite, 0)
  offset greatest(p_offset, 0);
end;
$$;

revoke all on function public.admin_crear_invitacion(text) from public, anon;
grant execute on function public.admin_crear_invitacion(text) to authenticated;
revoke all on function public.admin_aprobar_usuario(uuid) from public, anon;
grant execute on function public.admin_aprobar_usuario(uuid) to authenticated;
revoke all on function public.admin_solicitudes_pendientes(int, int) from public, anon;
grant execute on function public.admin_solicitudes_pendientes(int, int) to authenticated;
revoke all on function public.admin_invitaciones(int, int) from public, anon;
grant execute on function public.admin_invitaciones(int, int) to authenticated;
