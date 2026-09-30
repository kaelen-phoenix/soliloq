-- 0090 — «Ocultar mi perfil a personas nuevas» (#265).
--
-- Hasta acá la opción era «Aparecer en el buscador de creadores» y solo sacaba a la persona
-- del buscador de Creadores (`buscar_talento` y la política `perfil_talento_select_buscador`).
-- Ahora, con el perfil oculto (`perfiles_talento.aparece_en_buscador = false`; la columna no
-- cambia de nombre, la pantalla la muestra invertida), nadie nuevo la encuentra ni la
-- contacta:
--   - no sale en «Armar equipo» (`feed_equipo`), aunque tenga «busco equipo» prendido;
--   - su enlace público no muestra el perfil (`perfil_publico`), salvo a ella misma;
--   - no se la puede contactar (`contactar_desde_perfil`, insert en `intereses_equipo`) ni
--     marcarle «Me interesa» como talento (`marcar_interes`).
--
-- Lo que no cambia, a propósito:
--   - quien ya comparte una sala con ella la sigue viendo y hablando (chats abiertos);
--   - responderle a ella: si fue ella la que escribió o marcó interés primero, la otra
--     persona puede contestar (si no, ocultarse rompería un contacto que ella misma empezó);
--   - sus Proyectos y Equipos publicados siguen recibiendo interesados: son iniciativas que
--     publicó para eso, y el interés va a la iniciativa;
--   - ella puede seguir buscando, contactando y marcando «Me interesa».

-- `true` si `p_perfil` ocultó su perfil a personas nuevas y quien pregunta es alguien nuevo:
-- no es ella misma ni comparte una sala con ella. Sin Perfil de Talento no hay opción: false.
create or replace function public.perfil_oculto_a_nuevos(p_perfil uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select p_perfil is distinct from auth.uid()
     and coalesce((select not aparece_en_buscador from perfiles_talento where id = p_perfil), false)
     and not public.comparte_sala_con(p_perfil);
$$;

revoke all on function public.perfil_oculto_a_nuevos(uuid) from public;
grant execute on function public.perfil_oculto_a_nuevos(uuid) to anon, authenticated;

-- `true` si `p_perfil` ya le escribió a quien pregunta (interés de equipo). Security definer:
-- la política de abajo lo necesita, y por RLS nadie ve los intereses que le mandaron.
create or replace function public.me_contacto(p_perfil uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from intereses_equipo
    where de_perfil = p_perfil and a_perfil = auth.uid() and interesa
  );
$$;

revoke all on function public.me_contacto(uuid) from public;
grant execute on function public.me_contacto(uuid) to authenticated;

-- ── «Contactar» por insert directo (/equipo y responder) ────────────────────
-- Descartar (`interesa = false`) siempre se puede; contactar a alguien oculto, solo para
-- responderle si ella ya había escrito.
drop policy if exists oculto_a_nuevos_intereses_equipo on intereses_equipo;
create policy oculto_a_nuevos_intereses_equipo on intereses_equipo as restrictive for insert
  with check (
    not interesa
    or not public.perfil_oculto_a_nuevos(a_perfil)
    or public.me_contacto(a_perfil)
  );

-- ── Funciones security definer (no pasan por RLS) ───────────────────────────
-- Cuerpos iguales a los de prod; lo nuevo está marcado con «#265».

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
    and not public.perfil_oculto_a_nuevos(p.id)  -- #265
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
    and not public.perfil_oculto_a_nuevos(p.id);  -- #265
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

  if public.hay_bloqueo(v_duenio) then
    raise exception 'no disponible';
  end if;

  select exists (
    select 1 from intereses_equipo
    where de_perfil = v_duenio and a_perfil = auth.uid() and interesa
  ) into v_reciproco;

  -- #265: a quien ocultó su perfil no la contacta nadie nuevo (salvo para responderle).
  if public.perfil_oculto_a_nuevos(v_duenio) and not v_reciproco then
    raise exception 'no disponible';
  end if;

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

  -- #265: a un talento que ocultó su perfil no se le marca «Me interesa» — salvo que sea el
  -- dueño de la iniciativa (el interés va a su Proyecto o Equipo publicado) o que el interés
  -- de ella ya esté (responderle).
  if p_interesa
     and public.perfil_oculto_a_nuevos(p_a_perfil)
     and not exists (
       select 1 from obras where id = p_obra_id and creador_id = p_a_perfil
       union all
       select 1 from equipos where id = p_equipo_id and creador_id = p_a_perfil
     )
     and not exists (
       select 1 from intereses_match
       where de_perfil = p_a_perfil and a_perfil = auth.uid() and interesa
         and coalesce(obra_id, equipo_id) = coalesce(p_obra_id, p_equipo_id)
     ) then
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
