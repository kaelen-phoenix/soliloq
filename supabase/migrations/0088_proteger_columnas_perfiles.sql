-- 0088 — Nadie se hace admin ni se aprueba solo (#257).
--
-- `perfiles_update_propio` deja que cada usuario haga `update` de su fila entera, y el rol
-- `authenticated` tiene UPDATE sobre todas las columnas: con una llamada a la API cualquiera
-- podía ponerse `es_admin = true`, marcarse `aprobado_en` (saltear la aprobación) o
-- borrarse `suspendido_en`.
--
-- Un trigger y no privilegios por columna: con privilegios habría que listar lo que SÍ se
-- puede editar y acordarse de sumar cada columna nueva; así, lo nuevo queda editable como
-- hasta hoy y solo se cierran las columnas del sistema.
--
-- `current_user` distingue quién escribe: una sesión de usuario llega como `authenticated`
-- (o `anon`); las RPC de admin (`admin_aprobar_usuario`, `admin_suspender_usuario`,
-- `admin_crear_invitacion`) son `security definer` y corren como su dueño, y el service
-- role es otro rol. Esos siguen pudiendo.

create or replace function public.proteger_columnas_perfiles()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if current_user in ('authenticated', 'anon') and (
       new.es_admin      is distinct from old.es_admin
    or new.aprobado_en   is distinct from old.aprobado_en
    or new.suspendido_en is distinct from old.suspendido_en
    or new.id            is distinct from old.id
    or new.creado_en     is distinct from old.creado_en
  ) then
    raise exception 'columna_protegida' using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists proteger_columnas_perfiles on perfiles;
create trigger proteger_columnas_perfiles
  before update on perfiles
  for each row execute function public.proteger_columnas_perfiles();
