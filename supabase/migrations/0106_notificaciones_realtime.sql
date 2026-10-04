-- 0106 — Notificaciones en tiempo real (#347).
--
-- La campanita escucha cambios de `notificaciones` por Realtime, pero la tabla no estaba en la
-- publicación (solo `mensajes`): nunca llegaba ningún evento, y el número quedaba con lo que
-- había al cargar la página. Leer una notificación no lo bajaba hasta recargar, y una nueva no
-- aparecía. Realtime respeta las policies: cada sesión recibe solo las suyas.

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'notificaciones'
  ) then
    alter publication supabase_realtime add table public.notificaciones;
  end if;
end $$;
