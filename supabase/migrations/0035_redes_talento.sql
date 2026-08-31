-- Redes sociales en el perfil de talento.
--
-- En el medio artístico las redes son parte del material de presentación: mucho del trabajo
-- de una persona vive en su Instagram o su canal de YouTube, no en un CV. El perfil no tenía
-- dónde ponerlas.
--
-- El dato va como un objeto `{ [clave]: url_canonica }` con las claves del catálogo de
-- `constantes.ts` (instagram, youtube, tiktok, x, linkedin, vimeo, sitio). Claves ausentes =
-- red no cargada. Se eligió `jsonb` y no una tabla aparte porque el conjunto es chico (7) y
-- estable, y evita un join en cada lectura de perfil; y no siete columnas nullable porque
-- cada red nueva obligaría a una migración.
--
-- El `check` solo garantiza la forma más básica (que sea un objeto). El resto —claves del
-- catálogo, valores URL https— lo asegura el cliente antes de escribir; una escritura que lo
-- saltee podría meter claves basura, pero la lectura del perfil ignora lo que no esté en el
-- catálogo al renderizar.
--
-- Aditiva y sin backfill: los perfiles existentes arrancan con `{}`.

alter table perfiles_talento
  add column redes jsonb not null default '{}'::jsonb,
  add constraint redes_es_objeto check (jsonb_typeof(redes) = 'object');
