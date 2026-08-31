-- Buscador de talento para creadores, con la foto como primera impresión.
--
-- Hasta acá el descubrimiento iba en un solo sentido: el talento se postula, el creador
-- reacciona. `perfil_talento_select_para_creador` (0007) deja que un creador lea un perfil
-- de talento solo si esa persona se postuló a una obra suya. Este change abre el sentido
-- inverso, acotado al talento que optó por ser encontrado.
--
-- Todo el archivo es aditivo e idempotente: se puede pegar en el SQL Editor y volver a
-- correr con `supabase db push` sin efectos.

-- --- Opt-in --------------------------------------------------------------------------------
-- `true` por defecto para que la grilla no arranque vacía; el formulario del perfil explica
-- qué implica y deja apagarlo. Apagarlo no toca postulaciones ni "armar equipo".
alter table perfiles_talento
  add column if not exists aparece_en_buscador boolean not null default true;

-- --- ¿La sesión es de un creador? --------------------------------------------------------
-- SECURITY DEFINER siguiendo el patrón de 0005/0022: una política que subconsulte una tabla
-- con RLS puede entrar en recursión entre políticas.
create or replace function public.puede_buscar_talento()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (select 1 from perfiles_creador where id = auth.uid());
$$;

-- --- Lectura para creadores, acotada a opt-in ------------------------------------------
-- Permisivas: combinan con OR con `_propio` y `_para_creador`. Las restrictivas de bloqueo
-- de 0022 (`bloqueo_perfil_talento`, `bloqueo_fotos_talento`) siguen combinando con AND, así
-- que un talento bloqueado no se vuelve visible por más que optó por aparecer.
drop policy if exists "perfil_talento_select_buscador" on perfiles_talento;
create policy "perfil_talento_select_buscador" on perfiles_talento
  for select using (public.puede_buscar_talento() and aparece_en_buscador = true);

drop policy if exists "fotos_talento_select_buscador" on fotos_talento;
create policy "fotos_talento_select_buscador" on fotos_talento
  for select using (
    public.puede_buscar_talento()
    and exists (
      select 1 from perfiles_talento pt
      where pt.id = fotos_talento.talento_id and pt.aparece_en_buscador = true
    )
  );

-- --- La grilla: proyección acotada y paginada -----------------------------------------
-- SECURITY INVOKER (como `feed_para_talento`, 0020): hereda la RLS de arriba y las
-- restrictivas de bloqueo. Devuelve SOLO lo que muestra la tarjeta — nunca `fecha_nacimiento`,
-- ubicación exacta, experiencia ni videoreel. El perfil completo se abre aparte, por
-- `/talentos/[id]`, apoyado en `perfil_talento_select_buscador`.
create or replace function public.buscar_talento(
  p_texto        text default null,
  p_edad_min     int default null,
  p_edad_max     int default null,
  p_generos      genero_persona[] default '{}',
  p_habilidades  text[] default '{}',
  p_lat          double precision default null,
  p_lng          double precision default null,
  p_radio_metros int default null,
  p_limite       int default 24,
  p_offset       int default 0
)
returns table (
  id uuid,
  nombre text,
  edad int,
  ubicacion_publica text,
  habilidades text[],
  foto_principal_path text
)
language sql
security invoker
stable
as $$
  select
    t.id,
    t.nombre,
    extract(year from age(t.fecha_nacimiento))::int as edad,
    t.ubicacion_publica,
    t.habilidades,
    (
      select f.storage_path from fotos_talento f
      where f.talento_id = t.id
      order by f.orden
      limit 1
    ) as foto_principal_path
  from perfiles_talento t
  where t.id <> auth.uid()
    and exists (select 1 from fotos_talento f where f.talento_id = t.id)
    and (p_texto is null or t.nombre ilike '%' || p_texto || '%')
    and (
      p_edad_min is null
      or extract(year from age(t.fecha_nacimiento))::int >= p_edad_min
    )
    and (
      p_edad_max is null
      or extract(year from age(t.fecha_nacimiento))::int <= p_edad_max
    )
    and (cardinality(p_generos) = 0 or t.genero = any (p_generos))
    and (cardinality(p_habilidades) = 0 or t.habilidades && p_habilidades)
    -- Mismo criterio geo que 0020: earth_box para que use el índice GiST, earth_distance
    -- afina el borde de la caja.
    and (
      p_lat is null or p_lng is null or p_radio_metros is null
      or (
        ll_to_earth(t.ubicacion_lat, t.ubicacion_lng)
          <@ earth_box(ll_to_earth(p_lat, p_lng), p_radio_metros)
        and earth_distance(
              ll_to_earth(t.ubicacion_lat, t.ubicacion_lng),
              ll_to_earth(p_lat, p_lng)
            ) <= p_radio_metros
      )
    )
  order by t.nombre asc, t.id asc
  limit greatest(p_limite, 0)
  offset greatest(p_offset, 0);
$$;
