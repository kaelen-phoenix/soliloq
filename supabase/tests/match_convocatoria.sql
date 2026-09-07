-- Test del circuito de match/convocatoria (issues #105-#107, migraciones 0054-0057).
-- Se corre entero dentro de begin/rollback: no deja rastro. Si termina sin error,
-- pasaron todas las aserciones. Los ids nuevos (match, convocatoria, sala) se guardan en
-- un temp table `ctx` (sin RLS) para poder leerlos mientras se actúa como un usuario.

begin;

create temp table ctx (k text primary key, v uuid);
grant select on ctx to authenticated;
insert into ctx (k, v) values
  ('creador', '11111111-1111-1111-1111-111111111111'),
  ('ta',      '22222222-2222-2222-2222-222222222222'),
  ('tb',      '33333333-3333-3333-3333-333333333333'),
  ('obra',    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');

insert into auth.users (id, email, aud, role) values
  ('11111111-1111-1111-1111-111111111111', 'c@test.local',  'authenticated', 'authenticated'),
  ('22222222-2222-2222-2222-222222222222', 'ta@test.local', 'authenticated', 'authenticated'),
  ('33333333-3333-3333-3333-333333333333', 'tb@test.local', 'authenticated', 'authenticated');
update perfiles set modo_activo = 'creador' where id = (select v from ctx where k='creador');
update perfiles set modo_activo = 'talento' where id in ((select v from ctx where k='ta'), (select v from ctx where k='tb'));
insert into perfiles_creador (id, nombre, ubicacion_texto, ubicacion_lat, ubicacion_lng, ubicacion_pais)
  values ((select v from ctx where k='creador'), 'Creador Test', 'x', 0, 0, 'AR');
insert into perfiles_talento (id, nombre, fecha_nacimiento, ubicacion_texto, ubicacion_lat, ubicacion_lng, ubicacion_pais, genero) values
  ((select v from ctx where k='ta'), 'Talento A', '1990-01-01', 'x', 0, 0, 'AR', 'sin_especificar'),
  ((select v from ctx where k='tb'), 'Talento B', '1990-01-01', 'x', 0, 0, 'AR', 'sin_especificar');
insert into obras (id, creador_id, titulo, ubicacion_texto, ubicacion_lat, ubicacion_lng, ubicacion_pais)
  values ((select v from ctx where k='obra'), (select v from ctx where k='creador'), 'Obra Test', 'x', 0, 0, 'AR');
insert into roles (obra_id, nombre, tipo, vacantes)
  values ((select v from ctx where k='obra'), 'Rol', 'actuacion', 1);

-- T1 · talento A marca interés; todavía no hay match
set local role authenticated;
set local request.jwt.claims = '{"sub":"22222222-2222-2222-2222-222222222222"}';
select marcar_interes((select v from ctx where k='creador'), (select v from ctx where k='obra'), null, true);
reset role;
do $$ begin assert (select count(*) from matches) = 0, 'T1: no debería haber match'; end $$;

-- T2 · creador marca interés → se materializa el match
set local role authenticated;
set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111"}';
select marcar_interes((select v from ctx where k='ta'), (select v from ctx where k='obra'), null, true);
reset role;
insert into ctx (k, v) select 'match', id from matches where talento_id = (select v from ctx where k='ta');
do $$ begin
  assert (select count(*) from matches) = 1, 'T2: 1 match';
  assert (select creador_id = (select v from ctx where k='creador') from matches limit 1), 'T2: creador_id correcto';
  assert (select expira_en > now() + interval '6 days' from matches limit 1), 'T2: expira ~7 días';
end $$;

-- T3 · convocar → convocatoria pendiente; no en cierre
set local role authenticated;
set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111"}';
select convocar((select v from ctx where k='match'));
reset role;
insert into ctx (k, v) select 'conv', id from convocatorias limit 1;
do $$ begin
  assert (select count(*) from convocatorias where estado = 'pendiente') = 1, 'T3: 1 pendiente';
  assert not iniciativa_en_cierre((select v from ctx where k='obra'), null), 'T3: no en cierre';
end $$;

-- T4 · talento A acepta → entra a la sala; ahora en cierre (cupo 1)
set local role authenticated;
set local request.jwt.claims = '{"sub":"22222222-2222-2222-2222-222222222222"}';
select responder_convocatoria((select v from ctx where k='conv'), true);
reset role;
do $$ begin
  assert (select count(*) from sala_integrantes si join salas s on s.id = si.sala_id
          where s.obra_id = (select v from ctx where k='obra')) = 2, 'T4: sala con 2';
  assert iniciativa_en_cierre((select v from ctx where k='obra'), null), 'T4: en cierre';
end $$;

-- T5 · con cupo lleno, convocar a otro rebota
set local role authenticated;
set local request.jwt.claims = '{"sub":"33333333-3333-3333-3333-333333333333"}';
select marcar_interes((select v from ctx where k='creador'), (select v from ctx where k='obra'), null, true);
set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111"}';
select marcar_interes((select v from ctx where k='tb'), (select v from ctx where k='obra'), null, true);
reset role;
insert into ctx (k, v) select 'match_b', id from matches where talento_id = (select v from ctx where k='tb');
do $$ begin
  begin
    perform convocar((select v from ctx where k='match_b'));
    assert false, 'T5: convocar debería rebotar por cupo_lleno';
  exception when others then
    assert sqlerrm like '%cupo_lleno%', 'T5: error inesperado: ' || sqlerrm;
  end;
end $$;

-- T6 · RLS de intereses_match — B solo ve lo suyo
set local role authenticated;
set local request.jwt.claims = '{"sub":"33333333-3333-3333-3333-333333333333"}';
do $$ begin
  assert (select count(*) from intereses_match) = 1, 'T6: B ve solo su fila';
  assert (select bool_and(de_perfil = (select v from ctx where k='tb')) from intereses_match), 'T6: sin filas ajenas';
end $$;
reset role;

-- T7 · dar de baja al convocado → libera cupo
set local role authenticated;
set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111"}';
select dar_de_baja_convocado((select v from ctx where k='conv'));
reset role;
do $$ begin
  assert (select estado from convocatorias where id = (select v from ctx where k='conv')) = 'baja', 'T7: en baja';
  assert not iniciativa_en_cierre((select v from ctx where k='obra'), null), 'T7: cupo liberado';
  assert (select count(*) from sala_integrantes si join salas s on s.id = si.sala_id
          where s.obra_id = (select v from ctx where k='obra') and si.perfil_id = (select v from ctx where k='ta')) = 0,
         'T7: talento A salió de la sala';
end $$;

-- T8 · rate limit 20/24h para el talento
insert into auth.users (id, email, aud, role)
select gen_random_uuid(), 'dummy' || g || '@test.local', 'authenticated', 'authenticated'
from generate_series(1, 19) g;
insert into intereses_match (de_perfil, a_perfil, obra_id, interesa, creado_en)
select (select v from ctx where k='ta'), u.id, (select v from ctx where k='obra'), true, now()
from auth.users u where u.email like 'dummy%@test.local';  -- 19 + la de T1 = 20
set local role authenticated;
set local request.jwt.claims = '{"sub":"22222222-2222-2222-2222-222222222222"}';
do $$ begin
  begin
    perform marcar_interes((select v from ctx where k='tb'), (select v from ctx where k='obra'), null, true);
    assert false, 'T8: el "Me interesa" #21 debería rebotar';
  exception when others then
    assert sqlerrm like '%limite_me_interesa%', 'T8: error inesperado: ' || sqlerrm;
  end;
end $$;
reset role;

-- T9 · desvincularme_de_sala — el dueño no puede; un integrante sí
set local role authenticated;
set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111"}';
select convocar((select v from ctx where k='match_b'));
reset role;
insert into ctx (k, v) select 'conv_b', id from convocatorias where estado = 'pendiente' limit 1;
set local role authenticated;
set local request.jwt.claims = '{"sub":"33333333-3333-3333-3333-333333333333"}';
select responder_convocatoria((select v from ctx where k='conv_b'), true);
reset role;
insert into ctx (k, v) select 'sala', id from salas where obra_id = (select v from ctx where k='obra');
set local role authenticated;
set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111"}';
do $$ begin
  begin
    perform desvincularme_de_sala((select v from ctx where k='sala'));
    assert false, 'T9: el dueño no debería poder desvincularse';
  exception when others then
    assert position('due' in sqlerrm) > 0, 'T9: error inesperado: ' || sqlerrm;
  end;
end $$;
set local request.jwt.claims = '{"sub":"33333333-3333-3333-3333-333333333333"}';
select desvincularme_de_sala((select v from ctx where k='sala'));
reset role;
do $$ begin
  assert (select count(*) from sala_integrantes
          where sala_id = (select v from ctx where k='sala') and perfil_id = (select v from ctx where k='tb')) = 0,
         'T9: talento B salió de la sala';
end $$;

select 'TODOS LOS TESTS OK' as resultado;

rollback;
