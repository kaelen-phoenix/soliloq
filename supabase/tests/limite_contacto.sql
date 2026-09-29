-- Límite del formulario de contacto de «Apoyar» (#252, 0087).
-- Se corre entero dentro de begin/rollback: no deja rastro.
--   supabase/tests/run.sh limite_contacto.sql
--
-- `enviar_mensaje_contacto` se llama como anon (igual que el formulario): acepta hasta 3
-- mensajes por email por hora (sin importar mayúsculas), rechaza el 4.º con
-- 'demasiados_mensajes', no frena a otro email, y corta todo al llegar a 60 por hora.

begin;

-- ── T1 · por email: 3 pasan, el 4.º (mismo email en mayúsculas) no ──────────
set local role anon;
select public.enviar_mensaje_contacto('Test', 'limite-e2e@test.local', 'otro', 'uno');
select public.enviar_mensaje_contacto('Test', 'limite-e2e@test.local', 'otro', 'dos');
select public.enviar_mensaje_contacto('Test', 'Limite-E2E@test.local', 'otro', 'tres');

do $$ begin
  begin
    perform public.enviar_mensaje_contacto('Test', 'LIMITE-e2e@test.local', 'otro', 'cuatro');
    raise exception 'T1: el 4.º mensaje del mismo email en la hora tenía que rechazarse';
  exception when others then
    if sqlerrm <> 'demasiados_mensajes' then raise; end if;
  end;
end $$;

-- ── T2 · otro email sigue pudiendo escribir ──────────────────────────────────
select public.enviar_mensaje_contacto('Otra', 'otra-limite-e2e@test.local', 'otro', 'hola');
reset role;

-- ── T3 · tope global: con 60 en la última hora, nadie más entra ──────────────
insert into mensajes_contacto (nombre, email, tipo, mensaje)
select 'Relleno', 'relleno-' || g || '@test.local', 'otro', 'x'
from generate_series(1, greatest(0, 60 - (
  select count(*) from mensajes_contacto where creado_en > now() - interval '1 hour'
))) g;

set local role anon;
do $$ begin
  begin
    perform public.enviar_mensaje_contacto('Nueva', 'nueva-limite-e2e@test.local', 'otro', 'hola');
    raise exception 'T3: con 60 mensajes en la hora el tope global tenía que rechazarlo';
  exception when others then
    if sqlerrm <> 'demasiados_mensajes' then raise; end if;
  end;
end $$;
reset role;

-- ── T4 · lo de hace más de una hora no cuenta ────────────────────────────────
update mensajes_contacto set creado_en = now() - interval '2 hours'
where email like '%@test.local';
set local role anon;
select public.enviar_mensaje_contacto('Test', 'limite-e2e@test.local', 'otro', 'de nuevo');
reset role;

select 'TODOS LOS TESTS OK' as resultado;

rollback;
