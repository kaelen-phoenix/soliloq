-- Aceptación de las Normas de la Comunidad (0079, issue #180).
-- Se corre entero dentro de begin/rollback: no deja rastro.
--   supabase/tests/run.sh normas_comunidad.sql

begin;

create temp table ctx (k text primary key, v uuid);
grant select on ctx to authenticated;
insert into ctx (k, v) values
  ('ta', '44444444-4444-4444-4444-44444444dddd'),   -- talento A (cuenta nueva)
  ('tb', '55555555-5555-5555-5555-55555555eeee');   -- talento B (otra cuenta)

insert into auth.users (id, email, aud, role) values
  ((select v from ctx where k='ta'), 'na@test.local', 'authenticated', 'authenticated'),
  ((select v from ctx where k='tb'), 'nb@test.local', 'authenticated', 'authenticated');

-- ── T1 · alta nueva: normas_aceptadas_en nace en null ──────────────────────
do $$ begin
  assert (select normas_aceptadas_en from perfiles where id = (select v from ctx where k='ta')) is null,
    'T1: una cuenta nueva no debería tener las normas aceptadas';
end $$;

-- ── T2 · el propio usuario puede aceptar (mismo update que usa la server action) ──
set local role authenticated;
set local request.jwt.claims = '{"sub":"44444444-4444-4444-4444-44444444dddd"}';
update perfiles set normas_aceptadas_en = now() where id = (select v from ctx where k='ta');
reset role;
do $$ begin
  assert (select normas_aceptadas_en from perfiles where id = (select v from ctx where k='ta')) is not null,
    'T2: el propio usuario debería poder marcar sus normas como aceptadas';
end $$;

-- ── T3 · un tercero no puede aceptar las normas de otro (RLS de perfiles_update_propio) ──
set local role authenticated;
set local request.jwt.claims = '{"sub":"55555555-5555-5555-5555-55555555eeee"}';  -- talento B
update perfiles set normas_aceptadas_en = null where id = (select v from ctx where k='ta');
reset role;
do $$ begin
  assert (select normas_aceptadas_en from perfiles where id = (select v from ctx where k='ta')) is not null,
    'T3: TB no debería poder tocar la aceptación de TA';
end $$;

select 'TODOS LOS TESTS OK' as resultado;

rollback;
