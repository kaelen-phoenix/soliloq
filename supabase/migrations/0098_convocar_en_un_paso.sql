-- 0098 — Convocar en un paso, sin «aceptar el match» (#287).
--
-- Antes: interés mutuo → match → el Creador lo aceptaba en Call Back (pasaba a Convocados) →
-- lo convocaba → el Talento aceptaba → sala. Ahora el Creador convoca directo desde el match:
-- `convocar` acepta el match si todavía no lo estaba, con los mismos controles que hacía
-- `aceptar_match` (no vencido, no descartado, iniciativa sin cupo lleno). `aceptar_match`
-- queda en la base por compatibilidad, pero la app ya no la usa.
--
-- Se borra la versión vieja `convocar(uuid)`, sin rol: la app siempre llama a la de dos
-- parámetros, y tener las dos solo agrega ambigüedad.

drop function if exists public.convocar(uuid);

create or replace function public.convocar(p_match_id uuid, p_rol_id uuid default null::uuid)
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  m matches%rowtype;
  v_rol_obra uuid;
  v_vacantes int;
  v_ocupados int;
begin
  select * into m from matches where id = p_match_id and creador_id = auth.uid();
  if m.id is null then raise exception 'match no encontrado'; end if;
  if m.descartado_en is not null then raise exception 'match descartado'; end if;

  if exists (select 1 from convocatorias c
             where c.match_id = p_match_id and c.estado in ('pendiente', 'aceptada')) then
    raise exception 'ya está convocado';
  end if;

  -- 0098: lo que antes hacía `aceptar_match`, en el mismo paso.
  if m.aceptado_en is null then
    if m.expira_en <= now() then raise exception 'el match venció'; end if;
    if public.iniciativa_en_cierre(m.obra_id, m.equipo_id) then
      raise exception 'cupo_lleno';
    end if;
    update matches set aceptado_en = now() where id = p_match_id;
  end if;

  -- Un equipo no tiene roles: cualquier rol que llegue se ignora.
  if m.equipo_id is not null then
    p_rol_id := null;
  elsif p_rol_id is not null then
    select obra_id, vacantes into v_rol_obra, v_vacantes from roles where id = p_rol_id;
    if v_rol_obra is null or v_rol_obra <> m.obra_id then
      raise exception 'rol inválido';
    end if;
    select count(*) into v_ocupados
    from convocatorias c
    where c.rol_id = p_rol_id and c.estado in ('pendiente', 'aceptada');
    if v_ocupados >= v_vacantes then
      raise exception 'rol_lleno';
    end if;
  end if;

  insert into convocatorias (match_id, estado, rol_id) values (p_match_id, 'pendiente', p_rol_id);

  insert into notificaciones (destinatario_id, tipo, obra_id)
    values (m.talento_id, 'convocado', m.obra_id);
end;
$function$;

revoke all on function public.convocar(uuid, uuid) from public, anon;
grant execute on function public.convocar(uuid, uuid) to authenticated;
