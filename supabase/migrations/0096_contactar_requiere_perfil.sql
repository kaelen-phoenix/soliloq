-- 0096 — Para contactar desde un perfil público hay que tener perfil.
--
-- `/p/[token]` está fuera de la app y no pasa por la guarda de cuenta (aprobada, Normas,
-- perfil): alguien recién registrado, sin perfil todavía, podía tocar «Contactar» y el chat
-- directo se abría con «Alguien» del otro lado. La pantalla ahora lo manda a completar el
-- perfil primero; esto es la misma regla en la base, para que no se pueda saltear.
-- Cuerpo igual al de 0090 más el chequeo marcado con «0096».

create or replace function public.contactar_desde_perfil(p_token uuid)
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_duenio uuid;
  v_reciproco boolean;
begin
  select id into v_duenio
  from perfiles
  where enlace_token = p_token and enlace_publico_activo;

  if v_duenio is null then
    raise exception 'enlace no disponible';
  end if;

  if v_duenio = auth.uid() then
    raise exception 'es tu propio perfil';
  end if;

  -- 0096: sin perfil no se contacta. Si no, el chat directo quedaba con «Alguien» y quien
  -- recibe el contacto no sabe quién le escribe.
  if not exists (select 1 from perfiles_talento where id = auth.uid()) then
    raise exception 'perfil_incompleto';
  end if;

  if public.hay_bloqueo(v_duenio) then
    raise exception 'no disponible';
  end if;

  select exists (
    select 1 from intereses_equipo
    where de_perfil = v_duenio and a_perfil = auth.uid() and interesa
  ) into v_reciproco;

  -- #265: a quien ocultó su perfil no la contacta nadie nuevo (salvo para responderle).
  if public.perfil_oculto_a_nuevos(v_duenio) and not v_reciproco then
    raise exception 'no disponible';
  end if;

  insert into intereses_equipo (de_perfil, a_perfil, interesa)
    values (auth.uid(), v_duenio, true)
    on conflict (de_perfil, a_perfil) do update set interesa = true;

  if not v_reciproco then
    insert into notificaciones (destinatario_id, tipo, de_perfil)
      values (v_duenio, 'interes_recibido', auth.uid());
  end if;
end;
$function$;
