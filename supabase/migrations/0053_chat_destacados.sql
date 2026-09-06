-- Gestión de chats desde la lista (issue #108): destacar (pin personal) y desvincularse.

-- ------------------------------------------------------------------------------------------
-- Destacar un chat: pin por usuario, sin límite. El orden lo da `creado_en` — el último
-- destacado va primero.
-- ------------------------------------------------------------------------------------------
create table chats_destacados (
  perfil_id uuid not null references perfiles (id) on delete cascade,
  sala_id uuid not null references salas (id) on delete cascade,
  creado_en timestamptz not null default now(),
  primary key (perfil_id, sala_id)
);

create index idx_chats_destacados_perfil on chats_destacados (perfil_id, creado_en desc);

alter table chats_destacados enable row level security;

create policy "chats_destacados_propio_select" on chats_destacados
  for select using (perfil_id = auth.uid());

create policy "chats_destacados_propio_insert" on chats_destacados
  for insert with check (perfil_id = auth.uid());

create policy "chats_destacados_propio_delete" on chats_destacados
  for delete using (perfil_id = auth.uid());

-- ------------------------------------------------------------------------------------------
-- Desvincularse: salir de `sala_integrantes`. Solo un integrante que NO sea el dueño del
-- proyecto/equipo (el dueño no puede irse de su propia sala). `sala_integrantes` no tiene
-- policy de delete a propósito (las altas van por triggers/RPC), así que la baja también
-- pasa por acá.
-- ------------------------------------------------------------------------------------------
create or replace function public.desvincularme_de_sala(p_sala_id uuid)
returns void
language plpgsql
security definer
set search_path = public
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
end;
$$;

revoke all on function public.desvincularme_de_sala(uuid) from public, anon;
grant execute on function public.desvincularme_de_sala(uuid) to authenticated;
