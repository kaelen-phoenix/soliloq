-- Matches para todos (#298, 0099). Se corre entero dentro de begin/rollback: no deja rastro.
--   supabase/tests/run.sh matches_como_talento.sql
--
-- El Talento ve sus matches con estado (match → convocado → en el chat) y puede retirarse de
-- uno mientras no esté en el chat. Nadie se retira del match de otra persona.

begin;

create temp table ctx (k text primary key, v uuid);
grant select on ctx to authenticated;
insert into ctx (k, v) values
  ('c', 'f1111111-1111-1111-1111-11111111ffff'),
  ('t', 'f2222222-2222-2222-2222-22222222ffff'),
  ('x', 'f3333333-3333-3333-3333-33333333ffff'),
  ('obra', 'f4444444-4444-4444-4444-44444444ffff');

insert into auth.users (id, email, aud, role) values
  ((select v from ctx where k='c'), 'mct-c@test.local', 'authenticated', 'authenticated'),
  ((select v from ctx where k='t'), 'mct-t@test.local', 'authenticated', 'authenticated'),
  ((select v from ctx where k='x'), 'mct-x@test.local', 'authenticated', 'authenticated');
insert into perfiles_creador (id) values ((select v from ctx where k='c'));
insert into perfiles_talento (id, nombre, fecha_nacimiento, ubicacion_texto, ubicacion_lat, ubicacion_lng, ubicacion_pais, genero) values
  ((select v from ctx where k='c'), 'Creadora MCT', '1985-01-01', 'x', 0, 0, 'AR', 'sin_especificar'),
  ((select v from ctx where k='t'), 'Talento MCT', '1990-01-01', 'x', 0, 0, 'AR', 'sin_especificar'),
  ((select v from ctx where k='x'), 'Otra MCT', '1990-01-01', 'x', 0, 0, 'AR', 'sin_especificar');
insert into obras (id, creador_id, titulo, ubicacion_texto, ubicacion_lat, ubicacion_lng, ubicacion_pais, estado)
  values ((select v from ctx where k='obra'), (select v from ctx where k='c'), 'Obra MCT', 'x', 0, 0, 'AR', 'publicada');
insert into roles (obra_id, nombre, tipo, vacantes) values ((select v from ctx where k='obra'), 'Rol MCT', 'actuacion', 2);
insert into ctx (k, v) select 'rol', id from roles where obra_id = (select v from ctx where k='obra');

insert into intereses_match (de_perfil, a_perfil, obra_id, interesa) values
  ((select v from ctx where k='t'), (select v from ctx where k='c'), (select v from ctx where k='obra'), true),
  ((select v from ctx where k='c'), (select v from ctx where k='t'), (select v from ctx where k='obra'), true);
insert into ctx (k, v) select 'match', id from matches where talento_id = (select v from ctx where k='t');

-- ── T1 · el Talento ve el match, en estado 'match' ──────────────────────────
set local role authenticated;
set local request.jwt.claims = '{"sub":"f2222222-2222-2222-2222-22222222ffff"}';
do $$ begin
  if (select estado from public.mis_matches_como_talento() where match_id = (select v from ctx where k='match')) is distinct from 'match' then
    raise exception 'T1: el Talento tendría que ver el match en estado match';
  end if;
  if (select iniciativa_titulo from public.mis_matches_como_talento() where match_id = (select v from ctx where k='match')) <> 'Obra MCT' then
    raise exception 'T1: falta el título de la obra';
  end if;
end $$;
reset role;

-- ── T2 · otra persona no lo ve ni se puede retirar por él ───────────────────
set local role authenticated;
set local request.jwt.claims = '{"sub":"f3333333-3333-3333-3333-33333333ffff"}';
do $$ begin
  if exists (select 1 from public.mis_matches_como_talento()) then
    raise exception 'T2: otra cuenta no tendría que ver matches ajenos';
  end if;
  begin
    perform public.retirarme_de_match((select v from ctx where k='match'));
    raise exception 'T2: no se tendría que poder retirar del match de otra persona';
  exception when others then
    if sqlerrm <> 'match no encontrado' then raise; end if;
  end;
end $$;
reset role;

-- ── T3 · convocado: pasa a 'convocado' ──────────────────────────────────────
set local role authenticated;
set local request.jwt.claims = '{"sub":"f1111111-1111-1111-1111-11111111ffff"}';
select public.convocar((select v from ctx where k='match'), (select v from ctx where k='rol'));
reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub":"f2222222-2222-2222-2222-22222222ffff"}';
do $$ begin
  if (select estado from public.mis_matches_como_talento() where match_id = (select v from ctx where k='match')) is distinct from 'convocado' then
    raise exception 'T3: con convocatoria pendiente el estado tendría que ser convocado';
  end if;
end $$;

-- ── T4 · retirarse: deja de verlo, la convocatoria queda rechazada, se borra su interés ──
select public.retirarme_de_match((select v from ctx where k='match'));
do $$ begin
  if exists (select 1 from public.mis_matches_como_talento()) then
    raise exception 'T4: después de retirarse no tendría que verlo más';
  end if;
end $$;
reset role;
do $$ begin
  if (select descartado_en from matches where id = (select v from ctx where k='match')) is null then
    raise exception 'T4: el match tendría que quedar descartado';
  end if;
  if exists (select 1 from convocatorias where match_id = (select v from ctx where k='match') and estado = 'pendiente') then
    raise exception 'T4: la convocatoria pendiente tendría que quedar rechazada';
  end if;
  if exists (select 1 from intereses_match where de_perfil = (select v from ctx where k='t') and obra_id = (select v from ctx where k='obra')) then
    raise exception 'T4: tendría que borrarse su «Me interesa» a esa obra';
  end if;
end $$;

-- ── T5 · ya en el chat: no se retira por acá ────────────────────────────────
update matches set descartado_en = null where id = (select v from ctx where k='match');
update convocatorias set estado = 'aceptada' where match_id = (select v from ctx where k='match');
set local role authenticated;
set local request.jwt.claims = '{"sub":"f2222222-2222-2222-2222-22222222ffff"}';
do $$ begin
  if (select estado from public.mis_matches_como_talento() where match_id = (select v from ctx where k='match')) is distinct from 'en_sala' then
    raise exception 'T5: con la convocatoria aceptada el estado tendría que ser en_sala';
  end if;
  begin
    perform public.retirarme_de_match((select v from ctx where k='match'));
    raise exception 'T5: estando en el chat no se tendría que retirar por acá';
  exception when others then
    if sqlerrm <> 'ya estás en el chat: salí desde ahí' then raise; end if;
  end;
end $$;
reset role;

select 'TODOS LOS TESTS OK' as resultado;

rollback;
