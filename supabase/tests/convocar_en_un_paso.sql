-- Convocar en un paso, sin «aceptar el match» (#287, 0098).
-- Se corre entero dentro de begin/rollback: no deja rastro.
--   supabase/tests/run.sh convocar_en_un_paso.sql
--
-- Con interés mutuo hay match; el Creador convoca directo (sin aceptar_match antes): el match
-- queda aceptado, el Talento queda convocado y le llega el aviso. Un match vencido o
-- descartado no se puede convocar.

begin;

create temp table ctx (k text primary key, v uuid);
grant select on ctx to authenticated;
insert into ctx (k, v) values
  ('c', 'e1111111-1111-1111-1111-11111111eeee'),
  ('t', 'e2222222-2222-2222-2222-22222222eeee'),
  ('v', 'e3333333-3333-3333-3333-33333333eeee'),
  ('obra', 'e4444444-4444-4444-4444-44444444eeee');

insert into auth.users (id, email, aud, role) values
  ((select v from ctx where k='c'), 'cup-c@test.local', 'authenticated', 'authenticated'),
  ((select v from ctx where k='t'), 'cup-t@test.local', 'authenticated', 'authenticated'),
  ((select v from ctx where k='v'), 'cup-v@test.local', 'authenticated', 'authenticated');
insert into perfiles_creador (id) values ((select v from ctx where k='c'));
insert into perfiles_talento (id, nombre, fecha_nacimiento, ubicacion_texto, ubicacion_lat, ubicacion_lng, ubicacion_pais, genero) values
  ((select v from ctx where k='c'), 'Creadora CUP', '1985-01-01', 'x', 0, 0, 'AR', 'sin_especificar'),
  ((select v from ctx where k='t'), 'Talento CUP', '1990-01-01', 'x', 0, 0, 'AR', 'sin_especificar'),
  ((select v from ctx where k='v'), 'Vencido CUP', '1990-01-01', 'x', 0, 0, 'AR', 'sin_especificar');
insert into obras (id, creador_id, titulo, ubicacion_texto, ubicacion_lat, ubicacion_lng, ubicacion_pais, estado)
  values ((select v from ctx where k='obra'), (select v from ctx where k='c'), 'Obra CUP', 'x', 0, 0, 'AR', 'publicada');
insert into roles (obra_id, nombre, tipo, vacantes) values ((select v from ctx where k='obra'), 'Rol CUP', 'actuacion', 2);
insert into ctx (k, v) select 'rol', id from roles where obra_id = (select v from ctx where k='obra');

-- Interés mutuo con T y con V → dos matches.
insert into intereses_match (de_perfil, a_perfil, obra_id, interesa) values
  ((select v from ctx where k='t'), (select v from ctx where k='c'), (select v from ctx where k='obra'), true),
  ((select v from ctx where k='c'), (select v from ctx where k='t'), (select v from ctx where k='obra'), true),
  ((select v from ctx where k='v'), (select v from ctx where k='c'), (select v from ctx where k='obra'), true),
  ((select v from ctx where k='c'), (select v from ctx where k='v'), (select v from ctx where k='obra'), true);
insert into ctx (k, v) select 'match_t', id from matches where talento_id = (select v from ctx where k='t');
insert into ctx (k, v) select 'match_v', id from matches where talento_id = (select v from ctx where k='v');
-- El de V venció.
update matches set expira_en = now() - interval '1 day' where id = (select v from ctx where k='match_v');

-- ── T1 · convocar sin aceptar antes: queda aceptado y convocado ─────────────
set local role authenticated;
set local request.jwt.claims = '{"sub":"e1111111-1111-1111-1111-11111111eeee"}';
select public.convocar((select v from ctx where k='match_t'), (select v from ctx where k='rol'));
reset role;
do $$ begin
  if (select aceptado_en from matches where id = (select v from ctx where k='match_t')) is null then
    raise exception 'T1: convocar tendría que dejar el match aceptado';
  end if;
  if not exists (select 1 from convocatorias where match_id = (select v from ctx where k='match_t') and estado = 'pendiente') then
    raise exception 'T1: tendría que quedar una convocatoria pendiente';
  end if;
  if not exists (select 1 from notificaciones where destinatario_id = (select v from ctx where k='t') and tipo = 'convocado') then
    raise exception 'T1: al Talento le tendría que llegar el aviso de convocatoria';
  end if;
end $$;

-- ── T2 · un match vencido no se convoca ─────────────────────────────────────
set local role authenticated;
set local request.jwt.claims = '{"sub":"e1111111-1111-1111-1111-11111111eeee"}';
do $$ begin
  begin
    perform public.convocar((select v from ctx where k='match_v'), (select v from ctx where k='rol'));
    raise exception 'T2: un match vencido no se tendría que poder convocar';
  exception when others then
    if sqlerrm <> 'el match venció' then raise; end if;
  end;
end $$;
reset role;

-- ── T3 · un match descartado tampoco ────────────────────────────────────────
update matches set expira_en = now() + interval '7 days', descartado_en = now() where id = (select v from ctx where k='match_v');
set local role authenticated;
set local request.jwt.claims = '{"sub":"e1111111-1111-1111-1111-11111111eeee"}';
do $$ begin
  begin
    perform public.convocar((select v from ctx where k='match_v'), (select v from ctx where k='rol'));
    raise exception 'T3: un match descartado no se tendría que poder convocar';
  exception when others then
    if sqlerrm <> 'match descartado' then raise; end if;
  end;
end $$;
reset role;

select 'TODOS LOS TESTS OK' as resultado;

rollback;
