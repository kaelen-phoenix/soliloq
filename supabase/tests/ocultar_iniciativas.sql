-- Ocultar iniciativas cerradas (#413, migración 0115): solo el dueño, solo lo cerrado, y se puede
-- volver a mostrar. begin/rollback: no deja rastro.
--   supabase/tests/run.sh ocultar_iniciativas.sql

begin;

insert into auth.users (id, email, aud, role) values
  ('91515151-1111-1111-1111-111111111111', 'oi-c@test.local', 'authenticated', 'authenticated'),
  ('92525252-2222-2222-2222-222222222222', 'oi-x@test.local', 'authenticated', 'authenticated');
insert into perfiles_creador (id) values ('91515151-1111-1111-1111-111111111111');
insert into obras (id, creador_id, titulo, ubicacion_texto, ubicacion_lat, ubicacion_lng, ubicacion_pais, estado) values
  ('a1515151-0000-0000-0000-00000000aaaa', '91515151-1111-1111-1111-111111111111', 'Cerrada', 'x', 0, 0, 'AR', 'cerrada'),
  ('b1515151-0000-0000-0000-00000000bbbb', '91515151-1111-1111-1111-111111111111', 'Publicada', 'x', 0, 0, 'AR', 'publicada');
insert into equipos (id, creador_id, titulo, activo) values
  ('e1515151-0000-0000-0000-00000000eeee', '91515151-1111-1111-1111-111111111111', 'Equipo cerrado', false),
  ('f1515151-0000-0000-0000-00000000ffff', '91515151-1111-1111-1111-111111111111', 'Equipo activo', true);

-- Otra cuenta no puede ocultar lo ajeno.
set local role authenticated;
set local request.jwt.claims = '{"sub":"92525252-2222-2222-2222-222222222222"}';
do $$ begin
  begin
    perform ocultar_iniciativa('a1515151-0000-0000-0000-00000000aaaa', null, true);
    raise exception 'T1: no debería poder ocultar un proyecto ajeno';
  exception when others then
    if sqlerrm like 'T1:%' then raise; end if;
  end;
end $$;
reset role;

-- El dueño oculta lo cerrado; lo activo no se puede.
set local role authenticated;
set local request.jwt.claims = '{"sub":"91515151-1111-1111-1111-111111111111"}';
select ocultar_iniciativa('a1515151-0000-0000-0000-00000000aaaa', null, true);
select ocultar_iniciativa(null, 'e1515151-0000-0000-0000-00000000eeee', true);
do $$ begin
  begin
    perform ocultar_iniciativa('b1515151-0000-0000-0000-00000000bbbb', null, true);
    raise exception 'T2: no debería poder ocultar un proyecto publicado';
  exception when others then
    if sqlerrm like 'T2:%' then raise; end if;
  end;
  begin
    perform ocultar_iniciativa(null, 'f1515151-0000-0000-0000-00000000ffff', true);
    raise exception 'T3: no debería poder ocultar un equipo activo';
  exception when others then
    if sqlerrm like 'T3:%' then raise; end if;
  end;
end $$;
-- Lee la marca con su sesión (la columna se ve, como el resto).
create temp table vistas as
  select id, oculta_en from obras where creador_id = auth.uid()
  union all select id, oculta_en from equipos where creador_id = auth.uid();
-- Y vuelve a mostrar el equipo.
select ocultar_iniciativa(null, 'e1515151-0000-0000-0000-00000000eeee', false);
reset role;

do $$ begin
  assert (select oculta_en from vistas where id = 'a1515151-0000-0000-0000-00000000aaaa') is not null,
    'T4: el proyecto cerrado debería quedar oculto';
  assert (select oculta_en from vistas where id = 'b1515151-0000-0000-0000-00000000bbbb') is null,
    'T5: el publicado no se oculta';
  assert (select oculta_en from equipos where id = 'e1515151-0000-0000-0000-00000000eeee') is null,
    'T6: «volver a mostrar» debería sacar la marca';
  assert (select count(*) from obras where id = 'a1515151-0000-0000-0000-00000000aaaa') = 1,
    'T7: ocultar no borra nada';
end $$;

select 'TODOS LOS TESTS OK' as resultado;
rollback;
