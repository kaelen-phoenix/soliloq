-- Enlace público de perfil: compartir la vidriera (fotos, experiencia/descripción,
-- habilidades/disciplinas) sin pedir sesión a quien lo recibe. Ver openspec/changes/
-- perfil-publico-enlace para la propuesta completa.
--
-- El valor de enum va primero y solo: `alter type ... add value` no puede convivir en la
-- misma transacción con el uso del valor nuevo (gotcha ya visto en 0030/0032). Se aplica en
-- su propia llamada a la Management API antes que el resto del archivo.

alter type tipo_notificacion add value if not exists 'interes_recibido';

-- --------------------------------------------------------------------------------------
-- 1. Token de enlace público, opt-in y revocable
-- --------------------------------------------------------------------------------------

alter table perfiles
  add column if not exists enlace_token uuid not null default gen_random_uuid(),
  add column if not exists enlace_publico_activo boolean not null default false;

create unique index if not exists idx_perfiles_enlace_token on perfiles (enlace_token);

-- --------------------------------------------------------------------------------------
-- 2. Quién generó el interés, para poder notificar `interes_recibido`
-- --------------------------------------------------------------------------------------

alter table notificaciones
  add column if not exists de_perfil uuid references perfiles (id) on delete cascade;

-- --------------------------------------------------------------------------------------
-- 3. La vidriera: proyección acotada, sin abrir políticas anónimas sobre perfiles_talento
--    ni perfiles_creador. Un perfil dual (talento y creador a la vez) se muestra según
--    modo_activo, igual que la propia vista de /perfil.
-- --------------------------------------------------------------------------------------

create or replace function public.perfil_publico(p_token uuid)
returns table (
  tipo text,
  nombre text,
  texto text,
  habilidades text[],
  disciplinas disciplina_artistica[],
  otro_detalle text,
  fotos text[]
)
language sql
security definer
stable
set search_path = public
as $$
  select
    'talento'::text,
    t.nombre,
    t.experiencia,
    t.habilidades,
    '{}'::disciplina_artistica[],
    null::text,
    coalesce(
      (select array_agg(f.storage_path order by f.orden)
       from fotos_talento f
       where f.talento_id = t.id),
      '{}'::text[]
    )
  from perfiles p
  join perfiles_talento t on t.id = p.id
  where p.enlace_token = p_token
    and p.enlace_publico_activo
    and p.modo_activo = 'talento'

  union all

  select
    'creador'::text,
    c.nombre,
    c.descripcion,
    '{}'::text[],
    c.disciplinas,
    c.otro_detalle,
    case when c.imagen_url is not null then array[c.imagen_url] else '{}'::text[] end
  from perfiles p
  join perfiles_creador c on c.id = p.id
  where p.enlace_token = p_token
    and p.enlace_publico_activo
    and p.modo_activo = 'creador';
$$;

revoke all on function public.perfil_publico(uuid) from public;
grant execute on function public.perfil_publico(uuid) to anon, authenticated;

-- --------------------------------------------------------------------------------------
-- 4. Contacto desde la vidriera: reusa intereses_equipo tal cual, sin obra de por medio.
--    La notificación `interes_recibido` se emite acá adentro, no con un trigger genérico
--    sobre intereses_equipo — eso preserva el "match ciego" del feed de armar equipo
--    (0033): un interés que nace del feed sigue sin avisar hasta que es mutuo. Solo el
--    contacto que nace de un enlace público notifica de entrada.
-- --------------------------------------------------------------------------------------

create or replace function public.contactar_desde_perfil(p_token uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_duenio uuid;
  v_reciproco boolean;
begin
  select id into v_duenio
  from perfiles
  where enlace_token = p_token and enlace_publico_activo;

  if v_duenio is null then
    raise exception 'enlace no disponible';
  end if;

  if v_duenio = auth.uid() then
    raise exception 'es tu propio perfil';
  end if;

  if public.hay_bloqueo(v_duenio) then
    raise exception 'no disponible';
  end if;

  select exists (
    select 1 from intereses_equipo
    where de_perfil = v_duenio and a_perfil = auth.uid() and interesa
  ) into v_reciproco;

  insert into intereses_equipo (de_perfil, a_perfil, interesa)
    values (auth.uid(), v_duenio, true)
    on conflict (de_perfil, a_perfil) do update set interesa = true;

  if not v_reciproco then
    insert into notificaciones (destinatario_id, tipo, de_perfil)
      values (v_duenio, 'interes_recibido', auth.uid());
  end if;
end;
$$;

revoke all on function public.contactar_desde_perfil(uuid) from public;
grant execute on function public.contactar_desde_perfil(uuid) to authenticated;

-- --------------------------------------------------------------------------------------
-- 5. Proyección acotada de quien contactó, para responder el interés desde la
--    notificación. Solo visible para quien recibió ese interés (mismo espíritu que
--    feed_equipo: nada de fotos ni edad).
-- --------------------------------------------------------------------------------------

create or replace function public.perfil_para_responder(p_de uuid)
returns table (
  perfil_id uuid,
  nombre text,
  pitch text,
  ubicacion_publica text,
  disciplinas disciplina_artistica[],
  otro_detalle text,
  habilidades text[],
  es_talento boolean,
  es_creador boolean
)
language sql
security definer
stable
set search_path = public
as $$
  select
    p.id,
    public.nombre_de_perfil(p.id),
    p.pitch,
    coalesce(t.ubicacion_publica, c.ubicacion_publica),
    coalesce(c.disciplinas, '{}'::disciplina_artistica[]),
    c.otro_detalle,
    coalesce(t.habilidades, '{}'::text[]),
    t.id is not null,
    c.id is not null
  from perfiles p
  left join perfiles_talento t on t.id = p.id
  left join perfiles_creador c on c.id = p.id
  where p.id = p_de
    and exists (
      select 1 from intereses_equipo i
      where i.de_perfil = p_de and i.a_perfil = auth.uid() and i.interesa
    );
$$;

revoke all on function public.perfil_para_responder(uuid) from public;
grant execute on function public.perfil_para_responder(uuid) to authenticated;
