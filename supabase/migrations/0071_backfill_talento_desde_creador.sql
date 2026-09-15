-- 0071 — Backfill de Perfil de Talento para cuentas Creador-sin-Talento (issue #175, 1/2).
--
-- Primer paso del cambio "perfil-talento-unico" (openspec/changes/perfil-talento-unico):
-- todo perfil pasa a tener un único Perfil de Talento; la función de Creador deja de tener
-- identidad propia. Antes de sacarle a `perfiles_creador` sus columnas de identidad
-- (0072), hay que garantizar que ninguna cuenta se quede sin Perfil de Talento.
--
-- `fecha_nacimiento` no tiene equivalente en `perfiles_creador` — no hay forma honesta de
-- completarla para una cuenta real sin preguntarle a la persona. Se pasa a nullable (decisión
-- confirmada con el product owner): el alta manual normal la sigue pidiendo como
-- obligatoria desde el formulario, esto sólo habilita el backfill de cuentas existentes.
alter table perfiles_talento alter column fecha_nacimiento drop not null;

-- El perfil de Talento que falta, con lo que sí tiene equivalente. `genero` usa
-- 'sin_especificar' — no es un valor "vacío", es una elección válida (ver 0019).
insert into perfiles_talento (
  id, nombre, fecha_nacimiento, ubicacion_texto, ubicacion_publica,
  ubicacion_place_id, ubicacion_lat, ubicacion_lng, ubicacion_pais, genero
)
select
  c.id, c.nombre, null, c.ubicacion_texto, c.ubicacion_publica,
  c.ubicacion_place_id, c.ubicacion_lat, c.ubicacion_lng, c.ubicacion_pais, 'sin_especificar'
from perfiles_creador c
where not exists (select 1 from perfiles_talento t where t.id = c.id);

-- La foto de perfil de Creador pasa a ser la primera foto del Talento recién creado.
-- `imagen_url` guarda la URL pública completa (no el storage_path); se recorta al mismo
-- formato que usa `fotos_talento` (ver formulario-creador.tsx, misma lógica de split).
insert into fotos_talento (talento_id, storage_path, orden)
select c.id, split_part(c.imagen_url, '/fotos-perfil/', 2), 0
from perfiles_creador c
where c.imagen_url is not null
  and not exists (select 1 from fotos_talento f where f.talento_id = c.id and f.orden = 0);
