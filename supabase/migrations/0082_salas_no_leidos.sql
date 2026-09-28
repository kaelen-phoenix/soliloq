-- 0082 — Indicador de mensajes nuevos en Salas (issue #216).
--
-- Cada integrante guarda hasta cuándo leyó su sala (`leido_hasta`). Un mensaje cuenta como
-- no leído si es de otra persona y es posterior a esa marca — o, si nunca abrió la sala, a
-- cuando entró (`incorporado_en`): quien llega a una sala con historia no la ve toda como
-- "nueva".
--
-- Las filas que ya existen arrancan en `now()`: sin eso, al desplegar cada usuario vería
-- como no leído todo el historial de todas sus salas.

alter table sala_integrantes add column if not exists leido_hasta timestamptz;
update sala_integrantes set leido_hasta = now() where leido_hasta is null;

-- ── Salas con mensajes sin leer del usuario ──────────────────────────────────────────
-- SECURITY INVOKER a propósito: así corren las policies de `mensajes`, incluida la de
-- bloqueos (0023) — un mensaje de alguien bloqueado no se ve, y tampoco se cuenta.
-- `es_de_iniciativa`/`es_dueno` le permiten al cliente separar por modo, igual que `/salas`
-- (#144): el badge del modo Talento no cuenta las salas de tus propios proyectos.
create or replace function public.salas_no_leidas()
returns table(sala_id uuid, no_leidos integer, es_de_iniciativa boolean, es_dueno boolean)
language sql
stable
security invoker
set search_path to 'public'
as $$
  select
    si.sala_id,
    count(m.id)::integer,
    (s.obra_id is not null or s.equipo_id is not null),
    coalesce(o.creador_id = auth.uid(), e.creador_id = auth.uid(), false)
  from sala_integrantes si
  join salas s on s.id = si.sala_id
  left join obras o on o.id = s.obra_id
  left join equipos e on e.id = s.equipo_id
  join mensajes m
    on m.sala_id = si.sala_id
   and m.autor_id <> auth.uid()
   and m.creado_en > coalesce(si.leido_hasta, si.incorporado_en)
  where si.perfil_id = auth.uid()
  group by si.sala_id, s.obra_id, s.equipo_id, o.creador_id, e.creador_id;
$$;

grant execute on function public.salas_no_leidas() to authenticated;

-- ── El integrante abrió la sala: todo lo que hay hasta ahora queda leído ─────────────
-- SECURITY DEFINER porque `sala_integrantes` no tiene policy de update (y no conviene
-- abrirla entera): esta función solo toca la marca de lectura de la fila propia.
create or replace function public.marcar_sala_leida(p_sala_id uuid)
returns void
language sql
security definer
set search_path to 'public'
as $$
  update sala_integrantes set leido_hasta = now()
  where sala_id = p_sala_id and perfil_id = auth.uid();
$$;

grant execute on function public.marcar_sala_leida(uuid) to authenticated;
