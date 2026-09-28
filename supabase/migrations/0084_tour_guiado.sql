-- 0084 — Tour guiado de la primera vez (issue #231).
--
-- Una marca por experiencia: quien tiene los dos roles ve el tour de Talento la primera vez
-- que entra como Talento y el de Creador la primera vez que entra como Creador, y
-- completar uno no marca el otro. Omitir cuenta como visto.
--
-- En `perfiles` y no en `localStorage`, por la misma razón que `onboarding_visto_en`
-- (0024): tiene que ser una vez por persona, no por navegador — cambiar de teléfono no
-- puede volver a mostrarlo.
--
-- Solo para cuentas nuevas (criterio de #231): las que ya existen arrancan marcadas. Las
-- nuevas nacen en null. La escritura la cubre `perfiles_update_propio` (0007).

alter table perfiles
  add column if not exists tour_talento_visto_en timestamptz,
  add column if not exists tour_creador_visto_en timestamptz;

update perfiles
set tour_talento_visto_en = coalesce(tour_talento_visto_en, now()),
    tour_creador_visto_en = coalesce(tour_creador_visto_en, now());
