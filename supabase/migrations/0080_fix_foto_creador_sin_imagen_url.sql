-- 0080 — Hotfix: `mis_matches`, `mis_convocados` y `mis_convocatorias` seguían leyendo
-- `perfiles_creador.imagen_url`, que 0077 (#175) borró — las tres quedaron rotas (cualquier
-- llamada tira `column pc.imagen_url does not exist`). Pasó desapercibido porque el cliente
-- Supabase no lanza la excepción: `{ data: null, error }` se ignora en las tres pantallas
-- que las usan (`/matches`, `/convocatoria`, `pila-talentos.tsx`) y se ve como "vacío", igual
-- que "sin datos todavía" — hoy prod tiene 0 matches reales, así que nunca se notó.
--
-- Mismo fix que ya usó 0072 para el feed: la foto de respaldo del Creador sale de su propio
-- perfil de Talento (cuentas con doble rol), no de una columna que ya no existe.

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
      (select ft.storage_path from fotos_talento ft where ft.talento_id = pc.id order by ft.orden limit 1)
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
      (select ft.storage_path from fotos_talento ft where ft.talento_id = pc.id order by ft.orden limit 1)
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
    tc.nombre,
    (select f.storage_path from fotos_talento f
     where f.talento_id = m.talento_id order by f.orden limit 1),
    coalesce(
      (select fo.storage_path from fotos_obra fo where fo.obra_id = m.obra_id order by fo.orden limit 1),
      (select fe.storage_path from fotos_equipo fe where fe.equipo_id = m.equipo_id order by fe.orden limit 1),
      (select ft.storage_path from fotos_talento ft where ft.talento_id = tc.id order by ft.orden limit 1)
    ),
    c.creado_en
  from convocatorias c
  join matches m on m.id = c.match_id
  left join obras o on o.id = m.obra_id
  left join equipos e on e.id = m.equipo_id
  -- LEFT: igual que el `left join perfiles_creador` que reemplaza, no puede perder la fila
  -- de la convocatoria si por lo que sea el Creador no tiene (todavía) perfil de Talento.
  left join perfiles_talento tc on tc.id = coalesce(o.creador_id, e.creador_id)
  where m.talento_id = auth.uid()
    and c.estado = 'pendiente'
  order by c.creado_en desc;
$$;

revoke all on function public.mis_convocatorias() from public, anon;
grant execute on function public.mis_convocatorias() to authenticated;
