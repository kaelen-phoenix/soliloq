-- 0075 — Activar la función de Creador sin alta de identidad (issue #175, onboarding).
--
-- Hasta acá, crear una obra o un equipo exigía tener antes una fila en `perfiles_creador`
-- (la FK de `obras.creador_id`/`equipos.creador_id` la obliga), y esa fila sólo se creaba a
-- través del alta de "perfil de Creador" (nombre, ubicación, etc. — la identidad que este
-- cambio retira). Con "armar tu primer proyecto o equipo" como único paso para activar la
-- función de Creador (ver openspec/changes/perfil-talento-unico), ya no hay una pantalla
-- previa donde crear esa fila a mano.
--
-- 1. Las columnas de identidad de `perfiles_creador` pasan a nullable: son las mismas que
--    la migración destructiva de este cambio va a borrar más adelante, una vez que ningún
--    código las siga leyendo. Adelantar la nulabilidad acá (aditivo, sin pérdida de datos)
--    es lo que permite insertar una fila con sólo el `id`.
-- 2. Un trigger en `obras`/`equipos` crea la fila de `perfiles_creador` que falte, en el
--    mismo insert que crea la primera iniciativa — así ningún punto de creación (hoy dos:
--    `FormularioObra`, `GestionEquipo`; mañana el que sea) tiene que acordarse de hacerlo.
alter table perfiles_creador
  alter column nombre drop not null,
  alter column ubicacion_texto drop not null,
  alter column ubicacion_lat drop not null,
  alter column ubicacion_lng drop not null,
  alter column ubicacion_pais drop not null;

create or replace function public.asegurar_perfil_creador()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  insert into perfiles_creador (id) values (new.creador_id)
    on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists trg_asegurar_perfil_creador_obras on obras;
create trigger trg_asegurar_perfil_creador_obras
  before insert on obras
  for each row execute function public.asegurar_perfil_creador();

drop trigger if exists trg_asegurar_perfil_creador_equipos on equipos;
create trigger trg_asegurar_perfil_creador_equipos
  before insert on equipos
  for each row execute function public.asegurar_perfil_creador();
