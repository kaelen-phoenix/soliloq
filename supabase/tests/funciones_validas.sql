-- Toda función SQL del esquema `public` compila contra las tablas de hoy (#241).
-- Se corre entero dentro de begin/rollback: no deja rastro.
--   supabase/tests/run.sh funciones_validas.sql
--
-- Una función `language sql` se valida al crearla, pero **no** cuando después se borra una
-- columna que usa: queda rota y recién falla cuando alguien la llama. Así se rompieron tres
-- con 0077 y nadie se enteró por semanas. Acá se re-crea cada una (con su propia definición,
-- dentro de la transacción que se descarta) con `check_function_bodies` prendido: si alguna
-- apunta a algo que ya no existe, el test lo dice.
--
-- Se saltean las de extensiones (earthdistance/cube), que no son nuestras. Las plpgsql no
-- se validan así (Postgres solo chequea su sintaxis al crearlas).

begin;

set local check_function_bodies = on;
create temp table rotas (funcion text, error text);

do $$
declare
  f record;
begin
  for f in
    select p.oid, p.proname, pg_get_functiondef(p.oid) as def
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    join pg_language l on l.oid = p.prolang
    where n.nspname = 'public'
      and p.prokind = 'f'
      and l.lanname = 'sql'
      and not exists (
        select 1 from pg_depend d
        where d.classid = 'pg_proc'::regclass and d.objid = p.oid and d.deptype = 'e'
      )
  loop
    begin
      execute f.def;
    exception when others then
      insert into rotas values (f.proname, sqlerrm);
    end;
  end loop;
end $$;

do $$
declare
  lista text;
begin
  select string_agg(funcion || ': ' || error, E'\n') into lista from rotas;
  assert lista is null, E'Funciones SQL que no compilan contra el esquema actual:\n' || lista;
end $$;

select 'TODOS LOS TESTS OK' as resultado;

rollback;
