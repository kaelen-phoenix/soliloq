-- Armar proyecto vs. armar equipo (issue #57, fase 1).
--
-- El perfil de Creador va a poder elegir entre dos formas de iniciativa:
--   - Proyecto: una obra con roles (lo que ya existe: `obras` + `roles`).
--   - Equipo:   juntar gente alrededor de una idea, por cupo, sin roles.
--
-- Esta migración es la **fase 1**: solo la tabla `equipos` y sus políticas, más un par de
-- guardas. NO toca el feed del talento (`feed_para_talento`), el match ni `obras` — eso es
-- la fase 2 (ver openspec/changes/proyecto-o-equipo-creador). Todo acá es aditivo.

-- --------------------------------------------------------------------------------------
-- equipos
-- --------------------------------------------------------------------------------------
create table if not exists equipos (
  id uuid primary key default gen_random_uuid(),
  creador_id uuid not null references perfiles (id) on delete cascade,
  -- El motivo de la búsqueda, en una línea ("Escribamos juntos").
  titulo text not null check (char_length(titulo) between 1 and 80),
  -- Cuántas personas quiere sumar. Tope de 6 (decisión de producto, issue #57).
  cupo int not null check (cupo between 1 and 6),
  activo boolean not null default true,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);

-- Un Creador tiene a lo sumo **un** equipo activo a la vez. La exclusión con "tener una
-- obra publicada" se maneja en la aplicación en la fase 1; el trigger de base que la
-- garantiza va en la fase 2, junto con el feed.
create unique index if not exists idx_equipos_uno_activo
  on equipos (creador_id) where activo;

create index if not exists idx_equipos_activos on equipos (activo, creado_en desc);

alter table equipos enable row level security;

-- Lectura: cualquiera con sesión ve los equipos activos (lo usará el feed de la fase 2);
-- el dueño ve además los suyos inactivos.
drop policy if exists "equipos_lectura" on equipos;
create policy "equipos_lectura" on equipos
  for select to authenticated
  using (activo or creador_id = auth.uid());

-- Escritura: solo el dueño, y solo sobre su propio perfil.
drop policy if exists "equipos_alta" on equipos;
create policy "equipos_alta" on equipos
  for insert to authenticated
  with check (creador_id = auth.uid());

drop policy if exists "equipos_edicion" on equipos;
create policy "equipos_edicion" on equipos
  for update to authenticated
  using (creador_id = auth.uid())
  with check (creador_id = auth.uid());

drop policy if exists "equipos_baja" on equipos;
create policy "equipos_baja" on equipos
  for delete to authenticated
  using (creador_id = auth.uid());

-- --------------------------------------------------------------------------------------
-- Interés hacia un equipo (por cupo), además del interés hacia una persona de 0033.
-- Nullable: un interés sin `equipo_id` sigue siendo el del feed de armar equipo.
-- --------------------------------------------------------------------------------------
alter table intereses_equipo
  add column if not exists equipo_id uuid references equipos (id) on delete cascade;

-- --------------------------------------------------------------------------------------
-- Tope de 10 roles por obra (issue #57). El máximo actual es 4, así que no rompe nada.
-- --------------------------------------------------------------------------------------
create or replace function public.chequear_tope_roles()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if (select count(*) from roles where obra_id = new.obra_id) > 10 then
    raise exception 'Una obra puede tener hasta 10 roles';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_tope_roles on roles;
create trigger trg_tope_roles
  after insert on roles
  for each row execute function public.chequear_tope_roles();
