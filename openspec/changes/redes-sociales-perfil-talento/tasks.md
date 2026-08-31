## 1. Datos y base

- [x] 1.1 Crear `supabase/migrations/0035_redes_talento.sql` que agregue `redes jsonb not null default '{}'::jsonb` a `perfiles_talento` con `check (jsonb_typeof(redes) = 'object')`. Verificar que el archivo respeta el nombrado `<numero>_nombre.sql` con número estrictamente creciente respecto de `0034`.
- [x] 1.2 Agregar `redes` a `perfiles_talento` en `src/lib/supabase/types.ts` (Row como `Record<string, string>`, Insert y Update opcionales). Verificar con `npm run typecheck`.

## 2. Catálogo y helpers

- [x] 2.1 Agregar `REDES` a `src/lib/constantes.ts`: por red `clave`, `etiqueta`, `hosts[]`, `prefijoCanonico`, `icono` y flag opcional `conservarQuery`. Incluir Instagram, YouTube, TikTok, X (con `x.com` y `twitter.com` como hosts), LinkedIn, Vimeo y `sitio` (web propio). Exportar un tipo `ClaveRed`.
- [x] 2.2 Crear `src/lib/redes.ts` con `normalizarRed(clave, entrada): string | null` según las reglas del design (identificador vs URL, validación de host, canónica, `sitio` acepta cualquier host `https`). Verificar con casos: `@user`, `user`, URL con `www.`, URL de otro dominio → `null`, texto basura → `null`, URL ya canónica → idempotente, `http://` en `sitio` → `null`.
- [x] 2.3 Agregar `validarRedes(entradas: Record<ClaveRed,string>): { redes: Record<ClaveRed,string>; errores: Record<ClaveRed,string> }` en `src/lib/redes.ts` que aplique `normalizarRed` a cada campo no vacío y omita los vacíos. Verificar que un campo inválido produce entrada en `errores` y no en `redes`.

## 3. Formulario de perfil

- [x] 3.1 En `formulario-talento.tsx` agregar estado `redes: Record<ClaveRed,string>` inicializado desde `datosIniciales?.redes ?? {}` (valores tal cual guardados) y un `<DatosIniciales>` que incluya `redes`.
- [x] 3.2 Agregar el bloque "Redes sociales (opcional)" con un `CampoTexto` por red del catálogo, placeholder con ejemplo (`@usuario o https://…`), y texto de ayuda que aclare que solo se valida el formato del enlace.
- [x] 3.3 En `validar()` correr `validarRedes(redes)` y volcar `errores` por campo con clave `redes_<clave>`. En `guardar()` incluir el objeto normalizado (sin claves vacías) en `campos`. Verificar manualmente: guardar con un dominio equivocado marca el campo y no persiste; guardar con `@handle` persiste la URL canónica.

## 4. Presentación del perfil

- [x] 4.1 Verificar/añadir en `src/components/ui/icono.tsx` los 7 iconos de red (instagram, youtube, tiktok, x, linkedin, vimeo, sitio/globo). Agregar los paths que falten.
- [x] 4.2 Agregar `redes: Record<string,string>` a `TalentoDetalle` en `perfil-talento-detalle.tsx` y renderizar, cuando el objeto tenga al menos una clave, una fila de `<a href target="_blank" rel="noopener noreferrer">` con el icono de cada red presente, en orden de catálogo. Si está vacío, no renderizar el bloque.
- [x] 4.3 Sumar `redes` al `select` y al objeto que arma `TalentoDetalle` en `src/app/(app)/talentos/[id]/page.tsx`, `src/components/perfil/vista-perfil-propio.tsx` y cualquier otra vista que construya `TalentoDetalle` (buscar `PerfilTalentoDetalle` en el repo). Verificar con `npm run typecheck` que no queda ningún consumidor sin el campo.

## 5. Verificación integral

- [x] 5.1 `npm run lint && npm run typecheck && npm run build` en verde.
- [x] 5.2 Con la migración aplicada en local o en una base de prueba: alta de talento cargando 3 redes (una por `@handle`, una por URL con `www.`, una inválida), confirmar que la inválida bloquea el guardado, corregirla, guardar, y ver los 3 iconos enlazados en el perfil abriendo en pestaña nueva. Editar: borrar una red y confirmar que desaparece del perfil.
- [x] 5.3 Aplicar `0035_redes_talento.sql` en producción con `supabase db push` (requiere password de la base) y confirmar la columna en `perfiles_talento`. Merge del PR a `main` y verificar el deploy en Vercel (perfil de talento existente se ve igual; se pueden cargar redes).
