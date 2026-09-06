-- Circuito de Match y Convocatoria (issues #105, #106, #107). Capa de datos + RPCs; la UI
-- (secciones "Matches" y "Convocado", swipe de talentos, cambio de nav) va aparte.
--
-- Modelo:
--   intereses_match  el "Me interesa" dirigido a una iniciativa concreta (obra o equipo).
--                    Lo usan las dos puntas: el Creador marca (de=creador, a=talento) y el
--                    Talento marca (de=talento, a=creador).
--   matches          se materializa por trigger cuando el interés es mutuo y `true`. Vence
--                    a los 7 días de creado.
--   convocatorias    el Creador "convoca" a un talento matcheado; el Talento acepta o
--                    rechaza. Al aceptar entra a la sala del proyecto/equipo.
--
-- "Cierre" es derivado: una iniciativa está en cierre cuando sus convocatorias aceptadas
-- llegan al cupo. No hay flag; se calcula.
--
-- Las tablas nuevas quedan con RLS activa y sin políticas: todo pasa por las RPC
-- `security definer` de abajo (mismo patrón que 0033/0046).

-- ==========================================================================================
-- 1. Tablas
-- ==========================================================================================
create table intereses_match (
  id uuid primary key default gen_random_uuid(),
  de_perfil uuid not null references perfiles (id) on delete cascade,
  a_perfil uuid not null references perfiles (id) on delete cascade,
  obra_id uuid references obras (id) on delete cascade,
  equipo_id uuid references equipos (id) on delete cascade,
  interesa boolean not null,
  creado_en timestamptz not null default now(),
  constraint interes_una_iniciativa check ((obra_id is null) <> (equipo_id is null)),
  constraint interes_no_a_si_mismo check (de_perfil <> a_perfil)
);

create unique index uq_intereses_match
  on intereses_match (de_perfil, a_perfil, coalesce(obra_id, equipo_id));
create index idx_intereses_match_reciente
  on intereses_match (de_perfil, creado_en) where interesa;

alter table intereses_match enable row level security;

create table matches (
  id uuid primary key default gen_random_uuid(),
  creador_id uuid not null references perfiles (id) on delete cascade,
  talento_id uuid not null references perfiles (id) on delete cascade,
  obra_id uuid references obras (id) on delete cascade,
  equipo_id uuid references equipos (id) on delete cascade,
  creado_en timestamptz not null default now(),
  -- 7 días desde el alta (issue #105). `now()` es estable en la transacción, así que
  -- coincide con `creado_en`. Columna plana, no generada: `timestamptz + interval` no es
  -- IMMUTABLE y una generada lo exige.
  expira_en timestamptz not null default (now() + interval '7 days'),
  constraint match_una_iniciativa check ((obra_id is null) <> (equipo_id is null))
);

create unique index uq_matches
  on matches (creador_id, talento_id, coalesce(obra_id, equipo_id));
create index idx_matches_creador on matches (creador_id, expira_en);

alter table matches enable row level security;

create type estado_convocatoria as enum ('pendiente', 'aceptada', 'rechazada', 'baja');

create table convocatorias (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references matches (id) on delete cascade,
  estado estado_convocatoria not null default 'pendiente',
  creado_en timestamptz not null default now(),
  respondido_en timestamptz
);

-- Una convocatoria "viva" por match: no se puede convocar dos veces a la vez.
create unique index uq_convocatoria_viva
  on convocatorias (match_id) where estado in ('pendiente', 'aceptada');

alter table convocatorias enable row level security;

-- ==========================================================================================
-- 2. Helpers
-- ==========================================================================================
-- Dueño (creador) de una iniciativa.
create or replace function public.duenio_iniciativa(p_obra_id uuid, p_equipo_id uuid)
returns uuid language sql stable set search_path = public as $$
  select case
    when p_obra_id is not null then (select creador_id from obras where id = p_obra_id)
    else (select creador_id from equipos where id = p_equipo_id)
  end;
$$;

-- Cuántos talentos necesita la iniciativa. Equipo: su cupo. Proyecto: la suma de vacantes
-- de los roles, con tope 10 (issue #107).
create or replace function public.cupo_iniciativa(p_obra_id uuid, p_equipo_id uuid)
returns int language sql stable set search_path = public as $$
  select case
    when p_equipo_id is not null then (select cupo from equipos where id = p_equipo_id)
    else least(coalesce((select sum(vacantes)::int from roles where obra_id = p_obra_id), 0), 10)
  end;
$$;

-- Convocatorias aceptadas de la iniciativa.
create or replace function public.aceptados_iniciativa(p_obra_id uuid, p_equipo_id uuid)
returns int language sql stable set search_path = public as $$
  select count(*)::int
  from convocatorias c
  join matches m on m.id = c.match_id
  where c.estado = 'aceptada'
    and coalesce(m.obra_id, m.equipo_id) = coalesce(p_obra_id, p_equipo_id);
$$;

-- Iniciativa "en cierre": llegó al cupo.
create or replace function public.iniciativa_en_cierre(p_obra_id uuid, p_equipo_id uuid)
returns boolean language sql stable set search_path = public as $$
  select public.aceptados_iniciativa(p_obra_id, p_equipo_id)
       >= public.cupo_iniciativa(p_obra_id, p_equipo_id);
$$;

-- ==========================================================================================
-- 3. Trigger: materializar / quitar el match cuando el interés se vuelve mutuo
-- ==========================================================================================
create or replace function public.al_marcar_interes_match()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_creador uuid;
  v_talento uuid;
  v_mutuo boolean;
begin
  v_creador := public.duenio_iniciativa(new.obra_id, new.equipo_id);
  if v_creador is null then
    return new;  -- iniciativa borrada / inválida
  end if;
  v_talento := case when new.de_perfil = v_creador then new.a_perfil else new.de_perfil end;

  -- Mutuo = las dos filas (una por sentido) existen y las dos con interesa = true.
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
    -- Se deshizo un "Me interesa": se quita el match si todavía no derivó en convocatoria.
    delete from matches m
    where m.creador_id = v_creador and m.talento_id = v_talento
      and coalesce(m.obra_id, m.equipo_id) = coalesce(new.obra_id, new.equipo_id)
      and not exists (
        select 1 from convocatorias c
        where c.match_id = m.id and c.estado in ('pendiente', 'aceptada')
      );
  end if;

  return new;
end;
$$;

create trigger trg_al_marcar_interes_match
  after insert or update of interesa on intereses_match
  for each row execute function public.al_marcar_interes_match();

-- ==========================================================================================
-- 4. RPCs
-- ==========================================================================================

-- El "Me interesa" (o su baja) hacia una iniciativa. Lo llaman las dos puntas. El Talento
-- tiene tope de 20 "Me interesa" cada 24 h (rolling); el Creador no (issue #106).
create or replace function public.marcar_interes(
  p_a_perfil uuid,
  p_obra_id uuid,
  p_equipo_id uuid,
  p_interesa boolean
)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_modo text;
  v_ya boolean;
  v_usados int;
begin
  if (p_obra_id is null) = (p_equipo_id is null) then
    raise exception 'indicá una obra o un equipo, no las dos';
  end if;

  select modo_activo::text into v_modo from perfiles where id = auth.uid();

  select interesa into v_ya from intereses_match
  where de_perfil = auth.uid() and a_perfil = p_a_perfil
    and coalesce(obra_id, equipo_id) = coalesce(p_obra_id, p_equipo_id);

  -- Rate limit solo para el talento y solo cuando esto suma un "Me interesa" nuevo.
  if p_interesa and coalesce(v_ya, false) = false and v_modo = 'talento' then
    select count(*) into v_usados from intereses_match
    where de_perfil = auth.uid() and interesa
      and creado_en > now() - interval '24 hours';
    if v_usados >= 20 then
      raise exception 'limite_me_interesa';
    end if;
  end if;

  insert into intereses_match (de_perfil, a_perfil, obra_id, equipo_id, interesa, creado_en)
    values (auth.uid(), p_a_perfil, p_obra_id, p_equipo_id, p_interesa, now())
  on conflict (de_perfil, a_perfil, coalesce(obra_id, equipo_id))
    do update set interesa = excluded.interesa,
                  creado_en = case when excluded.interesa and not intereses_match.interesa
                                   then now() else intereses_match.creado_en end;
end;
$$;

-- Los matches vigentes del Creador para su iniciativa activa.
create or replace function public.mis_matches()
returns table (
  match_id uuid,
  talento_id uuid,
  nombre text,
  foto_path text,
  expira_en timestamptz,
  convocado boolean,
  cupo_lleno boolean
)
language sql security definer stable set search_path = public as $$
  select
    m.id,
    m.talento_id,
    t.nombre,
    (select f.storage_path from fotos_talento f
     where f.talento_id = m.talento_id order by f.orden limit 1),
    m.expira_en,
    exists (select 1 from convocatorias c
            where c.match_id = m.id and c.estado in ('pendiente', 'aceptada')),
    public.iniciativa_en_cierre(m.obra_id, m.equipo_id)
  from matches m
  join perfiles_talento t on t.id = m.talento_id
  where m.creador_id = auth.uid()
    and m.expira_en > now()
  order by m.creado_en desc;
$$;

-- El Creador convoca a un talento matcheado.
create or replace function public.convocar(p_match_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  m matches%rowtype;
begin
  select * into m from matches where id = p_match_id and creador_id = auth.uid();
  if m.id is null then raise exception 'match no encontrado'; end if;
  if m.expira_en <= now() then raise exception 'el match venció'; end if;

  if public.iniciativa_en_cierre(m.obra_id, m.equipo_id) then
    raise exception 'cupo_lleno';
  end if;

  if exists (select 1 from convocatorias c
             where c.match_id = p_match_id and c.estado in ('pendiente', 'aceptada')) then
    raise exception 'ya está convocado';
  end if;

  insert into convocatorias (match_id) values (p_match_id);

  insert into notificaciones (destinatario_id, tipo, obra_id)
    values (m.talento_id, 'convocado', m.obra_id);
end;
$$;

-- Convocatorias pendientes del Talento.
create or replace function public.mis_convocatorias()
returns table (
  convocatoria_id uuid,
  titulo text,
  creador_nombre text,
  es_equipo boolean,
  creado_en timestamptz
)
language sql security definer stable set search_path = public as $$
  select
    c.id,
    coalesce(o.titulo, e.titulo),
    coalesce(pc_o.nombre, pc_e.nombre),
    m.equipo_id is not null,
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

-- El Talento acepta o rechaza. Al aceptar entra a la sala del proyecto/equipo (se crea si
-- es la primera).
create or replace function public.responder_convocatoria(p_convocatoria_id uuid, p_aceptar boolean)
returns void language plpgsql security definer set search_path = public as $$
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

  if public.iniciativa_en_cierre(m.obra_id, m.equipo_id) then
    raise exception 'cupo_lleno';
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

-- El Creador da de baja a un convocado ya aceptado: libera el lugar y lo saca de la sala.
create or replace function public.dar_de_baja_convocado(p_convocatoria_id uuid)
returns void language plpgsql security definer set search_path = public as $$
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
end;
$$;

-- ==========================================================================================
-- 5. Permisos
-- ==========================================================================================
do $$
declare fn text;
begin
  foreach fn in array array[
    'marcar_interes(uuid,uuid,uuid,boolean)',
    'mis_matches()',
    'convocar(uuid)',
    'mis_convocatorias()',
    'responder_convocatoria(uuid,boolean)',
    'dar_de_baja_convocado(uuid)',
    'cupo_iniciativa(uuid,uuid)',
    'aceptados_iniciativa(uuid,uuid)',
    'iniciativa_en_cierre(uuid,uuid)',
    'duenio_iniciativa(uuid,uuid)'
  ]
  loop
    execute format('revoke all on function public.%s from public, anon', fn);
    execute format('grant execute on function public.%s to authenticated', fn);
  end loop;
end;
$$;
