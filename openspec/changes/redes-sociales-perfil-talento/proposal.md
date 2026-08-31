## Why

En el medio artístico las redes son parte del material de presentación: mucho del trabajo de una persona vive en su Instagram o en su canal de YouTube, no en un CV. El perfil de talento hoy no tiene dónde ponerlas, así que quien mira un perfil no tiene forma de llegar a ese material.

## What Changes

- El perfil de talento suma un bloque de **redes sociales**, con un campo por red para: Instagram, YouTube, TikTok, X, LinkedIn, Vimeo y un sitio web propio.
- Cada red se carga por separado (no es un campo de texto libre). Se acepta tanto el identificador (`@usuario`) como la URL completa, y el sistema **normaliza a una URL válida** antes de guardar.
- El sistema **valida** que la URL cargada corresponda al dominio de la red elegida; el sitio web propio acepta cualquier dominio con `https`.
- En el perfil las redes cargadas se muestran como **iconos enlazados**; las que no se cargaron no ocupan lugar ni rompen el layout.
- Los enlaces abren en pestaña nueva con `rel="noopener noreferrer"`.
- El dato vive en una columna nueva `redes jsonb` en `perfiles_talento`, separada de `habilidades` (que es una lista cerrada de disciplinas y no tiene relación con esto). Migración aditiva, sin backfill: los perfiles existentes arrancan sin redes.

## Capabilities

### New Capabilities

_(ninguna)_

### Modified Capabilities

- `perfil-talento`: se agrega el requisito de redes sociales del talento — carga por red, normalización de identificador o URL a URL canónica, validación de dominio, y presentación como iconos enlazados en el perfil. La edición del perfil pasa a incluir las redes.

## Impact

**Código afectado**:
- `src/components/perfil/formulario-talento.tsx` — nuevo bloque de carga de redes y su validación.
- `src/components/perfil/perfil-talento-detalle.tsx` — fila de iconos enlazados.
- Las páginas que arman `TalentoDetalle` (`src/app/(app)/talentos/[id]/page.tsx`, `src/components/perfil/vista-perfil-propio.tsx` y donde más se consuma) suman el campo `redes` al select y al tipo.
- `src/lib/constantes.ts` — catálogo de redes soportadas (clave, etiqueta, patrón de dominio, forma de normalizar).
- `src/lib/supabase/types.ts` — `redes` en Row/Insert/Update de `perfiles_talento`.
- Nuevo helper de normalización y validación de redes (`src/lib/redes.ts`).

**Base de datos**: nueva migración `0035_redes_talento.sql` que agrega `redes jsonb not null default '{}'` a `perfiles_talento`, con un `check` de forma básica (objeto). Aditiva: sin pérdida de datos, sin backfill.

**Sin impacto en RLS**: `redes` viaja dentro de la fila de `perfiles_talento`, cuyas políticas de lectura/escritura ya existen y no cambian. (El issue #3, perfil público, decidirá aparte si las redes se muestran o no sin sesión; este cambio no las expone en ninguna superficie anónima nueva.)
