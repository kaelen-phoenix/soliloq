-- Sin límites de Proyecto y Equipo (#330, 0101). Se corre entero dentro de begin/rollback.
--   supabase/tests/run.sh sin_limites.sql

begin;

insert into auth.users (id, email, aud, role) values
  ('b1111111-1111-1111-1111-11111111bbbb', 'sl-c@test.local', 'authenticated', 'authenticated');

-- ── T1 · Proyecto publicado + dos Equipos activos a la vez ──────────────────
insert into obras (id, creador_id, titulo, ubicacion_texto, ubicacion_lat, ubicacion_lng, ubicacion_pais, estado)
  values ('b2222222-2222-2222-2222-22222222bbbb', 'b1111111-1111-1111-1111-11111111bbbb', 'Obra SL', 'x', 0, 0, 'AR', 'publicada');
insert into equipos (id, creador_id, titulo, cupo) values
  ('b3333333-3333-3333-3333-33333333bbbb', 'b1111111-1111-1111-1111-11111111bbbb', 'Equipo SL 1', 3),
  ('b4444444-4444-4444-4444-44444444bbbb', 'b1111111-1111-1111-1111-11111111bbbb', 'Equipo SL 2', null);
do $$ begin
  if (select count(*) from equipos where creador_id = 'b1111111-1111-1111-1111-11111111bbbb' and activo) <> 2 then
    raise exception 'T1: tendría que haber dos equipos activos';
  end if;
end $$;

-- ── T2 · más de 10 roles ─────────────────────────────────────────────────────
insert into roles (obra_id, nombre, tipo, vacantes)
  select 'b2222222-2222-2222-2222-22222222bbbb', 'Rol ' || i, 'actuacion', 1 from generate_series(1, 12) i;
do $$ begin
  if (select count(*) from roles where obra_id = 'b2222222-2222-2222-2222-22222222bbbb') <> 12 then
    raise exception 'T2: tendría que admitir 12 roles';
  end if;
  if public.cupo_iniciativa('b2222222-2222-2222-2222-22222222bbbb', null) <> 12 then
    raise exception 'T2: el cupo del proyecto ya no se corta en 10';
  end if;
end $$;

-- ── T3 · un Equipo sin cupo nunca está «en cierre» ──────────────────────────
do $$ begin
  if public.iniciativa_en_cierre(null, 'b4444444-4444-4444-4444-44444444bbbb') is distinct from false then
    raise exception 'T3: un equipo sin cupo no puede quedar en cierre (ni en null)';
  end if;
end $$;

-- ── T4 · el cupo, si se pone, es positivo ───────────────────────────────────
do $$ begin
  begin
    update equipos set cupo = 0 where id = 'b3333333-3333-3333-3333-33333333bbbb';
    raise exception 'T4: cupo 0 no tendría que pasar';
  exception when check_violation then null;
  end;
end $$;

select 'TODOS LOS TESTS OK' as resultado;

rollback;
