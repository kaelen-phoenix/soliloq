-- 0092 — Avisos de acceso: a los admins cuando alguien pide entrar, y a la persona cuando
-- la habilitan (#247, #248).
--
-- Sin mail: el proyecto no tiene SMTP propio y el de Supabase solo manda los mails de login
-- (2 por hora). Se avisa por la campanita (`notificaciones`) y por push. La base crea la
-- notificación, y el push lo manda el servidor (`despacharAvisosDeAcceso`, en
-- `acciones-push.ts`), que marca `push_enviado_en` para no mandarlo dos veces.
--
--   - `solicitud_acceso`: una por cada admin cuando se crea una cuenta sin invitación
--     (`aprobado_en` null, 0078). `de_perfil` = quien pidió entrar.
--   - `acceso_habilitado`: a la persona cuando `aprobado_en` pasa de null a una fecha, sea
--     por «Aprobar» o porque un admin invitó a un email que ya estaba esperando. Al mismo
--     tiempo, las `solicitud_acceso` de esa persona quedan leídas para todos los admins: ya
--     se resolvió.

alter type tipo_notificacion add value if not exists 'solicitud_acceso';
alter type tipo_notificacion add value if not exists 'acceso_habilitado';

alter table notificaciones add column if not exists push_enviado_en timestamptz;

create or replace function public.avisar_acceso()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    if new.aprobado_en is null then
      insert into notificaciones (destinatario_id, tipo, de_perfil)
      select p.id, 'solicitud_acceso', new.id
      from perfiles p
      where p.es_admin and p.suspendido_en is null;
    end if;
  elsif old.aprobado_en is null and new.aprobado_en is not null then
    insert into notificaciones (destinatario_id, tipo)
      values (new.id, 'acceso_habilitado');
    update notificaciones set leida_en = now()
    where tipo = 'solicitud_acceso' and de_perfil = new.id and leida_en is null;
  end if;
  return new;
end;
$$;

drop trigger if exists avisar_acceso on perfiles;
create trigger avisar_acceso
  after insert or update of aprobado_en on perfiles
  for each row execute function public.avisar_acceso();
