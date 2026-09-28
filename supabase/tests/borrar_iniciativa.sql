-- Eliminar un Proyecto o un Equipo libera a sus Talentos (issue #215, migración 0083).
-- Se corre entero dentro de begin/rollback: no deja rastro.
--   supabase/tests/run.sh borrar_iniciativa.sql
--
-- Para cada iniciativa: el Talento tiene interés mutuo (→ match), está en la sala y hay un
-- mensaje. Mientras la iniciativa existe, `buscar_talento` del Creador no lo muestra (0058);
-- al borrarla vuelve a aparecer, y la sala se va con ella — también la de un Equipo, que
-- antes quedaba huérfana (`salas.equipo_id on delete set null`).

begin;

create temp table ctx (k text primary key, v uuid);
grant select on ctx to authenticated;
insert into ctx (k, v) values
  ('ce', '81111111-1111-1111-1111-11111111aaaa'),   -- creador con Equipo
  ('co', '82222222-2222-2222-2222-22222222bbbb'),   -- creador con Proyecto
  ('t',  '83333333-3333-3333-3333-33333333cccc'),   -- talento convocado por los dos
  ('equipo', 'eeeeeeee-0000-0000-0000-00000000eeee'),
  ('obra',   'ffffffff-0000-0000-0000-00000000ffff'),
  ('sala_e', 'eeeeeeee-1111-0000-0000-00000000eeee'),
  ('sala_o', 'ffffffff-1111-0000-0000-00000000ffff');

insert into auth.users (id, email, aud, role) values
  ((select v from ctx where k='ce'), 'bi-ce@test.local', 'authenticated', 'authenticated'),
  ((select v from ctx where k='co'), 'bi-co@test.local', 'authenticated', 'authenticated'),
  ((select v from ctx where k='t'),  'bi-t@test.local',  'authenticated', 'authenticated');
insert into perfiles_creador (id) values ((select v from ctx where k='ce')), ((select v from ctx where k='co'));
insert into perfiles_talento (id, nombre, fecha_nacimiento, ubicacion_texto, ubicacion_lat, ubicacion_lng, ubicacion_pais, genero)
  values ((select v from ctx where k='t'), 'Talento BI', '1995-01-01', 'x', 0, 0, 'AR', 'sin_especificar');
-- `buscar_talento` solo muestra talentos con al menos una foto.
insert into fotos_talento (talento_id, storage_path, orden)
  values ((select v from ctx where k='t'), (select v from ctx where k='t') || '/f.jpg', 0);

insert into equipos (id, creador_id, titulo, cupo)
  values ((select v from ctx where k='equipo'), (select v from ctx where k='ce'), 'Equipo BI', 3);
insert into obras (id, creador_id, titulo, ubicacion_texto, ubicacion_lat, ubicacion_lng, ubicacion_pais)
  values ((select v from ctx where k='obra'), (select v from ctx where k='co'), 'Obra BI', 'x', 0, 0, 'AR');

-- Interés mutuo en cada iniciativa (el trigger de 0054 arma el match), más sala y mensaje.
insert into intereses_match (de_perfil, a_perfil, equipo_id, interesa) values
  ((select v from ctx where k='ce'), (select v from ctx where k='t'), (select v from ctx where k='equipo'), true),
  ((select v from ctx where k='t'), (select v from ctx where k='ce'), (select v from ctx where k='equipo'), true);
insert into intereses_match (de_perfil, a_perfil, obra_id, interesa) values
  ((select v from ctx where k='co'), (select v from ctx where k='t'), (select v from ctx where k='obra'), true),
  ((select v from ctx where k='t'), (select v from ctx where k='co'), (select v from ctx where k='obra'), true);
insert into salas (id, equipo_id) values ((select v from ctx where k='sala_e'), (select v from ctx where k='equipo'));
insert into salas (id, obra_id) values ((select v from ctx where k='sala_o'), (select v from ctx where k='obra'));
insert into sala_integrantes (sala_id, perfil_id) values
  ((select v from ctx where k='sala_e'), (select v from ctx where k='ce')),
  ((select v from ctx where k='sala_e'), (select v from ctx where k='t')),
  ((select v from ctx where k='sala_o'), (select v from ctx where k='co')),
  ((select v from ctx where k='sala_o'), (select v from ctx where k='t'));
insert into mensajes (sala_id, autor_id, contenido) values
  ((select v from ctx where k='sala_e'), (select v from ctx where k='t'), 'hola equipo'),
  ((select v from ctx where k='sala_o'), (select v from ctx where k='t'), 'hola proyecto');

do $$ begin
  assert (select count(*) from matches where talento_id = (select v from ctx where k='t')) = 2,
    'setup: el interés mutuo debería haber armado un match por iniciativa';
end $$;

-- ── T1 · mientras el Equipo existe, su Creador no ve al Talento en Buscar Talentos ──
set local role authenticated;
set local request.jwt.claims = '{"sub":"81111111-1111-1111-1111-11111111aaaa"}';
create temp table t1 as select id from public.buscar_talento(p_limite => 1000);
reset role;
do $$ begin
  assert not exists (select 1 from t1 where id = (select v from ctx where k='t')),
    'T1: con el Equipo vivo, el Talento no debería aparecer para su Creador';
end $$;

-- ── T2 · otro Creador no puede borrar el Equipo ajeno (RLS equipos_baja) ──────────
set local role authenticated;
set local request.jwt.claims = '{"sub":"82222222-2222-2222-2222-22222222bbbb"}';
delete from equipos where id = (select v from ctx where k='equipo');
reset role;
do $$ begin
  assert (select count(*) from equipos where id = (select v from ctx where k='equipo')) = 1,
    'T2: un Creador no debería poder borrar el Equipo de otro';
end $$;

-- ── T3 · su Creador lo borra: sala, mensajes, match e intereses se van ─────────────
set local role authenticated;
set local request.jwt.claims = '{"sub":"81111111-1111-1111-1111-11111111aaaa"}';
delete from equipos where id = (select v from ctx where k='equipo');
create temp table t3 as select id from public.buscar_talento(p_limite => 1000);
reset role;
do $$ begin
  assert (select count(*) from equipos where id = (select v from ctx where k='equipo')) = 0,
    'T3: el Creador debería poder borrar su Equipo';
  assert (select count(*) from salas where id = (select v from ctx where k='sala_e')) = 0,
    'T3: la sala del Equipo debería borrarse con él (0083), no quedar huérfana';
  assert (select count(*) from mensajes where sala_id = (select v from ctx where k='sala_e')) = 0,
    'T3: los mensajes de la sala del Equipo deberían borrarse';
  assert (select count(*) from matches where talento_id = (select v from ctx where k='t') and equipo_id is not null) = 0,
    'T3: el match del Equipo debería borrarse';
  assert exists (select 1 from t3 where id = (select v from ctx where k='t')),
    'T3: borrado el Equipo, el Talento debería volver a Buscar Talentos';
end $$;

-- ── T4 · el Proyecto de otro Creador no se toca ────────────────────────────────────
do $$ begin
  assert (select count(*) from salas where id = (select v from ctx where k='sala_o')) = 1,
    'T4: borrar el Equipo no debería tocar la sala de otra iniciativa';
  assert (select count(*) from matches where talento_id = (select v from ctx where k='t') and obra_id is not null) = 1,
    'T4: borrar el Equipo no debería tocar el match de otra iniciativa';
  assert (select count(*) from perfiles_talento where id = (select v from ctx where k='t')) = 1,
    'T4: borrar una iniciativa no debería tocar el perfil del Talento';
end $$;

-- ── T5 · lo mismo al borrar un Proyecto ────────────────────────────────────────────
set local role authenticated;
set local request.jwt.claims = '{"sub":"82222222-2222-2222-2222-22222222bbbb"}';
create temp table t5a as select id from public.buscar_talento(p_limite => 1000);
delete from obras where id = (select v from ctx where k='obra');
create temp table t5b as select id from public.buscar_talento(p_limite => 1000);
reset role;
do $$ begin
  assert not exists (select 1 from t5a where id = (select v from ctx where k='t')),
    'T5: con el Proyecto vivo, el Talento no debería aparecer para su Creador';
  assert (select count(*) from salas where id = (select v from ctx where k='sala_o')) = 0,
    'T5: la sala del Proyecto debería borrarse con él';
  assert exists (select 1 from t5b where id = (select v from ctx where k='t')),
    'T5: borrado el Proyecto, el Talento debería volver a Buscar Talentos';
end $$;

select 'TODOS LOS TESTS OK' as resultado;

rollback;
