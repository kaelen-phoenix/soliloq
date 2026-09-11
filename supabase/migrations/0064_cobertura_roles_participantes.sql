-- 0064 — Cobertura de roles y participantes del Proyecto/Equipo (issue #152).
--
-- El Match es por Proyecto (obra), no por rol puntual: hasta ahora no había forma de saber
-- "quién ocupa cuál rol". Se agrega `convocatorias.rol_id`, que el Creador elige recién al
-- convocar en firme (issue #143), y una RPC de sólo lectura para pintar la cobertura.
--
-- Además: al dar de baja o al desvincularse, se libera el interés (`intereses_match`) entre
-- las dos personas para que el Talento vuelva a aparecer en Buscar Talento — hoy quedaba
-- excluido para siempre porque `buscar_talento` sólo mira si existe esa fila, no si sigue
-- vigente la convocatoria.

alter table convocatorias add column if not exists rol_id uuid references roles(id) on delete set null;

-- ── convocar(): ahora elige el rol (si el Proyecto tiene) al convocar en firme ──
create or replace function public.convocar(p_match_id uuid, p_rol_id uuid default null)
returns void
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  m matches%rowtype;
  v_rol_obra uuid;
  v_vacantes int;
  v_ocupados int;
begin
  select * into m from matches where id = p_match_id and creador_id = auth.uid();
  if m.id is null then raise exception 'match no encontrado'; end if;
  if m.aceptado_en is null then raise exception 'primero aceptá el match'; end if;
  if m.descartado_en is not null then raise exception 'match descartado'; end if;

  if exists (select 1 from convocatorias c
             where c.match_id = p_match_id and c.estado in ('pendiente', 'aceptada')) then
    raise exception 'ya está convocado';
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
$$;

-- ── dar_de_baja_convocado(): libera el interés además del lugar ─────────────────
create or replace function public.dar_de_baja_convocado(p_convocatoria_id uuid)
returns void
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  m matches%rowtype;
  v_sala_id uuid;
begin
  select mm.* into m
  from convocatorias c join matches mm on mm.id = c.match_id
  where c.id = p_convocatoria_id and mm.creador_id = auth.uid() and c.estado = 'aceptada';
  if m.id is null then raise exception 'convocatoria no encontrada'; end if;

  update convocatorias set estado = 'baja', respondido_en = now()
  where id = p_convocatoria_id;

  select id into v_sala_id from salas
  where coalesce(obra_id, equipo_id) = coalesce(m.obra_id, m.equipo_id);
  if v_sala_id is not null then
    delete from sala_integrantes where sala_id = v_sala_id and perfil_id = m.talento_id;
    delete from chats_destacados where sala_id = v_sala_id and perfil_id = m.talento_id;
  end if;

  -- Libera a la persona para que vuelva a aparecer en Buscar Talento (#152).
  delete from intereses_match
  where (de_perfil = m.creador_id and a_perfil = m.talento_id)
     or (de_perfil = m.talento_id and a_perfil = m.creador_id);
end;
$$;

-- ── desvincularme_de_sala(): cierra la convocatoria y libera el interés también ──
create or replace function public.desvincularme_de_sala(p_sala_id uuid)
returns void
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_duenio uuid;
begin
  if not exists (
    select 1 from sala_integrantes
    where sala_id = p_sala_id and perfil_id = auth.uid()
  ) then
    raise exception 'no sos integrante de esta sala';
  end if;

  select coalesce(o.creador_id, e.creador_id) into v_duenio
  from salas s
  left join obras o on o.id = s.obra_id
  left join equipos e on e.id = s.equipo_id
  where s.id = p_sala_id;

  if v_duenio is not null and v_duenio = auth.uid() then
    raise exception 'el dueño no puede desvincularse de su propia sala';
  end if;

  delete from sala_integrantes where sala_id = p_sala_id and perfil_id = auth.uid();
  delete from chats_destacados where sala_id = p_sala_id and perfil_id = auth.uid();

  -- El lugar y el rol quedan libres (#152): cierra la convocatoria aceptada de esta sala...
  if v_duenio is not null then
    update convocatorias c set estado = 'baja', respondido_en = now()
    where c.estado = 'aceptada'
      and c.match_id in (
        select m.id from matches m
        where m.creador_id = v_duenio and m.talento_id = auth.uid()
      );

    -- ...y libera el interés para que reaparezca en Buscar Talento.
    delete from intereses_match
    where (de_perfil = v_duenio and a_perfil = auth.uid())
       or (de_perfil = auth.uid() and a_perfil = v_duenio);
  end if;
end;
$$;

-- ── Cobertura de roles/participantes: quién ocupa qué, sin exponer las tablas base ──
create or replace function public.cobertura_iniciativa(p_obra_id uuid, p_equipo_id uuid)
returns table(
  rol_id uuid, rol_nombre text, vacantes integer,
  convocatoria_id uuid, talento_id uuid, talento_nombre text, talento_foto text
)
language plpgsql
stable
security definer
set search_path to 'public'
as $$
begin
  if p_obra_id is not null and not public.es_dueno_de_obra(p_obra_id) then
    raise exception 'no autorizado';
  end if;
  if p_equipo_id is not null and not exists (
    select 1 from equipos where id = p_equipo_id and creador_id = auth.uid()
  ) then
    raise exception 'no autorizado';
  end if;

  return query
  with ocupantes as (
    select m.equipo_id, m.obra_id, m.talento_id, c.id as convocatoria_id, c.rol_id
    from matches m
    join convocatorias c on c.match_id = m.id and c.estado = 'aceptada'
  )
  select
    null::uuid, null::text, e.cupo,
    o.convocatoria_id, o.talento_id, t.nombre,
    (select f.storage_path from fotos_talento f where f.talento_id = o.talento_id order by f.orden limit 1)
  from equipos e
  left join ocupantes o on o.equipo_id = e.id
  left join perfiles_talento t on t.id = o.talento_id
  where e.id = p_equipo_id

  union all

  select
    r.id, r.nombre, r.vacantes,
    o.convocatoria_id, o.talento_id, t.nombre,
    (select f.storage_path from fotos_talento f where f.talento_id = o.talento_id order by f.orden limit 1)
  from roles r
  left join ocupantes o on o.rol_id = r.id
  left join perfiles_talento t on t.id = o.talento_id
  where r.obra_id = p_obra_id
  order by 1;
end;
$$;

revoke all on function public.cobertura_iniciativa(uuid, uuid) from public, anon;
grant execute on function public.cobertura_iniciativa(uuid, uuid) to authenticated;
