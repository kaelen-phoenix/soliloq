-- 0107 — Aviso en el corazón de Convocatorias cuando hay un Talento nuevo (#366).
--
-- `perfiles.convocatorias_vistas_en` es la última vez que la persona entró a Convocatorias
-- (`/matches`). El corazón de la navegación se resalta si, desde entonces, apareció un match
-- nuevo de alguno de sus Proyectos o Equipos (los mismos que lista `mis_matches`: vigentes,
-- sin aceptar ni descartar). Es independiente de la ventana «Hay interés» (`mostrado_en`) y
-- de las notificaciones de la campanita.
--
-- Las cuentas existentes arrancan con `now()`: nadie ve el corazón resaltado por matches
-- viejos que ya conocía.

alter table public.perfiles
  add column if not exists convocatorias_vistas_en timestamptz not null default now();

create or replace function public.hay_convocatorias_nuevas()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from matches m
    join perfiles p on p.id = m.creador_id
    where m.creador_id = auth.uid()
      and m.creado_en > p.convocatorias_vistas_en
      and m.expira_en > now()
      and m.aceptado_en is null
      and m.descartado_en is null
  );
$$;

create or replace function public.marcar_convocatorias_vistas()
returns void
language sql
security definer
set search_path = public
as $$
  update perfiles set convocatorias_vistas_en = now() where id = auth.uid();
$$;

revoke all on function public.hay_convocatorias_nuevas() from public, anon;
revoke all on function public.marcar_convocatorias_vistas() from public, anon;
grant execute on function public.hay_convocatorias_nuevas() to authenticated;
grant execute on function public.marcar_convocatorias_vistas() to authenticated;
