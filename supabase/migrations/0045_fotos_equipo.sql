-- Fotos del equipo (issue #57, fase 1). Espeja `fotos_talento` (0006/0007): tabla propia
-- con orden, tope por trigger, y las imágenes en el bucket `fotos-perfil` bajo la ruta
-- `<creador_uid>/equipos/<equipo_id>/...` — el primer segmento sigue siendo el uid del
-- dueño, así la política de storage de 0010 aplica sin tocarla.
--
-- El mínimo de 3 fotos para que el equipo aparezca en el feed se valida en la fase 2,
-- cuando exista el feed; acá solo se permite cargarlas.

create table if not exists fotos_equipo (
  id uuid primary key default gen_random_uuid(),
  equipo_id uuid not null references equipos (id) on delete cascade,
  storage_path text not null,
  orden smallint not null,
  creado_en timestamptz not null default now(),
  unique (equipo_id, orden)
);

create index if not exists idx_fotos_equipo on fotos_equipo (equipo_id, orden);

alter table fotos_equipo enable row level security;

-- Lectura: cualquiera con sesión ve las de un equipo activo (lo usará el feed de la fase 2);
-- el dueño ve siempre las suyas.
drop policy if exists "fotos_equipo_lectura" on fotos_equipo;
create policy "fotos_equipo_lectura" on fotos_equipo
  for select to authenticated
  using (
    exists (
      select 1 from equipos e
      where e.id = fotos_equipo.equipo_id
        and (e.activo or e.creador_id = auth.uid())
    )
  );

-- Alta / edición / baja: solo el dueño del equipo.
drop policy if exists "fotos_equipo_escritura" on fotos_equipo;
create policy "fotos_equipo_escritura" on fotos_equipo
  for all to authenticated
  using (
    exists (select 1 from equipos e where e.id = fotos_equipo.equipo_id and e.creador_id = auth.uid())
  )
  with check (
    exists (select 1 from equipos e where e.id = fotos_equipo.equipo_id and e.creador_id = auth.uid())
  );

-- Tope de 6 fotos por equipo.
create or replace function public.validar_max_fotos_equipo()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if (select count(*) from fotos_equipo where equipo_id = new.equipo_id) >= 6 then
    raise exception 'Un equipo no puede tener más de 6 fotos';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_max_fotos_equipo on fotos_equipo;
create trigger trg_max_fotos_equipo
  before insert on fotos_equipo
  for each row execute function public.validar_max_fotos_equipo();
