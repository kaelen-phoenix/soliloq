## Why

Hoy el descubrimiento va en un solo sentido: el talento se postula y el creador reacciona. La ruta `talentos/` solo tiene `[id]` y la RLS (`perfil_talento_select_para_creador`, `0007`) deja que un creador lea un perfil de talento únicamente si esa persona se postuló a alguna de sus obras. Un creador no tiene forma de salir a buscar gente por iniciativa propia, y la primera impresión que le importa —la foto— no está en ninguna vista de búsqueda.

## What Changes

- **Pantalla nueva `/talentos`** (grilla de fotos), accesible desde la navegación **solo para el modo `creador`**.
- La tarjeta muestra **foto principal** (dominante), nombre, edad, ubicación pública y habilidades. Nada más. Al tocarla se abre el perfil completo (`/talentos/[id]`).
- **Filtros**: texto sobre el nombre, rango de edad, género y habilidades. Filtro de ubicación por radio, reusando el patrón geo del feed.
- **Paginación** por tramos (`limit`/`offset`, botón "cargar más"); no trae todos los perfiles de una.
- **Opt-in**: `perfiles_talento` suma `aparece_en_buscador boolean not null default true`. Switch en el formulario de perfil, prendido por defecto, explicado en una línea. Quien lo apaga se puede seguir postulando; no aparece en la grilla.
- **Talento sin ninguna foto no aparece** en la grilla (la foto es el valor de la feature). El formulario avisa que hace falta al menos una foto para ser encontrado.
- **Bloqueos**: la grilla y el perfil excluyen a quien bloqueó al creador y viceversa. Se apoya en las políticas restrictivas ya existentes de `0022`, que combinan con AND.

## Capabilities

### New Capabilities

- `buscador-talento`: el creador busca y recorre talento por iniciativa propia, con la foto como primera impresión, sobre el subconjunto de talento que optó por ser encontrado.

### Modified Capabilities

- `perfil-talento`: la edición del perfil suma el control de visibilidad en el buscador (`aparece_en_buscador`).

## Impact

**Base de datos** — migración `0036_buscador_talento.sql` (aditiva):
- `perfiles_talento.aparece_en_buscador boolean not null default true`.
- Función `puede_buscar_talento()` `SECURITY DEFINER` (¿la sesión es de un creador?).
- Políticas **permisivas** nuevas de lectura para creadores sobre `perfiles_talento` y `fotos_talento`, acotadas a `aparece_en_buscador = true`. Las restrictivas de bloqueo de `0022` siguen recortando por encima.
- RPC `buscar_talento(...)` `SECURITY INVOKER` que hace el filtrado y la paginación en Postgres y devuelve solo los campos de la grilla (id, nombre, edad, ubicación pública, habilidades, ruta de la foto principal), excluyendo talento sin fotos.

**Código**:
- `src/app/(app)/talentos/page.tsx` — pantalla nueva, gateada a `modoActivo === "creador"`.
- `src/components/talento/buscador-talento.tsx` y `tarjeta-talento.tsx` — grilla y tarjeta.
- `src/components/layout/items-navegacion.tsx` — item "Buscar talento" en la navegación del creador; icono `buscar` nuevo en `icono.tsx`.
- `src/components/perfil/formulario-talento.tsx` — switch de opt-in.
- `src/lib/supabase/types.ts` — `aparece_en_buscador` y la firma de `buscar_talento`.

**Sin cambio en storage**: `fotos-perfil` ya tiene lectura pública (`0010`), así que `getPublicUrl` de la foto principal funciona sin tocar nada.

## Decisiones tomadas (de las abiertas en el issue #2)

1. **Qué ve el creador antes de contactar**: la grilla trae una proyección reducida (RPC con subconjunto de campos); el perfil completo se abre al tocar la tarjeta, con la política de lectura nueva acotada a `aparece_en_buscador`.
2. **Cambio de RLS**: se toma la opción de *política nueva de lectura para creadores* + RPC de proyección, en vez de abrir `perfiles_talento` entero. La exposición de `fecha_nacimiento` queda mitigada porque es opt-in y la sesión ya es de un creador autenticado; la grilla nunca devuelve la fecha, solo la edad calculada.
3. **Foto principal**: la primera por `orden` (`fotos_talento` no tiene concepto de portada y agregarlo excede el alcance).
4. **Talento sin foto**: se oculta de la grilla y el formulario avisa por qué.
