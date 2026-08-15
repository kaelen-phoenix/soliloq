-- "Armar equipo": conocer gente sin tener un proyecto.
--
-- Hasta acá, para cruzarte con alguien había que inventar una obra con roles. Quien dice
-- "soy iluminador, tengo tiempo y ganas de armar algo" no tenía puerta de entrada, y es
-- justamente el caso que el estudio de mercado pone en el centro: la app opera *antes* del
-- casting, incluso antes de que el proyecto exista.
--
-- Dos decisiones de fondo:
--
-- 1. **Una sala deja de necesitar una obra.**
--
-- 2. **Esto NO abre los perfiles de talento.** Hoy un perfil de talento solo lo ven su dueño
--    y los creadores a cuyas obras se postuló; ahí viven fotos y fecha de nacimiento. Un
--    feed de personas resuelto con una vista `security_invoker` habría exigido abrir esa
--    política a cualquiera con sesión, que es una cesión de privacidad grande y silenciosa.
--    En su lugar el feed es una función `SECURITY DEFINER` que devuelve una **proyección
--    acotada** —nombre, pitch, disciplinas, ciudad— de quienes **se anotaron** explícitamente.
--    Ni fotos, ni edad, ni ubicación exacta. El perfil completo sigue detrás de sus políticas.

-- --------------------------------------------------------------------------------------
-- 1. Salas sin obra
-- --------------------------------------------------------------------------------------

-- El `unique` sobre obra_id se conserva: en Postgres un unique admite varios NULL, así que
-- sigue habiendo una sola sala por obra y a la vez muchas salas sin obra.
alter table salas alter column obra_id drop not null;

-- Cómo se llama una sala que no tiene obra que le preste el título.
alter table salas add column if not exists titulo text check (char_length(titulo) <= 120);

-- --------------------------------------------------------------------------------------
-- 2. Quién está buscando con quién armar algo
-- --------------------------------------------------------------------------------------

alter table perfiles
  add column if not exists busca_equipo boolean not null default false,
  -- Qué querés hacer, en una línea. Es lo único que separa "estoy disponible" de una
  -- intención concreta, y es lo que la otra persona lee para decidir.
  add column if not exists pitch text check (char_length(pitch) <= 280);

create index if not exists idx_perfiles_busca_equipo on perfiles (id) where busca_equipo;

-- --------------------------------------------------------------------------------------
-- 3. El interés entre personas
-- --------------------------------------------------------------------------------------

-- Espejo de `postulaciones` + `descartes`, pero de persona a persona. Las dos decisiones van
-- en la misma tabla porque acá no hay estados posteriores que seguir: o te interesa o no.
create table if not exists intereses_equipo (
  de_perfil uuid not null references perfiles (id) on delete cascade,
  a_perfil uuid not null references perfiles (id) on delete cascade,
  interesa boolean not null,
  creado_en timestamptz not null default now(),
  primary key (de_perfil, a_perfil),
  constraint interes_no_a_si_mismo check (de_perfil <> a_perfil)
);

create index if not exists idx_intereses_a_perfil on intereses_equipo (a_perfil) where interesa;

alter table intereses_equipo enable row level security;

create policy "intereses_insert_propio" on intereses_equipo
  for insert with check (de_perfil = auth.uid());

-- Se ve lo propio. **No** se ve quién te marcó a vos: enterarte de que alguien te eligió
-- antes de elegirlo cambia la decisión, y la gracia del match mutuo es que las dos partes
-- decidan sin saber qué hizo la otra.
create policy "intereses_select_propio" on intereses_equipo
  for select using (de_perfil = auth.uid());

-- Cambiar de opinión sí; borrar no. El histórico es lo que evita que la misma persona
-- reaparezca en el feed para siempre.
create policy "intereses_update_propio" on intereses_equipo
  for update using (de_perfil = auth.uid()) with check (de_perfil = auth.uid());

create policy "bloqueo_intereses" on intereses_equipo
  as restrictive for select using (not public.hay_bloqueo(a_perfil));

-- --------------------------------------------------------------------------------------
-- 4. Cuando el interés es mutuo, nace la sala
-- --------------------------------------------------------------------------------------

