-- 0059 — La convocatoria entra directo a la sala (issue #131).
--
-- Antes: `convocar()` dejaba la convocatoria en `pendiente` y el Talento tenía que ir a
-- `/convocado` y aceptar (`responder_convocatoria`) para recién ahí entrar a `sala_integrantes`.
-- Ahora: no hay paso de aceptación. `convocar()` —que sigue disparando el Creador sin cambios
-- en su flujo— crea/une la sala, mete al Talento en el acto y deja la convocatoria en
-- `aceptada`. El Talento ve la sala en `/salas` y ya puede escribir.
--
-- `dar_de_baja_convocado()` (Creador) no cambia: sigue buscando `estado = 'aceptada'` y
-- sacando al Talento de la sala.

create or replace function public.convocar(p_match_id uuid)
returns void
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  m matches%rowtype;
  v_sala_id uuid;
  v_titulo text;
begin
  select * into m from matches where id = p_match_id and creador_id = auth.uid();
  if m.id is null then raise exception 'match no encontrado'; end if;
  if m.expira_en <= now() then raise exception 'el match venció'; end if;

  if public.iniciativa_en_cierre(m.obra_id, m.equipo_id) then
    raise exception 'cupo_lleno';
  end if;

  if exists (select 1 from convocatorias c
             where c.match_id = p_match_id and c.estado in ('pendiente', 'aceptada')) then
    raise exception 'ya está convocado';
  end if;

  select coalesce(o.titulo, e.titulo) into v_titulo
  from matches x
  left join obras o on o.id = x.obra_id
  left join equipos e on e.id = x.equipo_id
  where x.id = m.id;

  select id into v_sala_id from salas
  where coalesce(obra_id, equipo_id) = coalesce(m.obra_id, m.equipo_id);
  if v_sala_id is null then
    insert into salas (obra_id, equipo_id, titulo) values (m.obra_id, m.equipo_id, v_titulo)
      returning id into v_sala_id;
    insert into sala_integrantes (sala_id, perfil_id) values (v_sala_id, m.creador_id)
      on conflict do nothing;
  end if;
  insert into sala_integrantes (sala_id, perfil_id) values (v_sala_id, m.talento_id)
    on conflict do nothing;

  insert into convocatorias (match_id, estado, respondido_en)
    values (p_match_id, 'aceptada', now());

  insert into notificaciones (destinatario_id, tipo, obra_id)
    values (m.talento_id, 'convocado', m.obra_id);
end;
$$;

-- El paso de aceptación del Talento ya no existe.
drop function if exists public.responder_convocatoria(uuid, boolean);
drop function if exists public.mis_convocatorias();
