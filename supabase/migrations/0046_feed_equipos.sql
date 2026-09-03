-- #57 Fase 2 — capa de base. El feed del talento va a mostrar también equipos y el creador
-- va a aceptar interesados hasta llenar el cupo. Esto agrega tablas, triggers y RPCs; la
-- UI (feed unión, badge, "aceptar") va en unidades aparte.
--
-- Todo es aditivo salvo un `if` de salida temprana en `al_marcar_interes` (0033), que no
-- cambia el comportamiento actual: los interesados en un equipo llevan `equipo_id` (columna
-- de 0044) y hoy nadie la setea.

-- ------------------------------------------------------------------------------------------
-- 1. Exclusión mutua: obra publicada  <->  equipo activo (decisión 4 de #57).
--    Solo el cruce obra/equipo. No toca obra-vs-obra: ya hay creadores con varias
--    publicadas y eso no se rompe.
-- ------------------------------------------------------------------------------------------
create or replace function public.chequear_iniciativa_unica_equipo()
returns trigger language plpgsql set search_path = public as $$
begin
  if new.activo and exists (
    select 1 from obras where creador_id = new.creador_id and estado = 'publicada'
  ) then
    raise exception 'No podés activar un equipo mientras tengas una obra publicada. Cerrá la obra primero.';
  end if;
  return new;
end;
$$;
drop trigger if exists trg_iniciativa_unica_equipo on equipos;
create trigger trg_iniciativa_unica_equipo
  before insert or update of activo on equipos
  for each row execute function public.chequear_iniciativa_unica_equipo();

create or replace function public.chequear_iniciativa_unica_obra()
returns trigger language plpgsql set search_path = public as $$
begin
  if new.estado = 'publicada'
     and (tg_op = 'INSERT' or old.estado is distinct from 'publicada')
     and exists (select 1 from equipos where creador_id = new.creador_id and activo) then
    raise exception 'No podés publicar una obra mientras tengas un equipo activo. Cerrá el equipo primero.';
  end if;
  return new;
end;
$$;
drop trigger if exists trg_iniciativa_unica_obra on obras;
create trigger trg_iniciativa_unica_obra
  before insert or update of estado on obras
  for each row execute function public.chequear_iniciativa_unica_obra();

-- ------------------------------------------------------------------------------------------
-- 2. El talento descarta un equipo del feed (espejo de `descartes`).
-- ------------------------------------------------------------------------------------------
create table if not exists descartes_equipo (
  talento_id uuid not null references perfiles (id) on delete cascade,
  equipo_id uuid not null references equipos (id) on delete cascade,
  creado_en timestamptz not null default now(),
  primary key (talento_id, equipo_id)
);
alter table descartes_equipo enable row level security;
drop policy if exists "descartes_equipo_propio" on descartes_equipo;
create policy "descartes_equipo_propio" on descartes_equipo
  for all to authenticated
  using (talento_id = auth.uid())
  with check (talento_id = auth.uid());

-- ------------------------------------------------------------------------------------------
-- 3. La sala de un equipo. Una sola por equipo, con todos los aceptados adentro (a
--    diferencia de las salas 1:1 de 0033).
-- ------------------------------------------------------------------------------------------
alter table salas add column if not exists equipo_id uuid references equipos (id) on delete set null;
create unique index if not exists idx_salas_equipo on salas (equipo_id) where equipo_id is not null;

-- El trigger de match 1:1 de 0033 no aplica al circuito de equipo: ahí la sala la abre
-- `aceptar_en_equipo` explícitamente. Un interés con `equipo_id` sale temprano.
create or replace function public.al_marcar_interes()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_reciproco boolean;
  v_sala_id uuid;
begin
  if not new.interesa or new.equipo_id is not null then
    return new;
  end if;

  select exists (
    select 1 from intereses_equipo
    where de_perfil = new.a_perfil and a_perfil = new.de_perfil and interesa
  ) into v_reciproco;

  if not v_reciproco then
    return new;
  end if;

  select s.id into v_sala_id
  from salas s
  join sala_integrantes i1 on i1.sala_id = s.id and i1.perfil_id = new.de_perfil
  join sala_integrantes i2 on i2.sala_id = s.id and i2.perfil_id = new.a_perfil
  where s.obra_id is null and s.equipo_id is null
  limit 1;

  if v_sala_id is not null then
    return new;
  end if;

  insert into salas (obra_id, titulo)
    values (null, public.nombre_de_perfil(new.de_perfil) || ' y ' || public.nombre_de_perfil(new.a_perfil))
    returning id into v_sala_id;

  insert into sala_integrantes (sala_id, perfil_id)
    values (v_sala_id, new.de_perfil), (v_sala_id, new.a_perfil)
    on conflict do nothing;

  insert into notificaciones (destinatario_id, tipo, sala_id)
    values (new.de_perfil, 'equipo_armado', v_sala_id),
           (new.a_perfil, 'equipo_armado', v_sala_id);

  return new;
end;
$$;

-- ------------------------------------------------------------------------------------------
-- 4. El feed de equipos para un talento. `security invoker`: se apoya en las políticas
--    (equipos activos son legibles; `intereses_equipo` / `descartes_equipo` filtran por
--    `auth.uid()`). Solo equipos activos con al menos 3 fotos.
-- ------------------------------------------------------------------------------------------
create or replace function public.feed_equipos_para_talento()
returns table (
  equipo_id uuid,
  titulo text,
  cupo int,
  creado_en timestamptz,
  creador_id uuid,
  creador_nombre text,
  creador_imagen_url text,
  fotos text[]
)
language sql
stable
set search_path = public
as $$
  select
    e.id, e.titulo, e.cupo, e.creado_en,
    c.id, c.nombre, c.imagen_url,
    coalesce(
      (select array_agg(f.storage_path order by f.orden) from fotos_equipo f where f.equipo_id = e.id),
      '{}'::text[]
    )
  from equipos e
  join perfiles_creador c on c.id = e.creador_id
  where e.activo
    and e.creador_id <> auth.uid()
    and (select count(*) from fotos_equipo f where f.equipo_id = e.id) >= 3
    and not public.hay_bloqueo(e.creador_id)
    and not exists (
      select 1 from intereses_equipo i
      where i.de_perfil = auth.uid() and i.equipo_id = e.id and i.interesa
    )
    and not exists (
      select 1 from descartes_equipo d
      where d.talento_id = auth.uid() and d.equipo_id = e.id
    )
  order by e.creado_en desc;
$$;
revoke all on function public.feed_equipos_para_talento() from public;
grant execute on function public.feed_equipos_para_talento() to authenticated;

-- ------------------------------------------------------------------------------------------
-- 5. El talento expresa interés (o descarta) un equipo desde el feed.
-- ------------------------------------------------------------------------------------------
create or replace function public.interes_en_equipo(p_equipo_id uuid, p_interesa boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_creador uuid;
begin
  select creador_id into v_creador from equipos where id = p_equipo_id and activo;
  if v_creador is null then raise exception 'equipo no disponible'; end if;
  if v_creador = auth.uid() then raise exception 'es tu propio equipo'; end if;
  if public.hay_bloqueo(v_creador) then raise exception 'no disponible'; end if;

  if p_interesa then
    insert into intereses_equipo (de_perfil, a_perfil, interesa, equipo_id)
      values (auth.uid(), v_creador, true, p_equipo_id)
      on conflict (de_perfil, a_perfil) do update set interesa = true, equipo_id = p_equipo_id;
    -- El creador se entera de que hay un interesado; el match real es cuando él acepta.
    insert into notificaciones (destinatario_id, tipo, de_perfil)
      values (v_creador, 'interes_recibido', auth.uid());
  else
    insert into descartes_equipo (talento_id, equipo_id)
      values (auth.uid(), p_equipo_id)
      on conflict do nothing;
  end if;
end;
$$;
revoke all on function public.interes_en_equipo(uuid, boolean) from public;
grant execute on function public.interes_en_equipo(uuid, boolean) to authenticated;

-- ------------------------------------------------------------------------------------------
-- 6. El creador acepta a un interesado, hasta llenar el cupo. Abre (o reusa) la sala del
--    equipo y suma a la persona.
-- ------------------------------------------------------------------------------------------
create or replace function public.aceptar_en_equipo(p_equipo_id uuid, p_talento_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cupo int;
  v_titulo text;
  v_aceptados int;
  v_sala_id uuid;
begin
  select cupo, titulo into v_cupo, v_titulo
  from equipos where id = p_equipo_id and creador_id = auth.uid() and activo;
  if v_cupo is null then raise exception 'equipo no encontrado'; end if;

  if not exists (
    select 1 from intereses_equipo
    where de_perfil = p_talento_id and a_perfil = auth.uid()
      and equipo_id = p_equipo_id and interesa
  ) then
    raise exception 'esa persona no mostró interés en este equipo';
  end if;

  select count(*) into v_aceptados from intereses_equipo
    where de_perfil = auth.uid() and equipo_id = p_equipo_id and interesa;
  if v_aceptados >= v_cupo then
    raise exception 'ya llenaste el cupo del equipo';
  end if;

  -- El interés del creador hacia la persona (marca "aceptada"). El `equipo_id` hace que
  -- `al_marcar_interes` no intente abrir una sala 1:1.
  insert into intereses_equipo (de_perfil, a_perfil, interesa, equipo_id)
    values (auth.uid(), p_talento_id, true, p_equipo_id)
    on conflict (de_perfil, a_perfil) do update set interesa = true, equipo_id = p_equipo_id;

  -- Sala del equipo: una sola, con el creador y todos los aceptados.
  select id into v_sala_id from salas where equipo_id = p_equipo_id;
  if v_sala_id is null then
    insert into salas (obra_id, equipo_id, titulo) values (null, p_equipo_id, v_titulo)
      returning id into v_sala_id;
    insert into sala_integrantes (sala_id, perfil_id) values (v_sala_id, auth.uid())
      on conflict do nothing;
  end if;

  insert into sala_integrantes (sala_id, perfil_id) values (v_sala_id, p_talento_id)
    on conflict do nothing;

  insert into notificaciones (destinatario_id, tipo, sala_id)
    values (p_talento_id, 'equipo_armado', v_sala_id);
end;
$$;
revoke all on function public.aceptar_en_equipo(uuid, uuid) from public;
grant execute on function public.aceptar_en_equipo(uuid, uuid) to authenticated;
