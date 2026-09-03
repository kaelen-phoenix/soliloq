-- Fotos del proyecto (issue #57). Espeja `fotos_equipo` (0045): tabla propia con orden,
-- tope por trigger, imágenes en el bucket `fotos-perfil` bajo `<creador_uid>/obras/<obra_id>/...`
-- (el primer segmento sigue siendo el uid del dueño, así la política de storage de 0010
-- aplica sin tocarla).
--
-- El feed suma las fotos de la obra a cada fila. **No** se filtra por "tiene 3+ fotos": las
-- obras publicadas que hoy no tienen ninguna seguirían apareciendo. El mínimo de 3 se pide
-- al publicar una obra nueva (chequeo en la app).

create table if not exists fotos_obra (
  id uuid primary key default gen_random_uuid(),
  obra_id uuid not null references obras (id) on delete cascade,
  storage_path text not null,
  orden smallint not null,
  creado_en timestamptz not null default now(),
  unique (obra_id, orden)
);

create index if not exists idx_fotos_obra on fotos_obra (obra_id, orden);

alter table fotos_obra enable row level security;

-- Lectura abierta a cualquiera con sesión: son fotos de una obra que ya está (o va a
-- estar) publicada, y el feed las usa. El bloqueo sigue mandando por 0022.
drop policy if exists "fotos_obra_lectura" on fotos_obra;
create policy "fotos_obra_lectura" on fotos_obra
  for select to authenticated using (true);

drop policy if exists "fotos_obra_lectura_bloqueo" on fotos_obra;
create policy "fotos_obra_lectura_bloqueo" on fotos_obra
  as restrictive for select using (
    not public.hay_bloqueo((select o.creador_id from obras o where o.id = fotos_obra.obra_id))
  );

-- Alta / edición / baja: solo el dueño de la obra.
drop policy if exists "fotos_obra_escritura" on fotos_obra;
create policy "fotos_obra_escritura" on fotos_obra
  for all to authenticated
  using (
    exists (select 1 from obras o where o.id = fotos_obra.obra_id and o.creador_id = auth.uid())
  )
  with check (
    exists (select 1 from obras o where o.id = fotos_obra.obra_id and o.creador_id = auth.uid())
  );

-- Tope de 6 fotos por obra.
create or replace function public.validar_max_fotos_obra()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if (select count(*) from fotos_obra where obra_id = new.obra_id) >= 6 then
    raise exception 'Una obra no puede tener más de 6 fotos';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_max_fotos_obra on fotos_obra;
create trigger trg_max_fotos_obra
  before insert on fotos_obra
  for each row execute function public.validar_max_fotos_obra();

-- ------------------------------------------------------------------------------------------
-- El feed suma las fotos de la obra. `create or replace view` agrega la columna al final,
-- sin cambiar las demás. `feed_para_talento` (SETOF feed_talento) la hereda sola.
-- ------------------------------------------------------------------------------------------
create or replace view feed_talento as
  select
    r.id as rol_id,
    r.nombre as rol_nombre,
    r.tipo as rol_tipo,
    r.edad_minima,
    r.edad_maxima,
    r.descripcion as rol_descripcion,
    r.vacantes,
    r.generos_buscados,
    o.id as obra_id,
    o.titulo as obra_titulo,
    o.sinopsis as obra_sinopsis,
    o.ubicacion_texto as obra_ubicacion_texto,
    o.ubicacion_lat as obra_ubicacion_lat,
    o.ubicacion_lng as obra_ubicacion_lng,
    o.ubicacion_pais as obra_ubicacion_pais,
    o.creado_en as obra_creado_en,
    c.id as creador_id,
    c.nombre as creador_nombre,
    c.imagen_url as creador_imagen_url,
    coalesce(
      (select array_agg(fo.storage_path order by fo.orden) from fotos_obra fo where fo.obra_id = o.id),
      '{}'::text[]
    ) as obra_fotos
  from roles r
  join obras o on o.id = r.obra_id
  join perfiles_creador c on c.id = o.creador_id
  where o.estado = 'publicada'::estado_obra
    and (select count(*) from postulaciones p where p.rol_id = r.id and p.estado = 'aprobado'::estado_postulacion) < r.vacantes;
