-- Buscar talento por iniciativa (issue #372, migración 0108): una decisión tomada para un
-- Proyecto no excluye al Talento de la búsqueda para otro Proyecto o Equipo del mismo Creador.
-- Se corre entero dentro de begin/rollback: no deja rastro.
--   supabase/tests/run.sh buscar_por_iniciativa.sql

begin;

create temp table ctx (k text primary key, v uuid);
grant select on ctx to authenticated;
insert into ctx (k, v) values
  ('c',  '91111111-1111-1111-1111-11111111aaaa'),   -- creador
  ('t',  '93333333-3333-3333-3333-33333333cccc'),   -- talento
  ('a',  'a1111111-0000-0000-0000-00000000aaaa'),   -- proyecto anterior
  ('b',  'b1111111-0000-0000-0000-00000000bbbb'),   -- proyecto nuevo
  ('e',  'e1111111-0000-0000-0000-00000000eeee'),   -- equipo nuevo
  ('sb', 'b2222222-0000-0000-0000-00000000bbbb');   -- sala del proyecto nuevo

insert into auth.users (id, email, aud, role) values
  ((select v from ctx where k='c'), 'bpi-c@test.local', 'authenticated', 'authenticated'),
  ((select v from ctx where k='t'), 'bpi-t@test.local', 'authenticated', 'authenticated');
insert into perfiles_creador (id) values ((select v from ctx where k='c'));
insert into perfiles_talento (id, nombre, fecha_nacimiento, ubicacion_texto, ubicacion_lat, ubicacion_lng, ubicacion_pais, genero)
  values ((select v from ctx where k='t'), 'Talento BPI', '1995-01-01', 'x', 0, 0, 'AR', 'sin_especificar');
insert into fotos_talento (talento_id, storage_path, orden)
  values ((select v from ctx where k='t'), (select v from ctx where k='t') || '/f.jpg', 0);
insert into obras (id, creador_id, titulo, ubicacion_texto, ubicacion_lat, ubicacion_lng, ubicacion_pais) values
  ((select v from ctx where k='a'), (select v from ctx where k='c'), 'Proyecto A', 'x', 0, 0, 'AR'),
  ((select v from ctx where k='b'), (select v from ctx where k='c'), 'Proyecto B', 'x', 0, 0, 'AR');
insert into equipos (id, creador_id, titulo) values
  ((select v from ctx where k='e'), (select v from ctx where k='c'), 'Equipo E');

-- El Creador descartó al Talento para el Proyecto A.
insert into intereses_match (de_perfil, a_perfil, obra_id, interesa)
  values ((select v from ctx where k='c'), (select v from ctx where k='t'), (select v from ctx where k='a'), false);

set local role authenticated;
set local request.jwt.claims = '{"sub":"91111111-1111-1111-1111-11111111aaaa"}';
create temp table r_a as select id from public.buscar_talento(p_limite => 1000, p_obra_id => 'a1111111-0000-0000-0000-00000000aaaa');
create temp table r_b as select id from public.buscar_talento(p_limite => 1000, p_obra_id => 'b1111111-0000-0000-0000-00000000bbbb');
create temp table r_e as select id from public.buscar_talento(p_limite => 1000, p_equipo_id => 'e1111111-0000-0000-0000-00000000eeee');
create temp table r_sin as select id from public.buscar_talento(p_limite => 1000);
reset role;

do $$ begin
  assert not exists (select 1 from r_a where id = (select v from ctx where k='t')),
    'T1: descartado para A, no debería volver a aparecer buscando para A';
  assert exists (select 1 from r_b where id = (select v from ctx where k='t')),
    'T2: descartado para A, debería aparecer buscando para otro Proyecto (B)';
  assert exists (select 1 from r_e where id = (select v from ctx where k='t')),
    'T3: descartado para A, debería aparecer buscando para un Equipo';
  assert not exists (select 1 from r_sin where id = (select v from ctx where k='t')),
    'T4: sin iniciativa se mantiene el comportamiento anterior (excluye)';
end $$;

-- Si ya está en la sala del Proyecto B, buscando para B no se lo vuelve a ofrecer…
insert into salas (id, obra_id) values ((select v from ctx where k='sb'), (select v from ctx where k='b'));
insert into sala_integrantes (sala_id, perfil_id) values ((select v from ctx where k='sb'), (select v from ctx where k='t'));

set local role authenticated;
set local request.jwt.claims = '{"sub":"91111111-1111-1111-1111-11111111aaaa"}';
create temp table r_b2 as select id from public.buscar_talento(p_limite => 1000, p_obra_id => 'b1111111-0000-0000-0000-00000000bbbb');
create temp table r_e2 as select id from public.buscar_talento(p_limite => 1000, p_equipo_id => 'e1111111-0000-0000-0000-00000000eeee');
reset role;

do $$ begin
  assert not exists (select 1 from r_b2 where id = (select v from ctx where k='t')),
    'T5: ya en la sala de B, no debería ofrecerse buscando para B';
  assert exists (select 1 from r_e2 where id = (select v from ctx where k='t')),
    'T6: estar en otro Proyecto del Creador no impide aparecer para el Equipo';
end $$;

-- …y si deja de formar parte, vuelve a aparecer.
delete from sala_integrantes
  where sala_id = (select v from ctx where k='sb') and perfil_id = (select v from ctx where k='t');

set local role authenticated;
set local request.jwt.claims = '{"sub":"91111111-1111-1111-1111-11111111aaaa"}';
create temp table r_b3 as select id from public.buscar_talento(p_limite => 1000, p_obra_id => 'b1111111-0000-0000-0000-00000000bbbb');
reset role;

do $$ begin
  assert exists (select 1 from r_b3 where id = (select v from ctx where k='t')),
    'T7: al dejar la sala de B, debería volver a aparecer buscando para B';
end $$;

-- ── Otro Creador no puede usar una iniciativa ajena (0109): no recibe filas ─────
-- Si no, comparando resultados podría deducir quién está en la sala privada de B.
insert into auth.users (id, email, aud, role)
  values ('92222222-2222-2222-2222-22222222bbbb', 'bpi-otro@test.local', 'authenticated', 'authenticated');
insert into perfiles_creador (id) values ('92222222-2222-2222-2222-22222222bbbb');

set local role authenticated;
set local request.jwt.claims = '{"sub":"92222222-2222-2222-2222-22222222bbbb"}';
create temp table r_ajena as select id from public.buscar_talento(p_limite => 1000, p_obra_id => 'b1111111-0000-0000-0000-00000000bbbb');
create temp table r_otro_sin as select id from public.buscar_talento(p_limite => 1000);
reset role;

do $$ begin
  assert (select count(*) from r_ajena) = 0,
    'T8: con el Proyecto de otro Creador, buscar_talento no debería devolver nada';
  assert exists (select 1 from r_otro_sin where id = (select v from ctx where k='t')),
    'T8: sin iniciativa, el otro Creador sí ve al Talento (no hay decisiones suyas)';
end $$;

select 'TODOS LOS TESTS OK' as resultado;

rollback;
