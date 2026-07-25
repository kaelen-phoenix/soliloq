-- Trigger central del bucle de match: corre dentro de la misma transacción que el
-- update de postulaciones, así una aprobación, la sala y las notificaciones se
-- confirman juntas o no se confirma nada (ver design.md, "La sala de proyecto se
-- crea por trigger").
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
begin
  select r.obra_id, o.creador_id, r.vacantes
    into v_obra_id, v_creador_id, v_vacantes
    from roles r join obras o on o.id = r.obra_id
    where r.id = new.rol_id
    for update of r;

  -- Aprobación nueva (incluye reaprobación tras una revocación previa).
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

create trigger antes_de_actualizar_postulacion
  before update on postulaciones
  for each row execute procedure public.al_cambiar_estado_postulacion();
