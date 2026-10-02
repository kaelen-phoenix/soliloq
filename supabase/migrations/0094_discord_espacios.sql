-- 0094 — Espacios privados en Discord para Proyectos y Equipos (#269).
--
-- - `perfiles.discord_user_id`: la cuenta de Discord vinculada (OAuth). La escribe solo el
--   servidor después de verificar con Discord: si el usuario la pudiera editar, podría
--   «vincular» la cuenta de otra persona y meterla (o meterse) en canales ajenos. Por eso se
--   suma a las columnas protegidas de 0088.
-- - `salas.discord_canal_id` / `discord_voz_id`: los canales privados (texto y voz) de esa
--   sala, si el dueño los abrió. Los escribe
--   solo el servidor (la tabla no tiene política de update).

alter table perfiles add column if not exists discord_user_id text;
alter table perfiles add column if not exists discord_usuario text;
create unique index if not exists perfiles_discord_user_id_unico on perfiles (discord_user_id)
  where discord_user_id is not null;

alter table salas add column if not exists discord_canal_id text;
alter table salas add column if not exists discord_voz_id text;

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
    or new.discord_user_id       is distinct from old.discord_user_id
    or new.discord_usuario       is distinct from old.discord_usuario
  ) then
    raise exception 'columna_protegida' using errcode = '42501';
  end if;
  return new;
end;
$$;