-- Un perfil puede tener nombre de talento, de creador o los dos. Se prefiere el de talento
-- por ser el nombre artístico de la persona; el de creador puede ser el de una compañía.
create or replace function public.nombre_de_perfil(p_perfil_id uuid)
returns text
language sql
security definer
set search_path = public
stable
as $$
  select coalesce(
    (select nombre from perfiles_talento where id = p_perfil_id),
    (select nombre from perfiles_creador where id = p_perfil_id),
    'Alguien'
  );
$$;

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
  if not new.interesa then
    return new;
  end if;

  select exists (
    select 1 from intereses_equipo
    where de_perfil = new.a_perfil and a_perfil = new.de_perfil and interesa
  ) into v_reciproco;

  if not v_reciproco then
    return new;
  end if;

  -- Podrían compartir ya una sala sin obra de un match anterior. No se crea otra.
  select s.id into v_sala_id
  from salas s
  join sala_integrantes i1 on i1.sala_id = s.id and i1.perfil_id = new.de_perfil
  join sala_integrantes i2 on i2.sala_id = s.id and i2.perfil_id = new.a_perfil
  where s.obra_id is null
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

drop trigger if exists despues_de_marcar_interes on intereses_equipo;
create trigger despues_de_marcar_interes
  after insert or update on intereses_equipo
  for each row execute procedure public.al_marcar_interes();

-- --------------------------------------------------------------------------------------
-- 5. El feed de personas
-- --------------------------------------------------------------------------------------

-- `SECURITY DEFINER` con proyección acotada: es lo que permite mostrar gente sin abrir las
-- políticas de `perfiles_talento`. Por eso lo primero que hace es comprobar que quien
-- pregunta es quien dice ser — sin ese chequeo, cualquiera pediría el feed de otro.
create or replace function public.feed_equipo(p_radio_metros integer default null)
returns table (
  perfil_id uuid,
  nombre text,
  pitch text,
  ubicacion_publica text,
  disciplinas disciplina_artistica[],
  otro_detalle text,
  habilidades text[],
  imagen_url text,
  es_talento boolean,
  es_creador boolean,
  distancia_metros integer
)
language sql
security definer
set search_path = public
stable
as $$
  with yo as (
    select p.id,
           coalesce(t.ubicacion_lat, c.ubicacion_lat) as lat,
           coalesce(t.ubicacion_lng, c.ubicacion_lng) as lng
    from perfiles p
    left join perfiles_talento t on t.id = p.id
    left join perfiles_creador c on c.id = p.id
    where p.id = auth.uid()
  )
  select
    p.id,
    public.nombre_de_perfil(p.id),
    p.pitch,
    coalesce(t.ubicacion_publica, c.ubicacion_publica),
    coalesce(c.disciplinas, '{}'::disciplina_artistica[]),
    c.otro_detalle,
    coalesce(t.habilidades, '{}'::text[]),
    -- Del talento no se expone ninguna foto: viven en `fotos_talento`, detrás de sus
    -- políticas. La del creador ya es pública para cualquier sesión.
    c.imagen_url,
    t.id is not null,
    c.id is not null,
    case
      when yo.lat is null or coalesce(t.ubicacion_lat, c.ubicacion_lat) is null then null
      else earth_distance(
             ll_to_earth(yo.lat, yo.lng),
             ll_to_earth(coalesce(t.ubicacion_lat, c.ubicacion_lat),
                         coalesce(t.ubicacion_lng, c.ubicacion_lng))
           )::int
    end
  from perfiles p
  cross join yo
  left join perfiles_talento t on t.id = p.id
  left join perfiles_creador c on c.id = p.id
  where p.busca_equipo
    and p.id <> yo.id
    and (t.id is not null or c.id is not null)
    and not exists (
      select 1 from intereses_equipo i
      where i.de_perfil = yo.id and i.a_perfil = p.id
    )
    and not public.hay_bloqueo(p.id)
    and (
      p_radio_metros is null
      or yo.lat is null
      or earth_distance(
           ll_to_earth(yo.lat, yo.lng),
           ll_to_earth(coalesce(t.ubicacion_lat, c.ubicacion_lat),
                       coalesce(t.ubicacion_lng, c.ubicacion_lng))
         ) <= p_radio_metros
    )
  order by 11 nulls last
  limit 50;
$$;

revoke all on function public.feed_equipo(integer) from public, anon;
grant execute on function public.feed_equipo(integer) to authenticated;
