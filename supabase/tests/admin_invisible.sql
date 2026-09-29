-- El perfil de un Administrador no se ve en la experiencia de Yalope (#249, 0089).
-- Se corre entero dentro de begin/rollback: no deja rastro.
--   supabase/tests/run.sh admin_invisible.sql
--
-- A es admin (Talento + Creador, en el buscador, buscando equipo, con enlace público, un
-- Proyecto y un Equipo). B es Creador + Talento común. C es Talento común (control: tiene
-- que seguir viéndose). Para B, A no existe en ningún lado; A se ve a sí misma; con una sala
-- compartida B vuelve a verla; y si A deja de ser admin, vuelve a verse.

begin;

create temp table ctx (k text primary key, v uuid);
grant select on ctx to authenticated, anon;
insert into ctx (k, v) values
  ('a', '96666666-6666-6666-6666-66666666aaaa'),
  ('b', '97777777-7777-7777-7777-77777777bbbb'),
  ('c', '98888888-8888-8888-8888-88888888cccc'),
  ('obra', '96666666-0000-0000-0000-00000000aaaa'),
  ('equipo', '96666666-0000-0000-0000-00000000eeee'),
  ('sala', '96666666-0000-0000-0000-00000000dddd');

insert into auth.users (id, email, aud, role) values
  ((select v from ctx where k='a'), 'ai-a@test.local', 'authenticated', 'authenticated'),
  ((select v from ctx where k='b'), 'ai-b@test.local', 'authenticated', 'authenticated'),
  ((select v from ctx where k='c'), 'ai-c@test.local', 'authenticated', 'authenticated');
update perfiles set aprobado_en = now(), busca_equipo = true, enlace_publico_activo = true
where id in ((select v from ctx where k='a'), (select v from ctx where k='b'), (select v from ctx where k='c'));
update perfiles set es_admin = true where id = (select v from ctx where k='a');

insert into perfiles_talento (id, nombre, fecha_nacimiento, ubicacion_texto, ubicacion_publica, ubicacion_lat, ubicacion_lng, ubicacion_pais, genero) values
  ((select v from ctx where k='a'), 'Ada Admin', '1990-01-01', 'x', 'Palermo', -34.58, -58.42, 'AR', 'sin_especificar'),
  ((select v from ctx where k='b'), 'Bruno Comun', '1990-01-01', 'x', 'Caballito', -34.61, -58.44, 'AR', 'sin_especificar'),
  ((select v from ctx where k='c'), 'Carla Comun', '1990-01-01', 'x', 'Almagro', -34.60, -58.42, 'AR', 'sin_especificar');
insert into perfiles_creador (id, disciplinas) values
  ((select v from ctx where k='a'), '{direccion}'),
  ((select v from ctx where k='b'), '{direccion}');
insert into fotos_talento (talento_id, storage_path, orden)
  values ((select v from ctx where k='a'), (select v from ctx where k='a') || '/f.jpg', 0),
         ((select v from ctx where k='c'), (select v from ctx where k='c') || '/f.jpg', 0);
-- El token del enlace de A, guardado antes de cambiar de rol (perfiles solo se lee la fila propia).
insert into ctx (k, v) select 'token_a', enlace_token from perfiles where id = (select v from ctx where k='a');
insert into obras (id, creador_id, titulo, ubicacion_texto, ubicacion_lat, ubicacion_lng, ubicacion_pais, estado)
  values ((select v from ctx where k='obra'), (select v from ctx where k='a'), 'Obra de Ada', 'x', 0, 0, 'AR', 'publicada');

-- ── T1 · para B, A no está en ningún lado (C sí) ─────────────────────────────
set local role authenticated;
set local request.jwt.claims = '{"sub":"97777777-7777-7777-7777-77777777bbbb"}';
create temp table t1_buscar as select id from public.buscar_talento(p_limite => 1000);
create temp table t1_equipo as select perfil_id from public.feed_equipo(null);
do $$
declare
  a uuid := (select v from ctx where k='a');
  c uuid := (select v from ctx where k='c');
begin
  if exists (select 1 from perfiles_talento where id = a) then raise exception 'T1: B ve el Perfil de Talento de A'; end if;
  if exists (select 1 from perfiles_creador where id = a) then raise exception 'T1: B ve el Perfil de Creador de A'; end if;
  if exists (select 1 from fotos_talento where talento_id = a) then raise exception 'T1: B ve las fotos de A'; end if;
  if exists (select 1 from obras where creador_id = a) then raise exception 'T1: B ve el Proyecto de A'; end if;
  if exists (select 1 from t1_buscar where id = a) then raise exception 'T1: A sale en buscar_talento'; end if;
  if exists (select 1 from t1_equipo where perfil_id = a) then raise exception 'T1: A sale en feed_equipo'; end if;
  -- Control: C, común, sí se ve.
  if not exists (select 1 from perfiles_talento where id = c) then raise exception 'T1: B tendría que ver a C'; end if;
  if not exists (select 1 from t1_buscar where id = c) then raise exception 'T1: C tendría que salir en buscar_talento'; end if;
  if not exists (select 1 from t1_equipo where perfil_id = c) then raise exception 'T1: C tendría que salir en feed_equipo'; end if;
end $$;

-- ── T1b · su Equipo tampoco (una iniciativa activa por vez: se cierra el Proyecto) ──
reset role;
update obras set estado = 'cerrada' where id = (select v from ctx where k='obra');
insert into equipos (id, creador_id, titulo, cupo)
  values ((select v from ctx where k='equipo'), (select v from ctx where k='a'), 'Equipo de Ada', 3);
set local role authenticated;
set local request.jwt.claims = '{"sub":"97777777-7777-7777-7777-77777777bbbb"}';
do $$ begin
  if exists (select 1 from equipos where creador_id = (select v from ctx where k='a')) then
    raise exception 'T1b: B ve el Equipo de A';
  end if;
end $$;

-- ── T2 · B no puede marcarle interés ni contactarla ──────────────────────────
do $$
declare
  a uuid := (select v from ctx where k='a');
begin
  begin
    perform public.marcar_interes(a, null, (select v from ctx where k='equipo'), true);
    raise exception 'T2: marcar_interes a una admin tenía que rechazarse';
  exception when others then
    if sqlerrm <> 'no disponible' then raise; end if;
  end;
  begin
    perform public.contactar_desde_perfil((select v from ctx where k='token_a'));
    raise exception 'T2: contactar_desde_perfil a una admin tenía que rechazarse';
  exception when others then
    if sqlerrm <> 'no disponible' then raise; end if;
  end;
  begin
    insert into intereses_equipo (de_perfil, a_perfil, interesa) values (auth.uid(), a, true);
    raise exception 'T2: el insert directo en intereses_equipo tenía que rechazarse';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;

-- ── T3 · el enlace público de A no muestra nada (ni con sesión ni sin) ────────
set local role anon;
set local request.jwt.claims = '{}';
create temp table t3_anon as
  select * from public.perfil_publico((select v from ctx where k='token_a'));
reset role;
do $$ begin
  if exists (select 1 from t3_anon) then raise exception 'T3: el enlace público de A se ve sin sesión'; end if;
end $$;

-- ── T4 · A se sigue viendo a sí misma ───────────────────────────────────────
set local role authenticated;
set local request.jwt.claims = '{"sub":"96666666-6666-6666-6666-66666666aaaa"}';
create temp table t4_publico as
  select * from public.perfil_publico((select v from ctx where k='token_a'));
do $$
declare
  a uuid := (select v from ctx where k='a');
begin
  if not exists (select 1 from perfiles_talento where id = a) then raise exception 'T4: A no ve su Perfil de Talento'; end if;
  if not exists (select 1 from fotos_talento where talento_id = a) then raise exception 'T4: A no ve sus fotos'; end if;
  if not exists (select 1 from obras where creador_id = a) then raise exception 'T4: A no ve su Proyecto'; end if;
  if not exists (select 1 from equipos where creador_id = a) then raise exception 'T4: A no ve su Equipo'; end if;
  if not exists (select 1 from t4_publico) then raise exception 'T4: A no ve su propio enlace público'; end if;
end $$;
reset role;

-- ── T5 · con una sala compartida, B la ve (para no romper chats que ya existen) ──
insert into salas (id, titulo) values ((select v from ctx where k='sala'), 'Sala AI');
insert into sala_integrantes (sala_id, perfil_id) values
  ((select v from ctx where k='sala'), (select v from ctx where k='a')),
  ((select v from ctx where k='sala'), (select v from ctx where k='b'));
set local role authenticated;
set local request.jwt.claims = '{"sub":"97777777-7777-7777-7777-77777777bbbb"}';
do $$ begin
  if not exists (select 1 from perfiles_talento where id = (select v from ctx where k='a')) then
    raise exception 'T5: compartiendo sala, B tendría que ver el perfil de A';
  end if;
end $$;
reset role;
delete from sala_integrantes where sala_id = (select v from ctx where k='sala');

-- ── T6 · si A deja de ser admin, vuelve a verse ─────────────────────────────
update perfiles set es_admin = false where id = (select v from ctx where k='a');
set local role authenticated;
set local request.jwt.claims = '{"sub":"97777777-7777-7777-7777-77777777bbbb"}';
create temp table t6_buscar as select id from public.buscar_talento(p_limite => 1000);
do $$
declare
  a uuid := (select v from ctx where k='a');
begin
  if not exists (select 1 from perfiles_talento where id = a) then raise exception 'T6: sin rol de admin, B tendría que ver a A'; end if;
  if not exists (select 1 from t6_buscar where id = a) then raise exception 'T6: sin rol de admin, A tendría que salir en buscar_talento'; end if;
  if not exists (select 1 from equipos where creador_id = a) then raise exception 'T6: sin rol de admin, el Equipo de A tendría que verse'; end if;
end $$;
reset role;

select 'TODOS LOS TESTS OK' as resultado;

rollback;
