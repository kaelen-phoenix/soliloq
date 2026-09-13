-- 0069 — El trigger de match notifica al Creador (issue #160, continúa 0068).
--
-- Va en un archivo separado de 0068 porque el valor de enum que usa no se puede usar en la
-- misma transacción que lo agrega.

create or replace function public.al_marcar_interes_match()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_creador uuid;
  v_talento uuid;
  v_mutuo boolean;
  v_match_id uuid;
begin
  v_creador := public.duenio_iniciativa(new.obra_id, new.equipo_id);
  if v_creador is null then
    return new;
  end if;
  v_talento := case when new.de_perfil = v_creador then new.a_perfil else new.de_perfil end;

  select count(*) = 2 into v_mutuo
  from intereses_match
  where coalesce(obra_id, equipo_id) = coalesce(new.obra_id, new.equipo_id)
    and interesa
    and ((de_perfil = v_creador and a_perfil = v_talento)
         or (de_perfil = v_talento and a_perfil = v_creador));

  if v_mutuo then
    insert into matches (creador_id, talento_id, obra_id, equipo_id)
      values (v_creador, v_talento, new.obra_id, new.equipo_id)
      on conflict do nothing
      returning id into v_match_id;

    -- Sólo si de verdad se insertó una fila nueva (no un no-op por `on conflict`): si no,
    -- ya se avisó la primera vez que se formó este match.
    if v_match_id is not null then
      insert into notificaciones (destinatario_id, tipo, obra_id)
        values (v_creador, 'nuevo_match', new.obra_id);
    end if;
  else
    delete from matches m
    where m.creador_id = v_creador and m.talento_id = v_talento
      and coalesce(m.obra_id, m.equipo_id) = coalesce(new.obra_id, new.equipo_id)
      and m.aceptado_en is null
      and not exists (
        select 1 from convocatorias c
        where c.match_id = m.id and c.estado in ('pendiente', 'aceptada')
      );
  end if;

  return new;
end;
$function$;
