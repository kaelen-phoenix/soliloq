-- Test del circuito de match/convocatoria (issues #105-#107, #131, #143, #152;
-- migraciones 0054-0064). Se corre entero dentro de begin/rollback: no deja rastro. Si
-- termina sin error, pasaron todas las aserciones. Los ids nuevos (match, convocatoria,
-- sala) se guardan en un temp table `ctx` (sin RLS) para poder leerlos mientras se actúa
-- como un usuario. Los conteos van siempre acotados a las filas de este fixture — la base
-- tiene datos reales de producción, así que un `count(*)` sin `where` puede fallar por
-- actividad ajena al test.

begin;

create temp table ctx (k text primary key, v uuid);
grant select on ctx to authenticated;
insert into ctx (k, v) values
  ('creador', '11111111-1111-1111-1111-111111111111'),
  ('ta',      '22222222-2222-2222-2222-222222222222'),
  ('tb',      '33333333-3333-3333-3333-333333333333'),
  ('tc',      '44444444-4444-4444-4444-444444444444'),
  ('obra',    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');

insert into auth.users (id, email, aud, role) values
  ('11111111-1111-1111-1111-111111111111', 'c@test.local',  'authenticated', 'authenticated'),
  ('22222222-2222-2222-2222-222222222222', 'ta@test.local', 'authenticated', 'authenticated'),
  ('33333333-3333-3333-3333-333333333333', 'tb@test.local', 'authenticated', 'authenticated'),
  ('44444444-4444-4444-4444-444444444444', 'tc@test.local', 'authenticated', 'authenticated');
update perfiles set modo_activo = 'creador' where id = (select v from ctx where k='creador');
update perfiles set modo_activo = 'talento' where id in
  ((select v from ctx where k='ta'), (select v from ctx where k='tb'), (select v from ctx where k='tc'));
insert into perfiles_creador (id, nombre, ubicacion_texto, ubicacion_lat, ubicacion_lng, ubicacion_pais)
  values ((select v from ctx where k='creador'), 'Creador Test', 'x', 0, 0, 'AR');
insert into perfiles_talento (id, nombre, fecha_nacimiento, ubicacion_texto, ubicacion_lat, ubicacion_lng, ubicacion_pais, genero) values
  ((select v from ctx where k='ta'), 'Talento A', '1990-01-01', 'x', 0, 0, 'AR', 'sin_especificar'),
  ((select v from ctx where k='tb'), 'Talento B', '1990-01-01', 'x', 0, 0, 'AR', 'sin_especificar'),
  ((select v from ctx where k='tc'), 'Talento C', '1990-01-01', 'x', 0, 0, 'AR', 'sin_especificar');
insert into obras (id, creador_id, titulo, ubicacion_texto, ubicacion_lat, ubicacion_lng, ubicacion_pais)
  values ((select v from ctx where k='obra'), (select v from ctx where k='creador'), 'Obra Test', 'x', 0, 0, 'AR');
insert into roles (obra_id, nombre, tipo, vacantes)
  values ((select v from ctx where k='obra'), 'Rol', 'actuacion', 1);
insert into ctx (k, v) select 'rol', id from roles where obra_id = (select v from ctx where k='obra');

-- T1 · talento A marca interés; todavía no hay match
set local role authenticated;
set local request.jwt.claims = '{"sub":"22222222-2222-2222-2222-222222222222"}';
select marcar_interes((select v from ctx where k='creador'), (select v from ctx where k='obra'), null, true);
reset role;
do $$ begin
  assert (select count(*) from matches where talento_id = '22222222-2222-2222-2222-222222222222') = 0,
         'T1: no debería haber match';
end $$;

-- T2 · creador marca interés → se materializa el match
set local role authenticated;
set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111"}';
select marcar_interes((select v from ctx where k='ta'), (select v from ctx where k='obra'), null, true);
reset role;
insert into ctx (k, v) select 'match', id from matches where talento_id = (select v from ctx where k='ta');
do $$ begin
  assert (select count(*) from matches where talento_id = (select v from ctx where k='ta')) = 1, 'T2: 1 match';
  assert (select creador_id = (select v from ctx where k='creador') from matches
          where id = (select v from ctx where k='match')), 'T2: creador_id correcto';
  assert (select expira_en > now() + interval '6 days' from matches
          where id = (select v from ctx where k='match')), 'T2: expira ~7 días';
end $$;

-- T3 · el Creador acepta el Match → pasa a Convocados (sin sala, ocupa cupo, sin notif) — #143
set local role authenticated;
set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111"}';
select aceptar_match((select v from ctx where k='match'));
reset role;
do $$ begin
  assert (select aceptado_en is not null from matches where id = (select v from ctx where k='match')), 'T3: match aceptado';
  assert iniciativa_en_cierre((select v from ctx where k='obra'), null), 'T3: ocupa cupo desde Convocados';
  assert (select count(*) from salas where obra_id = (select v from ctx where k='obra')) = 0, 'T3: todavía sin sala';
  assert (select count(*) from notificaciones where destinatario_id = (select v from ctx where k='ta')) = 0, 'T3: talento no notificado';
end $$;

-- T4 · convocar (definitivo), con rol asociado (#152) → convocatoria pendiente + notificación
set local role authenticated;
set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111"}';
select convocar((select v from ctx where k='match'), (select v from ctx where k='rol'));
reset role;
insert into ctx (k, v) select 'conv', id from convocatorias where match_id = (select v from ctx where k='match');
do $$ begin
  assert (select estado = 'pendiente' and rol_id = (select v from ctx where k='rol') from convocatorias
          where id = (select v from ctx where k='conv')), 'T4: pendiente con el rol elegido';
  assert (select count(*) from notificaciones where destinatario_id = (select v from ctx where k='ta') and tipo = 'convocado') = 1, 'T4: notificó al talento';
  assert (select count(*) from salas where obra_id = (select v from ctx where k='obra')) = 0, 'T4: sin sala hasta que acepte';
end $$;
-- `cobertura_iniciativa` necesita `auth.uid()`: se lee como el Creador, no como postgres.
set local role authenticated;
set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111"}';
do $$ begin
  -- Todavía no aceptó: el rol figura disponible en la cobertura.
  assert (select talento_id is null from cobertura_iniciativa((select v from ctx where k='obra'), null)
          where rol_id = (select v from ctx where k='rol')), 'T4: rol sin ocupante todavía';
end $$;
reset role;

-- T5 · el talento A acepta la convocatoria → entra a la sala y ocupa el rol en la cobertura
set local role authenticated;
set local request.jwt.claims = '{"sub":"22222222-2222-2222-2222-222222222222"}';
select responder_convocatoria((select v from ctx where k='conv'), true);
reset role;
insert into ctx (k, v) select 'sala', id from salas where obra_id = (select v from ctx where k='obra');
do $$ begin
  -- `convocatorias` no tiene policy de select: se lee sin RLS, como acá (postgres).
  assert (select estado from convocatorias where id = (select v from ctx where k='conv')) = 'aceptada', 'T5: aceptada';
  assert (select count(*) from sala_integrantes si join salas s on s.id = si.sala_id
          where s.obra_id = (select v from ctx where k='obra')) = 2, 'T5: sala con 2';
  assert iniciativa_en_cierre((select v from ctx where k='obra'), null), 'T5: en cierre';
end $$;
-- `cobertura_iniciativa` necesita `auth.uid()`: se lee como el Creador.
set local role authenticated;
set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111"}';
do $$ begin
  assert (select talento_nombre from cobertura_iniciativa((select v from ctx where k='obra'), null)
          where rol_id = (select v from ctx where k='rol')) = 'Talento A', 'T5: rol ocupado por Talento A';
end $$;
reset role;

-- T6 · con cupo lleno (de la obra), aceptar_match de otro talento rebota
set local role authenticated;
set local request.jwt.claims = '{"sub":"33333333-3333-3333-3333-333333333333"}';
select marcar_interes((select v from ctx where k='creador'), (select v from ctx where k='obra'), null, true);
set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111"}';
select marcar_interes((select v from ctx where k='tb'), (select v from ctx where k='obra'), null, true);
reset role;
insert into ctx (k, v) select 'match_b', id from matches where talento_id = (select v from ctx where k='tb');
set local role authenticated; set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111"}';
do $$ begin
  begin
    perform aceptar_match((select v from ctx where k='match_b'));
    assert false, 'T6: aceptar_match debería rebotar por cupo_lleno';
  exception when others then
    assert sqlerrm like '%cupo_lleno%', 'T6: error inesperado: ' || sqlerrm;
  end;
end $$;
reset role;

-- T7 · RLS de intereses_match — B solo ve lo suyo
set local role authenticated;
set local request.jwt.claims = '{"sub":"33333333-3333-3333-3333-333333333333"}';
do $$ begin
  assert (select count(*) from intereses_match) = 1, 'T7: B ve solo su fila';
  assert (select bool_and(de_perfil = (select v from ctx where k='tb')) from intereses_match), 'T7: sin filas ajenas';
end $$;
reset role;

-- T8 · el propio talento se desvincula → libera sala, convocatoria y el interés (#152)
set local role authenticated;
set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111"}';
do $$ begin
  begin
    perform desvincularme_de_sala((select v from ctx where k='sala'));
    assert false, 'T8: el dueño no debería poder desvincularse';
  exception when others then
    assert position('due' in sqlerrm) > 0, 'T8: error inesperado: ' || sqlerrm;
  end;
end $$;
set local request.jwt.claims = '{"sub":"22222222-2222-2222-2222-222222222222"}';
select desvincularme_de_sala((select v from ctx where k='sala'));
reset role;
do $$ begin
  assert (select count(*) from sala_integrantes
          where sala_id = (select v from ctx where k='sala') and perfil_id = (select v from ctx where k='ta')) = 0,
         'T8: talento A salió de la sala';
  assert (select estado from convocatorias where id = (select v from ctx where k='conv')) = 'baja',
         'T8: la convocatoria de A queda en baja';
  assert not iniciativa_en_cierre((select v from ctx where k='obra'), null), 'T8: cupo liberado';
  assert (select count(*) from intereses_match
          where (de_perfil = (select v from ctx where k='creador') and a_perfil = (select v from ctx where k='ta'))
             or (de_perfil = (select v from ctx where k='ta') and a_perfil = (select v from ctx where k='creador'))) = 0,
         'T8: A vuelve a estar disponible para el creador';
end $$;
set local role authenticated;
set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111"}';
do $$ begin
  assert (select talento_id is null from cobertura_iniciativa((select v from ctx where k='obra'), null)
          where rol_id = (select v from ctx where k='rol')), 'T8: el rol vuelve a estar disponible';
end $$;
reset role;

-- T9 · dar_de_baja_convocado (el Creador la ejerce, sobre B) → libera lugar y el interés
set local role authenticated;
set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111"}';
select aceptar_match((select v from ctx where k='match_b'));
select convocar((select v from ctx where k='match_b'), (select v from ctx where k='rol'));
reset role;
insert into ctx (k, v) select 'conv_b', id from convocatorias where match_id = (select v from ctx where k='match_b');
set local role authenticated; set local request.jwt.claims = '{"sub":"33333333-3333-3333-3333-333333333333"}';
select responder_convocatoria((select v from ctx where k='conv_b'), true);
reset role;

set local role authenticated; set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111"}';
select dar_de_baja_convocado((select v from ctx where k='conv_b'));
reset role;
do $$ begin
  assert (select estado from convocatorias where id = (select v from ctx where k='conv_b')) = 'baja', 'T9: en baja';
  assert not iniciativa_en_cierre((select v from ctx where k='obra'), null), 'T9: cupo liberado';
  assert (select count(*) from sala_integrantes
          where sala_id = (select v from ctx where k='sala') and perfil_id = (select v from ctx where k='tb')) = 0,
         'T9: talento B salió de la sala';
  assert (select count(*) from intereses_match
          where (de_perfil = (select v from ctx where k='creador') and a_perfil = (select v from ctx where k='tb'))
             or (de_perfil = (select v from ctx where k='tb') and a_perfil = (select v from ctx where k='creador'))) = 0,
         'T9: B vuelve a estar disponible para el creador';
end $$;

-- T10 · descartar_convocado desde Convocados (antes de que el talento acepte)
set local role authenticated;
set local request.jwt.claims = '{"sub":"44444444-4444-4444-4444-444444444444"}';
select marcar_interes((select v from ctx where k='creador'), (select v from ctx where k='obra'), null, true);
set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111"}';
select marcar_interes((select v from ctx where k='tc'), (select v from ctx where k='obra'), null, true);
reset role;
insert into ctx (k, v) select 'match_c', id from matches where talento_id = (select v from ctx where k='tc');
set local role authenticated; set local request.jwt.claims = '{"sub":"11111111-1111-1111-1111-111111111111"}';
select aceptar_match((select v from ctx where k='match_c'));
select descartar_convocado((select v from ctx where k='match_c'));
reset role;
do $$ begin
  assert (select descartado_en is not null from matches where id = (select v from ctx where k='match_c')), 'T10: match_c descartado';
  assert not iniciativa_en_cierre((select v from ctx where k='obra'), null), 'T10: cupo liberado tras descartar';
end $$;

-- Nota: el rol_lleno (dos convocatorias activas para el mismo rol) se verificó a mano en
-- un fixture aparte con dos roles — acá el único rol de la obra coincide con el cupo
-- general, así que no se puede aislar de cupo_lleno (ya cubierto en T6) sin otra obra.

-- T11 · rate limit 20/24h para el talento (deja 20 filas dummy, va al final).
-- El interés original de A hacia el creador (T1) ya no cuenta: T8 lo borró al
-- desvincularse (#152), así que acá hacen falta las 20 completas, no 19.
insert into auth.users (id, email, aud, role)
select gen_random_uuid(), 'dummy' || g || '@test.local', 'authenticated', 'authenticated'
from generate_series(1, 20) g;
insert into intereses_match (de_perfil, a_perfil, obra_id, interesa, creado_en)
select (select v from ctx where k='ta'), u.id, (select v from ctx where k='obra'), true, now()
from auth.users u where u.email like 'dummy%@test.local';
set local role authenticated;
set local request.jwt.claims = '{"sub":"22222222-2222-2222-2222-222222222222"}';
do $$ begin
  begin
    perform marcar_interes((select v from ctx where k='tb'), (select v from ctx where k='obra'), null, true);
    assert false, 'T11: el "Me interesa" #21 debería rebotar';
  exception when others then
    assert sqlerrm like '%limite_me_interesa%', 'T11: error inesperado: ' || sqlerrm;
  end;
end $$;
reset role;

select 'TODOS LOS TESTS OK' as resultado;

rollback;
