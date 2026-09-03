-- #57 Fase 2 — el creador ve quién se interesó en su equipo y acepta hasta el cupo.
--
-- Las políticas de `intereses_equipo` (0033) esconden a propósito quién te marcó a vos
-- (el match a ciegas). Para el circuito de equipo, en cambio, el creador SÍ tiene que ver
-- la lista para elegir. Se resuelve con una RPC `security definer` de proyección acotada
-- —nombre, foto principal, ubicación pública— igual que `perfil_para_responder` (0037).

create or replace function public.interesados_en_equipo(p_equipo_id uuid)
returns table (
  perfil_id uuid,
  nombre text,
  foto_path text,
  ubicacion_publica text,
  aceptado boolean
)
language sql
stable
security definer
set search_path = public
as $$
  select
    i.de_perfil,
    public.nombre_de_perfil(i.de_perfil),
    (select f.storage_path from fotos_talento f where f.talento_id = i.de_perfil order by f.orden limit 1),
    coalesce(t.ubicacion_publica, c.ubicacion_publica),
    exists (
      select 1 from intereses_equipo mio
      where mio.de_perfil = auth.uid()
        and mio.a_perfil = i.de_perfil
        and mio.equipo_id = p_equipo_id
        and mio.interesa
    )
  from intereses_equipo i
  left join perfiles_talento t on t.id = i.de_perfil
  left join perfiles_creador c on c.id = i.de_perfil
  where i.a_perfil = auth.uid()
    and i.equipo_id = p_equipo_id
    and i.interesa
    and exists (select 1 from equipos e where e.id = p_equipo_id and e.creador_id = auth.uid())
    and not public.hay_bloqueo(i.de_perfil)
  order by i.creado_en;
$$;

revoke all on function public.interesados_en_equipo(uuid) from public;
grant execute on function public.interesados_en_equipo(uuid) to authenticated;
