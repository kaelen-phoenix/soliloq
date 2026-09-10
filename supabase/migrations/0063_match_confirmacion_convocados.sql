-- 0063 — Match: confirmación del Creador + instancia Convocados + confirmación del Talento (#143).
--
-- Refina #131 (0059). El circuito pasa a tener tres decisiones:
--   1. Interés mutuo → `matches` (aceptado_en = null). Aparece en /matches del Creador.
--   2. Creador acepta el Match → `matches.aceptado_en = now()`. Pasa a Convocados. Sin
--      notificación al Talento. Ocupa cupo desde acá. Ventana de 7 días.
--   3. Creador convoca (definitivo) desde Convocados → `convocatorias(estado='pendiente')`
--      + notificación al Talento.
--   4. Talento acepta desde la pantalla de convocatoria → `estado='aceptada'` + entra a la
--      sala.
--   5. Creador descarta desde Convocados, o pasan 7 días → `matches.descartado_en`.

alter table matches add column if not exists aceptado_en timestamptz;
alter table matches add column if not exists descartado_en timestamptz;

-- ── El Creador acepta el Match → Convocados (sin notif, sin sala) ────────────────
create or replace function public.aceptar_match(p_match_id uuid)
returns void
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  m matches%rowtype;
begin
  select * into m from matches where id = p_match_id and creador_id = auth.uid();
  if m.id is null then raise exception 'match no encontrado'; end if;
  if m.descartado_en is not null then raise exception 'match descartado'; end if;
  if m.expira_en <= now() then raise exception 'el match venció'; end if;
  if m.aceptado_en is not null then return; end if;  -- idempotente

  if public.iniciativa_en_cierre(m.obra_id, m.equipo_id) then
    raise exception 'cupo_lleno';
  end if;

  update matches set aceptado_en = now() where id = p_match_id;
end;
$$;

-- ── El Creador convoca (definitivo) desde Convocados ────────────────────────────
create or replace function public.convocar(p_match_id uuid)
returns void
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  m matches%rowtype;
begin
  select * into m from matches where id = p_match_id and creador_id = auth.uid();
  if m.id is null then raise exception 'match no encontrado'; end if;
  if m.aceptado_en is null then raise exception 'primero aceptá el match'; end if;
  if m.descartado_en is not null then raise exception 'match descartado'; end if;

  if exists (select 1 from convocatorias c
             where c.match_id = p_match_id and c.estado in ('pendiente', 'aceptada')) then
    raise exception 'ya está convocado';
  end if;

  insert into convocatorias (match_id, estado) values (p_match_id, 'pendiente');

  insert into notificaciones (destinatario_id, tipo, obra_id)
    values (m.talento_id, 'convocado', m.obra_id);
end;
$$;

-- ── El Talento acepta/rechaza la convocatoria (re-agregada: la sacó 0059) ────────
create or replace function public.responder_convocatoria(p_convocatoria_id uuid, p_aceptar boolean)
returns void
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  m matches%rowtype;
  v_sala_id uuid;
  v_titulo text;
begin
  select mm.* into m
  from convocatorias c join matches mm on mm.id = c.match_id
  where c.id = p_convocatoria_id and mm.talento_id = auth.uid() and c.estado = 'pendiente';
  if m.id is null then raise exception 'convocatoria no encontrada'; end if;

  if not p_aceptar then
    update convocatorias set estado = 'rechazada', respondido_en = now()
    where id = p_convocatoria_id;
    return;
  end if;

  select coalesce(o.titulo, e.titulo) into v_titulo
  from matches x
  left join obras o on o.id = x.obra_id
  left join equipos e on e.id = x.equipo_id
  where x.id = m.id;

  select id into v_sala_id from salas
  where coalesce(obra_id, equipo_id) = coalesce(m.obra_id, m.equipo_id);
  if v_sala_id is null then
    insert into salas (obra_id, equipo_id, titulo) values (m.obra_id, m.equipo_id, v_titulo)
      returning id into v_sala_id;
    insert into sala_integrantes (sala_id, perfil_id) values (v_sala_id, m.creador_id)
      on conflict do nothing;
  end if;
  insert into sala_integrantes (sala_id, perfil_id) values (v_sala_id, auth.uid())
    on conflict do nothing;

  update convocatorias set estado = 'aceptada', respondido_en = now()
  where id = p_convocatoria_id;
end;
$$;

-- ── El Creador descarta a alguien de Convocados (antes de que acepte) ────────────
create or replace function public.descartar_convocado(p_match_id uuid)
returns void
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  m matches%rowtype;
begin
  select * into m from matches where id = p_match_id and creador_id = auth.uid();
  if m.id is null then raise exception 'match no encontrado'; end if;
  if exists (select 1 from convocatorias c where c.match_id = p_match_id and c.estado = 'aceptada') then
    raise exception 'ya aceptó, usá dar de baja';
  end if;

  update matches set descartado_en = now() where id = p_match_id;
  update convocatorias set estado = 'rechazada', respondido_en = now()
  where match_id = p_match_id and estado = 'pendiente';
end;
$$;

-- ── Cupo: cuentan los matches aceptados (en Convocados) además de las convocatorias ─
create or replace function public.aceptados_iniciativa(p_obra_id uuid, p_equipo_id uuid)
returns integer
language sql
stable
security definer
set search_path to 'public'
as $$
  select count(*)::int
  from matches m
  where coalesce(m.obra_id, m.equipo_id) = coalesce(p_obra_id, p_equipo_id)
    and m.aceptado_en is not null
    and m.descartado_en is null
    and not exists (
      select 1 from convocatorias c
      where c.match_id = m.id and c.estado in ('rechazada', 'baja')
    );
$$;

-- ── /matches del Creador: sólo los matches nuevos (sin decidir) ─────────────────
drop function if exists public.mis_matches();
create function public.mis_matches()
returns table(
  match_id uuid, talento_id uuid, nombre text, foto_path text, expira_en timestamptz,
  es_equipo boolean, iniciativa_titulo text, iniciativa_foto text, cupo_lleno boolean
)
language sql
stable
security definer
set search_path to 'public'
as $$
  select
    m.id,
    m.talento_id,
    t.nombre,
    (select f.storage_path from fotos_talento f
     where f.talento_id = m.talento_id order by f.orden limit 1),
    m.expira_en,
    m.equipo_id is not null,
    coalesce(o.titulo, e.titulo),
    coalesce(
      (select fo.storage_path from fotos_obra fo where fo.obra_id = m.obra_id order by fo.orden limit 1),
      (select fe.storage_path from fotos_equipo fe where fe.equipo_id = m.equipo_id order by fe.orden limit 1),
      pc.imagen_url
    ),
    public.iniciativa_en_cierre(m.obra_id, m.equipo_id)
  from matches m
  join perfiles_talento t on t.id = m.talento_id
  join perfiles_creador pc on pc.id = m.creador_id
  left join obras o on o.id = m.obra_id
  left join equipos e on e.id = m.equipo_id
  where m.creador_id = auth.uid()
    and m.expira_en > now()
    and m.aceptado_en is null
    and m.descartado_en is null
  order by m.creado_en desc;
$$;

-- ── Convocados del Creador: en_convocados / esperando_confirmacion / en_sala ─────
drop function if exists public.mis_convocados();
create function public.mis_convocados()
returns table(
  match_id uuid, convocatoria_id uuid, talento_id uuid, nombre text, foto_path text,
  es_equipo boolean, iniciativa_titulo text, iniciativa_foto text, estado text
)
language sql
stable
security definer
set search_path to 'public'
as $$
  select
    m.id,
    (select c.id from convocatorias c
     where c.match_id = m.id and c.estado in ('pendiente', 'aceptada')
     order by c.creado_en desc limit 1),
    m.talento_id,
    t.nombre,
    (select f.storage_path from fotos_talento f
     where f.talento_id = m.talento_id order by f.orden limit 1),
    m.equipo_id is not null,
    coalesce(o.titulo, e.titulo),
    coalesce(
      (select fo.storage_path from fotos_obra fo where fo.obra_id = m.obra_id order by fo.orden limit 1),
      (select fe.storage_path from fotos_equipo fe where fe.equipo_id = m.equipo_id order by fe.orden limit 1),
      pc.imagen_url
    ),
    case
      when exists (select 1 from convocatorias c where c.match_id = m.id and c.estado = 'aceptada')
        then 'en_sala'
      when exists (select 1 from convocatorias c where c.match_id = m.id and c.estado = 'pendiente')
        then 'esperando_confirmacion'
      else 'en_convocados'
    end
  from matches m
  join perfiles_talento t on t.id = m.talento_id
  join perfiles_creador pc on pc.id = m.creador_id
  left join obras o on o.id = m.obra_id
  left join equipos e on e.id = m.equipo_id
  where m.creador_id = auth.uid()
    and m.aceptado_en is not null
    and m.descartado_en is null
    and not exists (
      select 1 from convocatorias c
      where c.match_id = m.id and c.estado in ('rechazada', 'baja')
    )
  order by m.aceptado_en desc;
$$;

-- ── Convocatorias pendientes del Talento (re-agregada: la sacó 0059) ────────────
create or replace function public.mis_convocatorias()
returns table(
  convocatoria_id uuid, es_equipo boolean, iniciativa_titulo text, creador_nombre text,
  talento_foto text, iniciativa_foto text, creado_en timestamptz
)
language sql
stable
security definer
set search_path to 'public'
as $$
  select
    c.id,
    m.equipo_id is not null,
    coalesce(o.titulo, e.titulo),
    coalesce(pc_o.nombre, pc_e.nombre),
    (select f.storage_path from fotos_talento f
     where f.talento_id = m.talento_id order by f.orden limit 1),
    coalesce(
      (select fo.storage_path from fotos_obra fo where fo.obra_id = m.obra_id order by fo.orden limit 1),
      pc_o.imagen_url, pc_e.imagen_url
    ),
    c.creado_en
  from convocatorias c
  join matches m on m.id = c.match_id
  left join obras o on o.id = m.obra_id
  left join equipos e on e.id = m.equipo_id
  left join perfiles_creador pc_o on pc_o.id = o.creador_id
  left join perfiles_creador pc_e on pc_e.id = e.creador_id
  where m.talento_id = auth.uid()
    and c.estado = 'pendiente'
  order by c.creado_en desc;
$$;

-- ── El trigger no borra el match si el Creador ya lo aceptó ─────────────────────
create or replace function public.al_marcar_interes_match()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_creador uuid;
  v_talento uuid;
  v_mutuo boolean;
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
      on conflict do nothing;
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
$$;

-- Permisos de las RPC nuevas / recreadas.
revoke all on function public.aceptar_match(uuid) from public, anon;
revoke all on function public.descartar_convocado(uuid) from public, anon;
revoke all on function public.responder_convocatoria(uuid, boolean) from public, anon;
revoke all on function public.mis_convocatorias() from public, anon;
grant execute on function public.aceptar_match(uuid) to authenticated;
grant execute on function public.descartar_convocado(uuid) to authenticated;
grant execute on function public.responder_convocatoria(uuid, boolean) to authenticated;
grant execute on function public.mis_convocatorias() to authenticated;
