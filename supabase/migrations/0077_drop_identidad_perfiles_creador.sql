-- 0077 — Retira las columnas de identidad de perfiles_creador (issue #175, 5/5, destructivo).
--
-- Último paso del cambio "perfil-talento-unico": confirmado que ningún código en `main` lee
-- estas columnas (todo pasó a `perfiles_talento` en 0071-0076), se borran. `disciplinas` y
-- `otro_detalle` quedan — son lo único que describe la función de Creador, no una identidad
-- personal aparte.
--
-- Sin backfill que hacer acá: 0071 ya migró a `perfiles_talento` todo lo que tenía
-- equivalente para la única cuenta que lo necesitaba. Lo que se pierde sin equivalente
-- (nombre de compañía en vez de persona, `biografia` como trayectoria propia de Creador)
-- ya fue una decisión aceptada explícitamente (ver proposal.md y design.md).
alter table perfiles_creador
  drop column nombre,
  drop column fecha_nacimiento,
  drop column edad_visible,
  drop column ubicacion_texto,
  drop column ubicacion_publica,
  drop column ubicacion_place_id,
  drop column ubicacion_lat,
  drop column ubicacion_lng,
  drop column ubicacion_pais,
  drop column descripcion,
  drop column biografia,
  drop column imagen_url;
