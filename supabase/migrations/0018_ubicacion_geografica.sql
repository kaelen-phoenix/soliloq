-- La ubicación deja de ser una lista cerrada del AMBA y pasa a ser un lugar cualquiera del
-- mundo, elegido con Google Places. Se guarda desnormalizada en columnas y no en una tabla
-- `lugares`: dos personas de la misma ciudad no necesitan compartir fila, y una tabla
-- agregaría un join a la vista del feed, que es la query más caliente, sin ganancia real.
--
-- `earthdistance` sobre `cube` alcanza para "distancia entre dos puntos". PostGIS sería la
-- respuesta correcta para geometría real (polígonos, proyecciones), pero pesa decenas de MB
-- y acá no se usa nada de eso.
create extension if not exists cube;
create extension if not exists earthdistance;

-- Nullables en este paso: hay filas existentes que todavía no tienen ubicación.
alter table perfiles_talento
  add column ubicacion_texto text,
  add column ubicacion_place_id text,
  add column ubicacion_lat double precision,
  add column ubicacion_lng double precision,
  add column ubicacion_pais text;

alter table perfiles_creador
  add column ubicacion_texto text,
  add column ubicacion_place_id text,
  add column ubicacion_lat double precision,
  add column ubicacion_lng double precision,
  add column ubicacion_pais text;

alter table obras
  add column ubicacion_texto text,
  add column ubicacion_place_id text,
  add column ubicacion_lat double precision,
  add column ubicacion_lng double precision,
  add column ubicacion_pais text;

-- Migración de las cinco locaciones del AMBA a coordenadas fijas. No se llama a Google desde
-- una migración: sería no determinista, lento y facturado. `ubicacion_place_id` queda nulo,
-- y por eso es nullable de forma permanente: una ubicación puede existir sin pasar por Places.
create temporary table locaciones_amba (locacion text primary key, lat double precision, lng double precision) on commit drop;

insert into locaciones_amba (locacion, lat, lng) values
  ('CABA',             -34.6037, -58.3816),
  ('Zona Norte (GBA)', -34.4708, -58.5137),
  ('Zona Oeste (GBA)', -34.6534, -58.6198),
  ('Zona Sur (GBA)',   -34.7206, -58.2544),
  ('La Plata',         -34.9215, -57.9545);

update perfiles_talento t
   set ubicacion_texto = t.locacion || ', Argentina',
       ubicacion_lat = l.lat,
       ubicacion_lng = l.lng,
       ubicacion_pais = 'AR'
  from locaciones_amba l
 where l.locacion = t.locacion;

update perfiles_creador c
   set ubicacion_texto = c.locacion || ', Argentina',
       ubicacion_lat = l.lat,
       ubicacion_lng = l.lng,
       ubicacion_pais = 'AR'
  from locaciones_amba l
 where l.locacion = c.locacion;

update obras o
   set ubicacion_texto = o.locacion_ensayos || ', Argentina',
       ubicacion_lat = l.lat,
       ubicacion_lng = l.lng,
       ubicacion_pais = 'AR'
  from locaciones_amba l
 where l.locacion = o.locacion_ensayos;

-- La locación de ensayos de una obra era texto libre, así que puede no matchear la lista.
-- Esas filas caen al centro de CABA: es la suposición menos mala y el prototipo tiene pocas.
update perfiles_talento set ubicacion_texto = coalesce(ubicacion_texto, locacion),
       ubicacion_lat = coalesce(ubicacion_lat, -34.6037),
       ubicacion_lng = coalesce(ubicacion_lng, -58.3816),
       ubicacion_pais = coalesce(ubicacion_pais, 'AR')
 where ubicacion_lat is null;

update perfiles_creador set ubicacion_texto = coalesce(ubicacion_texto, locacion),
       ubicacion_lat = coalesce(ubicacion_lat, -34.6037),
       ubicacion_lng = coalesce(ubicacion_lng, -58.3816),
       ubicacion_pais = coalesce(ubicacion_pais, 'AR')
 where ubicacion_lat is null;

update obras set ubicacion_texto = coalesce(ubicacion_texto, locacion_ensayos),
       ubicacion_lat = coalesce(ubicacion_lat, -34.6037),
       ubicacion_lng = coalesce(ubicacion_lng, -58.3816),
       ubicacion_pais = coalesce(ubicacion_pais, 'AR')
 where ubicacion_lat is null;

-- Las columnas nuevas quedan NULLABLES a propósito hasta 0021 (expand / contract):
--   * mientras el código viejo siga desplegado, tiene que poder insertar un perfil sin
--     mandar la ubicación;
--   * y en espejo, se le saca el `not null` a `locacion` para que el código nuevo pueda
--     insertar sin mandarla.
-- Durante la ventana conviven los dos. En 0021, ya con el código nuevo arriba, las nuevas
-- pasan a obligatorias y las viejas desaparecen.
-- Los CHECK sí van desde ahora: no molestan porque un CHECK se cumple con NULL.
alter table perfiles_talento alter column locacion drop not null;
alter table perfiles_creador alter column locacion drop not null;
alter table obras alter column locacion_ensayos drop not null;

alter table perfiles_talento
  add constraint ubicacion_pais_iso_talento check (ubicacion_pais ~ '^[A-Z]{2}$'),
  add constraint ubicacion_lat_valida_talento check (ubicacion_lat between -90 and 90),
  add constraint ubicacion_lng_valida_talento check (ubicacion_lng between -180 and 180);

alter table perfiles_creador
  add constraint ubicacion_pais_iso_creador check (ubicacion_pais ~ '^[A-Z]{2}$'),
  add constraint ubicacion_lat_valida_creador check (ubicacion_lat between -90 and 90),
  add constraint ubicacion_lng_valida_creador check (ubicacion_lng between -180 and 180);

alter table obras
  add constraint ubicacion_pais_iso_obra check (ubicacion_pais ~ '^[A-Z]{2}$'),
  add constraint ubicacion_lat_valida_obra check (ubicacion_lat between -90 and 90),
  add constraint ubicacion_lng_valida_obra check (ubicacion_lng between -180 and 180);

-- Índices para el filtro por radio del feed. `ll_to_earth` es inmutable, así que se puede
-- indexar directamente sobre la expresión.
create index idx_obras_ubicacion on obras using gist (ll_to_earth(ubicacion_lat, ubicacion_lng));
create index idx_perfiles_talento_ubicacion on perfiles_talento using gist (ll_to_earth(ubicacion_lat, ubicacion_lng));

-- Preferencias de búsqueda del talento. El radio se guarda SIEMPRE en metros: km y millas
-- son una decisión de presentación. Una unidad guardada en la base es una unidad que hay
-- que convertir en cada query y que tarde o temprano se compara contra otra unidad.
-- `null` en el radio significa "todo el mundo", no "sin configurar".
create type unidad_distancia as enum ('km', 'mi');

alter table perfiles_talento
  add column radio_busqueda_metros integer default 50000,
  add column unidad_distancia unidad_distancia not null default 'km',
  add constraint radio_busqueda_valido check (radio_busqueda_metros is null or radio_busqueda_metros > 0);

-- Las cuentas ya existentes son todas del AMBA, así que km es el default correcto para ellas.
update perfiles_talento set unidad_distancia = 'mi' where ubicacion_pais in ('US', 'GB', 'LR', 'MM');
