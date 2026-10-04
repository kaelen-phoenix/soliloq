-- 0102 — El tope de fotos de Proyecto y Equipo (0101) no se puede pasar con subidas en paralelo.
--
-- Contar y después insertar deja una ventana: dos subidas a la vez cuentan 9, insertan las dos
-- y quedan 11. Un lock por Proyecto/Equipo serializa las inserciones de esa iniciativa.

create or replace function public.validar_max_fotos_obra()
returns trigger
language plpgsql
set search_path to 'public'
as $function$
begin
  perform pg_advisory_xact_lock(hashtext('fotos_obra:' || new.obra_id::text));
  if (select count(*) from fotos_obra where obra_id = new.obra_id) >= 10 then
    raise exception 'Una obra no puede tener más de 10 fotos';
  end if;
  return new;
end;
$function$;

create or replace function public.validar_max_fotos_equipo()
returns trigger
language plpgsql
set search_path to 'public'
as $function$
begin
  perform pg_advisory_xact_lock(hashtext('fotos_equipo:' || new.equipo_id::text));
  if (select count(*) from fotos_equipo where equipo_id = new.equipo_id) >= 10 then
    raise exception 'Un equipo no puede tener más de 10 fotos';
  end if;
  return new;
end;
$function$;
