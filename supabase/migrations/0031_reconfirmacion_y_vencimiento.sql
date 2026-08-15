-- Dos reglas nuevas sobre el ciclo de vida de una postulación.
--
-- 1. RECONFIRMACIÓN. Aprobar una postulación vieja no crea la sala de una: primero se le
--    pregunta al talento si sigue disponible. Una persona que se postuló hace tres semanas
--    puede estar en otra obra, y enterarse por un chat que se abrió solo es la forma más
--    rápida de que un elenco arranque con alguien que ya no está.
--
-- 2. VENCIMIENTO. Una postulación que nadie decide se cierra sola y se avisa. El silencio
--    indefinido es exactamente lo que la app existe para no repetir del casting tradicional.
--
-- La sala se sigue creando por trigger y en la misma transacción; lo que cambia es *cuándo*
-- se llega a ese punto.

-- Umbrales en un solo lugar. Si se tocan, se toca acá y no en cinco consultas.
create or replace function public.dias_para_reconfirmar() returns integer
  language sql immutable as $$ select 7 $$;

create or replace function public.dias_para_vencer_espera() returns integer
  language sql immutable as $$ select 30 $$;

-- Cuándo se convocó, para poder mostrar cuánto hace que se espera la confirmación. Va antes
-- del trigger que la escribe: el cuerpo plpgsql no se valida contra el esquema al crearse,
-- así que un orden al revés no falla acá sino en la primera aprobación real.
alter table postulaciones add column if not exists convocado_en timestamptz;

create or replace function public.al_cambiar_estado_postulacion()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_obra_id uuid;
  v_creador_id uuid;
  v_vacantes integer;
  v_aprobados integer;
  v_sala_id uuid;
  v_sala_existia boolean;
  v_otro_aprobado_en_obra boolean;
  v_es_vieja boolean;
begin
  select r.obra_id, o.creador_id, r.vacantes
    into v_obra_id, v_creador_id, v_vacantes
    from roles r join obras o on o.id = r.obra_id
    where r.id = new.rol_id
    for update of r;

  -- Paso intermedio: el creador aprueba algo que quedó viejo esperando. En vez de armar el
  -- equipo se le pregunta al talento. La vacante todavía NO se descuenta: hasta que confirme
  -- no ocupa lugar, porque puede rechazar.
  v_es_vieja := new.creado_en < now() - (public.dias_para_reconfirmar() || ' days')::interval;

  if new.estado = 'aprobado'
     and old.estado is distinct from 'aprobado'
     and old.estado is distinct from 'esperando_confirmacion'
     and v_es_vieja then

    -- Se controla el cupo igual que en la aprobación directa: no tiene sentido convocar a
    -- alguien para un rol que ya se llenó.
    select count(*) into v_aprobados
      from postulaciones
      where rol_id = new.rol_id and estado = 'aprobado' and id <> new.id;

    if v_aprobados >= v_vacantes then
      raise exception 'El rol ya cubrió sus % vacante(s)', v_vacantes;
    end if;

    new.estado := 'esperando_confirmacion';
    new.convocado_en := now();

    insert into notificaciones (destinatario_id, tipo, obra_id, rol_id)
      values (new.talento_id, 'convocado', v_obra_id, new.rol_id);

    new.actualizado_en := now();
    return new;
  end if;

  -- Aprobación efectiva: directa si la postulación era reciente, o después de que el talento
  -- confirmó. A partir de acá, todo igual que antes.
  if new.estado = 'aprobado' and old.estado is distinct from 'aprobado' then
    select count(*) into v_aprobados
      from postulaciones
      where rol_id = new.rol_id and estado = 'aprobado' and id <> new.id;

    if v_aprobados >= v_vacantes then
      raise exception 'El rol ya cubrió sus % vacante(s)', v_vacantes;
    end if;

    select id into v_sala_id from salas where obra_id = v_obra_id;
    v_sala_existia := v_sala_id is not null;

    if v_sala_id is null then
      insert into salas (obra_id) values (v_obra_id) returning id into v_sala_id;
      insert into sala_integrantes (sala_id, perfil_id) values (v_sala_id, v_creador_id)
        on conflict do nothing;
    end if;

    insert into sala_integrantes (sala_id, perfil_id) values (v_sala_id, new.talento_id)
      on conflict do nothing;

    insert into notificaciones (destinatario_id, tipo, obra_id, rol_id)
      values (new.talento_id, 'match', v_obra_id, new.rol_id);

    if not v_sala_existia then
      insert into notificaciones (destinatario_id, tipo, obra_id, sala_id)
        values (v_creador_id, 'sala_creada', v_obra_id, v_sala_id);
    end if;

    insert into notificaciones (destinatario_id, tipo, obra_id, sala_id)
      values (new.talento_id, 'sala_creada', v_obra_id, v_sala_id);

  -- Revocación: pasaba por aprobado y deja de estarlo.
  elsif old.estado = 'aprobado' and new.estado is distinct from 'aprobado' then
    select exists (
      select 1 from postulaciones p2
      join roles r2 on r2.id = p2.rol_id
      where r2.obra_id = v_obra_id and p2.talento_id = new.talento_id
        and p2.estado = 'aprobado' and p2.id <> new.id
    ) into v_otro_aprobado_en_obra;

    if not v_otro_aprobado_en_obra then
      select id into v_sala_id from salas where obra_id = v_obra_id;
      if v_sala_id is not null then
        delete from sala_integrantes
          where sala_id = v_sala_id and perfil_id = new.talento_id;
      end if;
    end if;
  end if;

  new.actualizado_en := now();
  return new;
end;
$$;

-- El talento responde a su propia convocatoria. Es la única transición que puede hacer
-- sobre una postulación: no puede autoaprobarse una que nadie eligió, porque la política
-- exige que el estado anterior sea `esperando_confirmacion`.
drop policy if exists "postulaciones_update_talento_confirma" on postulaciones;
create policy "postulaciones_update_talento_confirma" on postulaciones
  for update
  using (talento_id = auth.uid() and estado = 'esperando_confirmacion')
  with check (talento_id = auth.uid() and estado in ('aprobado', 'rechazado'));

-- Cierre por tiempo. Devuelve cuántas cerró, para poder verificarlo desde una consulta.
create or replace function public.vencer_esperas()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cerradas integer;
begin
  with vencidas as (
    update postulaciones p
      set estado = 'vencida', actualizado_en = now()
      where p.estado in ('pendiente', 'en_duda')
        and p.creado_en < now() - (public.dias_para_vencer_espera() || ' days')::interval
      returning p.id, p.talento_id, p.rol_id
  ),
  avisos as (
    insert into notificaciones (destinatario_id, tipo, obra_id, rol_id)
    select v.talento_id, 'espera_vencida', r.obra_id, v.rol_id
    from vencidas v join roles r on r.id = v.rol_id
    returning 1
  )
  select count(*)::int into v_cerradas from vencidas;

  return v_cerradas;
end;
$$;

revoke all on function public.vencer_esperas() from public, anon, authenticated;

-- Una vez por día. Es un cierre por tiempo: no necesita precisión de minutos, y correrlo
-- seguido solo gasta.
create extension if not exists pg_cron;

do $$ begin
  perform cron.unschedule('vencer-esperas');
exception when others then null;
end $$;

select cron.schedule('vencer-esperas', '17 4 * * *', 'select public.vencer_esperas()');
