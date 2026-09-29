-- 0087 — Límite al formulario de contacto de «Apoyar» (issue #252).
--
-- `enviar_mensaje_contacto` (0042) se llama sin sesión y directo contra Supabase —sin pasar
-- por Vercel ni su protección—, y no tenía ningún límite: un script podía meter miles de
-- mensajes por minuto y llenar la base (plan free).
--
-- Dos topes, en la función misma (es la única puerta de escritura: la tabla no tiene
-- policies):
--   - por email: 3 por hora (una persona real no manda más);
--   - global: 60 por hora (con el tráfico de hoy, mucho más de lo que llega en un día).
-- Pasado el tope se rechaza con 'demasiados_mensajes' (el formulario lo explica).
--
-- El lock serializa los envíos: sin él, muchos pedidos en paralelo contarían lo mismo antes
-- de que ninguno inserte y el tope se podría pasar. Con el volumen legítimo no se nota.

create index if not exists idx_mensajes_contacto_email_creado
  on mensajes_contacto (lower(email), creado_en desc);

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

  perform pg_advisory_xact_lock(hashtext('enviar_mensaje_contacto'));

  if (select count(*) from mensajes_contacto
      where lower(email) = lower(trim(p_email)) and creado_en > now() - interval '1 hour') >= 3
     or (select count(*) from mensajes_contacto
         where creado_en > now() - interval '1 hour') >= 60 then
    raise exception 'demasiados_mensajes';
  end if;

  insert into mensajes_contacto (nombre, email, tipo, mensaje)
  values (trim(p_nombre), trim(p_email), p_tipo, trim(p_mensaje));
end;
$$;

revoke all on function public.enviar_mensaje_contacto(text, text, text, text) from public;
grant execute on function public.enviar_mensaje_contacto(text, text, text, text) to anon, authenticated;
