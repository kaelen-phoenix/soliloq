-- 0081 — Aviso de Match nuevo al Creador (issue #194).
--
-- Cuando se genera un Match, el Creador ve una ventana de confirmación una única vez (foto
-- del Talento + foto de la iniciativa). Necesita su propio flag: `aceptado_en` ya significa
-- "pasó a Convocados" (0063) y `descartado_en` "se descartó" — ninguno de los dos sirve para
-- "ya se le mostró el aviso". El match sigue en Call Back (`mis_matches()`) se haya mostrado
-- o no; mostrarlo no lo mueve de estado.

alter table matches add column if not exists mostrado_en timestamptz;

-- ── /matches del Creador: agrega `mostrado_en` para que el cliente sepa qué avisar ──
drop function if exists public.mis_matches();
create function public.mis_matches()
returns table(
  match_id uuid, talento_id uuid, nombre text, foto_path text, expira_en timestamptz,
  es_equipo boolean, iniciativa_titulo text, iniciativa_foto text, cupo_lleno boolean,
  mostrado_en timestamptz
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
    public.iniciativa_en_cierre(m.obra_id, m.equipo_id),
    m.mostrado_en
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

-- ── El Creador cierra el aviso de un Match nuevo (idempotente) ──────────────────
create or replace function public.marcar_match_mostrado(p_match_id uuid)
returns void
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  update matches set mostrado_en = now()
  where id = p_match_id and creador_id = auth.uid() and mostrado_en is null;
end;
$$;

grant execute on function public.marcar_match_mostrado(uuid) to authenticated;
