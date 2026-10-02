-- «Ocultar mi perfil a personas nuevas» (#265, 0090 y 0091).
-- Se corre entero dentro de begin/rollback: no deja rastro.
--   supabase/tests/run.sh ocultar_perfil.sql
--
-- H ocultó su perfil (Talento + Creador, busca equipo, enlace público, un Proyecto
-- publicado). V es igual pero visible (control). X es alguien nuevo (Talento + Creador con
-- su propio Proyecto). S comparte una sala con H.
--   - Para X, H no sale en «Armar equipo», en el buscador ni por su enlace; V sí.
--   - X no la puede contactar (insert, enlace) ni marcarle «Me interesa» como talento, pero
--     sí interesarse en el Proyecto de H.
--   - S (sala compartida) la sigue viendo; H ve su propio enlace.
--   - Si H vuelve a mostrarse, X la ve.
--   - Si H escribe primero, X le puede responder (equipo y match).

begin;

create temp table ctx (k text primary key, v uuid);
grant select on ctx to authenticated, anon;
insert into ctx (k, v) values
  ('h', 'a1111111-1111-1111-1111-11111111aaaa'),
  ('v', 'a2222222-2222-2222-2222-22222222aaaa'),
  ('x', 'a3333333-3333-3333-3333-33333333aaaa'),
  ('s', 'a4444444-4444-4444-4444-44444444aaaa'),
  ('obra_h', 'a1111111-0000-0000-0000-00000000aaaa'),
  ('obra_x', 'a3333333-0000-0000-0000-00000000aaaa'),
  ('sala', 'a4444444-0000-0000-0000-00000000aaaa');

insert into auth.users (id, email, aud, role)
select v, k || '-op@test.local', 'authenticated', 'authenticated' from ctx where k in ('h', 'v', 'x', 's');
update perfiles set aprobado_en = now(), busca_equipo = true, enlace_publico_activo = true
where id in (select v from ctx where k in ('h', 'v', 'x', 's'));

insert into perfiles_talento (id, nombre, fecha_nacimiento, aparece_en_buscador, ubicacion_texto, ubicacion_publica, ubicacion_lat, ubicacion_lng, ubicacion_pais, genero)
select v, initcap(k) || ' Oculto E2E', '1990-01-01', k <> 'h', 'x', 'Palermo', -34.58, -58.42, 'AR', 'sin_especificar'
from ctx where k in ('h', 'v', 'x', 's');
insert into perfiles_creador (id, disciplinas)
select v, '{direccion}' from ctx where k in ('h', 'v', 'x');
insert into fotos_talento (talento_id, storage_path, orden)
select v, v || '/f.jpg', 0 from ctx where k in ('h', 'v');
insert into obras (id, creador_id, titulo, ubicacion_texto, ubicacion_lat, ubicacion_lng, ubicacion_pais, estado) values
  ((select v from ctx where k='obra_h'), (select v from ctx where k='h'), 'Obra de H', 'x', 0, 0, 'AR', 'publicada'),
  ((select v from ctx where k='obra_x'), (select v from ctx where k='x'), 'Obra de X', 'x', 0, 0, 'AR', 'publicada');
insert into salas (id, titulo) values ((select v from ctx where k='sala'), 'Sala H-S');
insert into sala_integrantes (sala_id, perfil_id) values
  ((select v from ctx where k='sala'), (select v from ctx where k='h')),
  ((select v from ctx where k='sala'), (select v from ctx where k='s'));
insert into ctx (k, v) select 'token_h', enlace_token from perfiles where id = (select v from ctx where k='h');

-- ── T1 · para X (nuevo), H no aparece en ningún lado; V sí ──────────────────
set local role authenticated;
set local request.jwt.claims = '{"sub":"a3333333-3333-3333-3333-33333333aaaa"}';
create temp table t1_equipo as select perfil_id from public.feed_equipo(null);
create temp table t1_buscar as select id from public.buscar_talento(p_limite => 1000);
create temp table t1_enlace as select * from public.perfil_publico((select v from ctx where k='token_h'));
reset role;
set local role anon;
set local request.jwt.claims = '{}';
create temp table t1_enlace_anon as select * from public.perfil_publico((select v from ctx where k='token_h'));
reset role;
do $$
declare
  h uuid := (select v from ctx where k='h');
  vv uuid := (select v from ctx where k='v');
begin
  if exists (select 1 from t1_equipo where perfil_id = h) then raise exception 'T1: H sale en «Armar equipo»'; end if;
  if not exists (select 1 from t1_equipo where perfil_id = vv) then raise exception 'T1: V (visible) tendría que salir en «Armar equipo»'; end if;
  if exists (select 1 from t1_buscar where id = h) then raise exception 'T1: H sale en el buscador'; end if;
  if not exists (select 1 from t1_buscar where id = vv) then raise exception 'T1: V (visible) tendría que salir en el buscador'; end if;
  if exists (select 1 from t1_enlace) then raise exception 'T1: el enlace de H muestra el perfil a X'; end if;
  if exists (select 1 from t1_enlace_anon) then raise exception 'T1: el enlace de H muestra el perfil sin sesión'; end if;
end $$;

-- ── T2 · X no la puede contactar ni marcarle interés; sí al Proyecto de H ───
set local role authenticated;
set local request.jwt.claims = '{"sub":"a3333333-3333-3333-3333-33333333aaaa"}';
do $$
declare
  h uuid := (select v from ctx where k='h');
begin
  begin
    insert into intereses_equipo (de_perfil, a_perfil, interesa) values (auth.uid(), h, true);
    raise exception 'T2: el insert de contacto a H tenía que rechazarse';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.contactar_desde_perfil((select v from ctx where k='token_h'));
    raise exception 'T2: contactar_desde_perfil a H tenía que rechazarse';
  exception when insufficient_privilege then null; -- 0097: ya nadie puede contactar
  end;
  begin
    -- X, como Creador de su Proyecto, marcando interés en H como talento.
    perform public.marcar_interes(h, (select v from ctx where k='obra_x'), null, true);
    raise exception 'T2: marcar_interes a H (como talento) tenía que rechazarse';
  exception when others then
    if sqlerrm <> 'no disponible' then raise; end if;
  end;
  -- Interesarse en el Proyecto publicado de H sí: el interés va a la iniciativa.
  perform public.marcar_interes(h, (select v from ctx where k='obra_h'), null, true);
end $$;
reset role;

-- ── T3 · S (sala compartida) la sigue viendo; H ve su propio enlace ────────
set local role authenticated;
set local request.jwt.claims = '{"sub":"a4444444-4444-4444-4444-44444444aaaa"}';
create temp table t3_equipo as select perfil_id from public.feed_equipo(null);
reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub":"a1111111-1111-1111-1111-11111111aaaa"}';
create temp table t3_propio as select * from public.perfil_publico((select v from ctx where k='token_h'));
reset role;
do $$ begin
  if not exists (select 1 from t3_equipo where perfil_id = (select v from ctx where k='h')) then
    raise exception 'T3: S comparte sala con H: tendría que seguir viéndola';
  end if;
  if not exists (select 1 from t3_propio) then raise exception 'T3: H tendría que ver su propio enlace'; end if;
end $$;

-- ── T4 · si H vuelve a mostrarse, X la ve ───────────────────────────────────
update perfiles_talento set aparece_en_buscador = true where id = (select v from ctx where k='h');
set local role authenticated;
set local request.jwt.claims = '{"sub":"a3333333-3333-3333-3333-33333333aaaa"}';
create temp table t4_equipo as select perfil_id from public.feed_equipo(null);
reset role;
do $$ begin
  if not exists (select 1 from t4_equipo where perfil_id = (select v from ctx where k='h')) then
    raise exception 'T4: con el perfil visible, H tendría que salir en «Armar equipo»';
  end if;
end $$;
update perfiles_talento set aparece_en_buscador = false where id = (select v from ctx where k='h');

-- ── T5 · si H marca interés primero (match), X le puede responder ──────────
-- (El contacto 1 a 1 ya no existe desde 0097; el match de Proyecto sí.)
set local role authenticated;
set local request.jwt.claims = '{"sub":"a1111111-1111-1111-1111-11111111aaaa"}';
select public.marcar_interes((select v from ctx where k='x'), (select v from ctx where k='obra_x'), null, true);
reset role;
set local role authenticated;
set local request.jwt.claims = '{"sub":"a3333333-3333-3333-3333-33333333aaaa"}';
select public.marcar_interes((select v from ctx where k='h'), (select v from ctx where k='obra_x'), null, true);
reset role;

select 'TODOS LOS TESTS OK' as resultado;

rollback;
