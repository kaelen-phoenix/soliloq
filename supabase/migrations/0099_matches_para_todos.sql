-- 0099 — Matches para todos (#298).
--
-- Hasta acá la pantalla Matches era solo del Creador (`mis_matches`, `mis_convocados`). Quien
-- marcó «Me interesa» en un Proyecto o Equipo no veía con cuáles hizo match ni podía salirse.
--
-- `mis_matches_como_talento()`: los matches vivos de quien mira, del lado del Talento, con su
-- estado: 'match' (todavía no lo convocaron), 'convocado' (convocatoria pendiente de
-- responder) o 'en_sala' (aceptó y está en el chat).
--
-- `retirarme_de_match(match)`: el Talento se baja de un match o de una convocatoria pendiente.
-- El match queda descartado, la convocatoria pendiente pasa a rechazada y se borra su
-- «Me interesa» a esa iniciativa (si quiere volver, lo marca de nuevo). Si ya está en el chat
-- no corre acá: para eso está `desvincularme_de_sala`, que además libera el rol.

create or replace function public.mis_matches_como_talento()
returns table (
  match_id uuid,
  es_equipo boolean,
  obra_id uuid,
  iniciativa_titulo text,
  iniciativa_foto text,
  creador_nombre text,
  expira_en timestamptz,
  estado text,
  convocatoria_id uuid,
  sala_id uuid
)
language sql
stable
security definer
set search_path to 'public'
as $function$
  select
    m.id,
    m.equipo_id is not null,
    m.obra_id,
    coalesce(o.titulo, e.titulo),
    coalesce(
      (select fo.storage_path from fotos_obra fo where fo.obra_id = m.obra_id order by fo.orden limit 1),
      (select fe.storage_path from fotos_equipo fe where fe.equipo_id = m.equipo_id order by fe.orden limit 1),
      (select ft.storage_path from fotos_talento ft where ft.talento_id = m.creador_id order by ft.orden limit 1)
    ),
    tc.nombre,
    m.expira_en,
    case
      when ca.id is not null then 'en_sala'
      when cp.id is not null then 'convocado'
      else 'match'
    end,
    coalesce(ca.id, cp.id),
    -- La sala de esa iniciativa, por tipo, y solo si quien mira está adentro.
    case when ca.id is not null then
      (select s.id from salas s
       join sala_integrantes si on si.sala_id = s.id and si.perfil_id = m.talento_id
       where (m.obra_id is not null and s.obra_id = m.obra_id)
          or (m.equipo_id is not null and s.equipo_id = m.equipo_id)
       limit 1)
    end
  from matches m
  left join obras o on o.id = m.obra_id
  left join equipos e on e.id = m.equipo_id
  left join perfiles_talento tc on tc.id = m.creador_id
  left join lateral (
    select c.id from convocatorias c
    where c.match_id = m.id and c.estado = 'aceptada'
    order by c.creado_en desc limit 1
  ) ca on true
  left join lateral (
    select c.id from convocatorias c
    where c.match_id = m.id and c.estado = 'pendiente'
    order by c.creado_en desc limit 1
  ) cp on true
  where m.talento_id = auth.uid()
    and m.creador_id <> auth.uid()
    and m.descartado_en is null
    and coalesce(o.id, e.id) is not null
    -- Con un bloqueo entre las dos personas (0022, en cualquier sentido) no se lista.
    and not public.hay_bloqueo(m.creador_id)
    and not exists (
      select 1 from convocatorias c
      where c.match_id = m.id and c.estado in ('rechazada', 'baja')
    )
    -- Un match sin convocar vence; uno con convocatoria o en el chat, no.
    and (m.expira_en > now() or ca.id is not null or cp.id is not null)
  order by
    case when ca.id is not null then 2 when cp.id is not null then 0 else 1 end,
    m.creado_en desc;
$function$;

revoke all on function public.mis_matches_como_talento() from public, anon;
grant execute on function public.mis_matches_como_talento() to authenticated;

create or replace function public.retirarme_de_match(p_match_id uuid)
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  m matches%rowtype;
begin
  select * into m from matches where id = p_match_id and talento_id = auth.uid();
  if m.id is null then raise exception 'match no encontrado'; end if;
  if m.descartado_en is not null then return; end if;
  if exists (select 1 from convocatorias c where c.match_id = p_match_id and c.estado = 'aceptada') then
    raise exception 'ya estás en el chat: salí desde ahí';
  end if;

  update matches set descartado_en = now() where id = p_match_id;
  update convocatorias set estado = 'rechazada', respondido_en = now()
  where match_id = p_match_id and estado = 'pendiente';

  delete from intereses_match
  where de_perfil = auth.uid()
    and a_perfil = m.creador_id
    and coalesce(obra_id, equipo_id) = coalesce(m.obra_id, m.equipo_id);
end;
$function$;

revoke all on function public.retirarme_de_match(uuid) from public, anon;
grant execute on function public.retirarme_de_match(uuid) to authenticated;
