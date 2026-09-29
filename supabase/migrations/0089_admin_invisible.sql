-- 0089 — El perfil de un Administrador no se ve en la experiencia de Yalope (#249).
--
-- Mientras una cuenta tenga `es_admin`, para las demás personas no existe: no sale en
-- Buscar ni en la pila, ni en /equipo, ni por su enlace público; sus Proyectos y Equipos no
-- aparecen; no se le puede marcar «Me interesa» ni contactar. Ella se sigue viendo a sí
-- misma, y las otras cuentas admin la ven desde el panel (las RPC `admin_*` son security
-- definer y no pasan por esto). Si deja de ser admin, vuelve a verse sola: no se toca nada
-- de su perfil, todo se decide en el momento con `perfil_oculto`.
--
-- Una excepción: con quien ya comparte una sala la sigue viendo. Si no, en un chat que ya
-- existía desaparecerían su nombre y su foto a mitad de conversación.
--
-- Es el mismo mecanismo que los bloqueos (políticas RESTRICTIVE + un chequeo en las
-- funciones security definer que no pasan por RLS), pero aparte de `hay_bloqueo`: un
-- bloqueo también esconde los mensajes, y acá no.

create or replace function public.perfil_oculto(p_perfil uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select p_perfil is distinct from auth.uid()
     and coalesce((select es_admin from perfiles where id = p_perfil), false);
$$;

revoke all on function public.perfil_oculto(uuid) from public;
grant execute on function public.perfil_oculto(uuid) to anon, authenticated;

-- ── Tablas: RESTRICTIVE, se suman a las políticas que ya hay ─────────────────
drop policy if exists admin_oculto_perfil_talento on perfiles_talento;
create policy admin_oculto_perfil_talento on perfiles_talento as restrictive for select
  using (not public.perfil_oculto(id) or public.comparte_sala_con(id));

drop policy if exists admin_oculto_perfil_creador on perfiles_creador;
create policy admin_oculto_perfil_creador on perfiles_creador as restrictive for select
  using (not public.perfil_oculto(id) or public.comparte_sala_con(id));

drop policy if exists admin_oculto_fotos_talento on fotos_talento;
create policy admin_oculto_fotos_talento on fotos_talento as restrictive for select
  using (not public.perfil_oculto(talento_id) or public.comparte_sala_con(talento_id));

drop policy if exists admin_oculto_obras on obras;
create policy admin_oculto_obras on obras as restrictive for select
  using (not public.perfil_oculto(creador_id) or public.comparte_sala_con(creador_id));

drop policy if exists admin_oculto_equipos on equipos;
create policy admin_oculto_equipos on equipos as restrictive for select
  using (not public.perfil_oculto(creador_id) or public.comparte_sala_con(creador_id));

-- «Contactar» por insert directo (la app usa `contactar_desde_perfil`, pero la tabla acepta
-- el insert propio).
drop policy if exists admin_oculto_intereses_equipo on intereses_equipo;
create policy admin_oculto_intereses_equipo on intereses_equipo as restrictive for insert
  with check (not public.perfil_oculto(a_perfil));

-- ── Funciones security definer (no pasan por RLS) ───────────────────────────
-- Cuerpos iguales a los de prod; lo nuevo está marcado con «#249».

create or replace function public.feed_equipo(p_radio_metros integer default null::integer)
returns table(perfil_id uuid, nombre text, pitch text, ubicacion_publica text, disciplinas disciplina_artistica[], otro_detalle text, habilidades text[], imagen_url text, es_talento boolean, es_creador boolean, distancia_metros integer)
language sql
stable security definer
set search_path to 'public'
as $function$
  with yo as (
    select p.id, t.ubicacion_lat as lat, t.ubicacion_lng as lng
    from perfiles p
    left join perfiles_talento t on t.id = p.id
    where p.id = auth.uid()
  )
  select
    p.id,
    public.nombre_de_perfil(p.id),
    p.pitch,
    t.ubicacion_publica,
    coalesce(c.disciplinas, '{}'::disciplina_artistica[]),
    c.otro_detalle,
    coalesce(t.habilidades, '{}'::text[]),
    -- La imagen de Creador se borró en 0077 y del Talento no se expone ninguna foto (viven
    -- en `fotos_talento`, detrás de sus políticas).
    null::text,
    t.id is not null,
    c.id is not null,
    case
      when yo.lat is null or t.ubicacion_lat is null then null
      else earth_distance(
             ll_to_earth(yo.lat, yo.lng),
             ll_to_earth(t.ubicacion_lat, t.ubicacion_lng)
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
    and not public.perfil_oculto(p.id)  -- #249
    and (
      p_radio_metros is null
      or yo.lat is null
      or earth_distance(
           ll_to_earth(yo.lat, yo.lng),
           ll_to_earth(t.ubicacion_lat, t.ubicacion_lng)
         ) <= p_radio_metros
    )
  order by 11 nulls last
  limit 50;
$function$;

create or replace function public.perfil_publico(p_token uuid)
returns table(nombre text, texto text, habilidades text[], disciplinas disciplina_artistica[], otro_detalle text, fotos text[], ubicacion_publica text, edad integer, genero text, genero_descripcion text, videoreel_url text, redes jsonb)
language sql
stable security definer
set search_path to 'public'
as $function$
  select
    t.nombre,
    t.experiencia,
    t.habilidades,
    coalesce(c.disciplinas, '{}'::disciplina_artistica[]),
    c.otro_detalle,
    coalesce(
      (select array_agg(f.storage_path order by f.orden)
       from fotos_talento f
       where f.talento_id = t.id),
      '{}'::text[]
    ),
    t.ubicacion_publica,
    case when t.edad_visible
         then extract(year from age(t.fecha_nacimiento))::int end,
    t.genero::text,
    t.genero_descripcion,
    t.videoreel_url,
    t.redes
  from perfiles p
  join perfiles_talento t on t.id = p.id
  left join perfiles_creador c on c.id = p.id
  where p.enlace_token = p_token
    and p.enlace_publico_activo
    and not public.perfil_oculto(p.id);  -- #249
$function$;

create or replace function public.contactar_desde_perfil(p_token uuid)
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
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

  if public.hay_bloqueo(v_duenio) or public.perfil_oculto(v_duenio) then  -- #249
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
$function$;

create or replace function public.marcar_interes(p_a_perfil uuid, p_obra_id uuid, p_equipo_id uuid, p_interesa boolean)
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_modo text;
  v_ya boolean;
  v_usados int;
begin
  if (p_obra_id is null) = (p_equipo_id is null) then
    raise exception 'indicá una obra o un equipo, no las dos';
  end if;

  -- #249: a un Administrador no se le marca interés (ni en sus iniciativas ni como talento).
  if p_interesa and public.perfil_oculto(p_a_perfil) then
    raise exception 'no disponible';
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
$function$;
