-- 0093 — Mails de la app: bienvenida y avisos de acceso (#272).
--
-- `bienvenida_enviada_en` marca que el mail ya salió. El servidor lo «reclama» con un update
-- atómico antes de mandarlo (y lo libera si el envío falla), así dos llamadas a la vez no lo
-- mandan dos veces. Lo escribe solo el servidor con la clave de servicio.
--
-- Se suma a las columnas que el usuario no puede tocarse a sí mismo (0088): si pudiera
-- borrarla, se podría pedir la bienvenida una y otra vez.

alter table perfiles add column if not exists bienvenida_enviada_en timestamptz;

-- Los avisos de acceso (0092: `solicitud_acceso`, `acceso_habilitado`) también salen por
-- mail. Columna aparte de `push_enviado_en`: son dos canales que se despachan y se
-- reintentan cada uno por su lado.
alter table notificaciones add column if not exists mail_enviado_en timestamptz;

create or replace function public.proteger_columnas_perfiles()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if current_user in ('authenticated', 'anon') and (
       new.es_admin              is distinct from old.es_admin
    or new.aprobado_en           is distinct from old.aprobado_en
    or new.suspendido_en         is distinct from old.suspendido_en
    or new.id                    is distinct from old.id
    or new.creado_en             is distinct from old.creado_en
    or new.bienvenida_enviada_en is distinct from old.bienvenida_enviada_en
  ) then
    raise exception 'columna_protegida' using errcode = '42501';
  end if;
  return new;
end;
$$;
