# Estado del proyecto y guía de continuidad

Documento de traspaso: qué se construyó, por qué se decidió así, qué falta y cómo retomar
desde otra máquina. Complementa al `README.md`, que cubre la instalación.

Última actualización: 25 de julio de 2026.

---

## Qué es

**Soliloq** — prototipo (MVP) de plataforma de match teatral que conecta Talento
(actores, actrices, técnicos) con Creadores (directores, compañías) mediante una mecánica
de swipe. El objetivo del prototipo es **validar si los actores se crean perfiles y si los
directores publican convocatorias**, no ser un producto terminado.

Fuera de alcance deliberado: pagos, planes premium, B2B, blockchain, perfiles de "grandes
ligas", push notifications y notificaciones por email.

## Dónde vive

| Recurso | Ubicación |
|---|---|
| App en producción | https://soliloq-one.vercel.app |
| Repositorio | `github.com/kaelen-phoenix/soliloq` |
| Hosting | Vercel, proyecto `kaelen-dev/soliloq` (plan Hobby, gratis) |
| Base de datos y auth | Supabase, proyecto `soliloq` — ref `ydnafjmznntfmzrsijko` (plan Free) |
| Mapas y geocoding | Google Maps Platform — Places API + Geocoding API |

## Stack

- **Next.js** (App Router) + TypeScript + Tailwind, como PWA responsive mobile-first.
- **Supabase**: Postgres, Auth (email + contraseña, y Google), Storage y Realtime. **No hay servidor
  propio**: el cliente habla directo con Postgres vía PostgREST.
- Interfaz en español rioplatense.

---

## Decisiones de arquitectura y su porqué

Estas son las decisiones que no se deducen leyendo el código y que conviene no revertir sin
entender el motivo.

### Row Level Security es toda la seguridad

Al no haber backend propio, **una política RLS mal escrita es una filtración de datos
directa**, sin nada que la ataje. Todas las tablas tienen RLS habilitada desde su migración.
Las comprobaciones de pertenencia usan funciones `SECURITY DEFINER`
(`supabase/migrations/0005_funciones_seguridad.sql`) para evitar recursión infinita entre
políticas de tablas que se referencian mutuamente — un error clásico y difícil de
diagnosticar en Supabase.

La clave anónima está expuesta en el cliente: es lo esperado, su seguridad depende
enteramente de RLS. La clave de servicio no se usa en la aplicación.

### La sala de proyecto se crea por trigger, no en el cliente

Cuando una postulación pasa a `aprobado`, un trigger de Postgres
(`0011_triggers_match.sql`) crea la sala si no existe, incorpora al talento y al creador, y
genera las notificaciones — todo en la misma transacción que la aprobación. Si esto viviera
en el cliente, una desconexión a mitad de camino dejaría un match aprobado sin sala y sin
aviso. El mismo trigger maneja la revocación y controla las vacantes con bloqueo de fila,
que es lo que evita que dos aprobaciones simultáneas excedan el cupo.

### La edad se deriva, nunca se almacena

El perfil guarda `fecha_nacimiento`; la edad se calcula en las queries. Guardarla como
número la vuelve incorrecta con el tiempo, y el filtro etario es justamente lo que decide
qué ve cada talento en el feed.

### Perfil dual: la verdad son las filas, no una bandera

Una cuenta puede tener perfil de Talento, de Creador o ambos. `perfiles.rol` **dejó de
gobernar** qué puede hacer alguien: ahora solo registra con qué rol arrancó. Lo que
determina las capacidades es **la existencia de las filas** en `perfiles_talento` y
`perfiles_creador`.

Se descartó usar dos booleanos `es_talento` / `es_creador` porque sería estado duplicado
que hay que mantener sincronizado con las tablas de perfil, y toda desincronización sería
un bug silencioso. Las filas no pueden mentir.

`perfiles.modo_activo` guarda el modo en que opera la persona y se restaura al reingresar.

### Toda la redirección en una función única

`src/lib/cuenta.ts` concentra la decisión de a dónde mandar a cada persona según el estado
de su cuenta. Al ramificarse el onboarding entre dos perfiles posibles, **es donde nacen los
bucles de redirección**. Está escrita como una secuencia ordenada, sin ramas cruzadas.
Si se toca, verificar los cuatro estados: sin perfiles, solo talento, solo creador, ambos.

### Interacciones optimistas solo donde importa la velocidad

El swipe del feed y la clasificación de postulantes actualizan la interfaz de inmediato y
persisten en segundo plano; ante un fallo revierten y avisan. Es lo que sostiene el
requisito de que el match se sienta instantáneo. Las pantallas de lectura no usan
optimismo: se renderizan en servidor con datos reales.

### La ubicación se guarda con coordenadas, y la distancia se calcula en Postgres

La ubicación es un lugar de Google Places del que se guardan texto, `place_id`, lat/lng y
país. El filtro de cercanía del feed es un radio en metros resuelto con `earthdistance` sobre
un índice GiST, **dentro de la función del feed**: filtrar en el cliente obligaría a traerse
todos los roles del mundo para descartarlos ahí.

Km y millas son exclusivamente presentación; en la base todo es metros. La unidad se
inicializa según el país al crear el perfil y después no se vuelve a tocar sola.

`src/lib/ubicacion.ts` es la **única** fuente de verdad y el único lugar que habla con
Google, igual que `videoreel.ts` con YouTube/Vimeo: cambiar de proveedor de geocoding tiene
que ser reemplazar ese archivo, no auditar la app.

### El género tiene dos columnas y solo una filtra

`genero` es un enum cerrado y es lo único que participa del match; `genero_descripcion` es
texto libre de identidad que **no se filtra ni se indexa jamás**. Un enum solo obligaría a
autodescribirse con la etiqueta de otro; un texto libre solo haría imposible el filtro.

`sin_especificar` no es "faltante": hace match con todo. No declarar el género no puede
costar oportunidades laborales. En los roles, `generos_buscados` vacío significa abierto a
cualquier género, y es el default.

### El videoreel es un link, no un archivo

Solo se almacenan fotos en Storage. Los videos son enlaces a YouTube o Vimeo: almacenar
video consumiría el free tier en pocos perfiles. `src/lib/videoreel.ts` es la **única**
fuente de verdad — valida y genera el embed con el mismo parser, para que no puedan
discrepar sobre el mismo enlace.

### Diseño: minimalismo por restricción

El acento magenta se usa **solo** en la acción de postularse y en los contadores de
pendientes. Todo lo demás es una escala neutra con matiz cálido. Los estados seleccionados
y el foco usan negro. La tarjeta del feed es de alto contraste (tipo caja negra teatral)
porque es la pieza central del producto.

---

## Estructura del repositorio

```
src/app/                    Rutas (App Router). El grupo (app) exige sesión y perfil.
src/components/             Componentes por dominio: feed, seleccion, salas, perfil, layout, ui
src/lib/cuenta.ts           Estado de cuenta y decisión de redirección (crítico)
src/lib/supabase/           Clientes (browser, server, middleware) y tipos de la base
src/lib/videoreel.ts        Parser de enlaces de YouTube/Vimeo
supabase/migrations/        Esquema, RLS, triggers y vistas, en orden de aplicación
openspec/changes/           Especificación funcional y técnica
```

## OpenSpec

El proyecto se especifica con OpenSpec (`npx -y @fission-ai/openspec@latest`). Cuatro changes,
**ninguno archivado todavía** — por eso `openspec/specs/` está vacío y las requirements
vigentes viven en los deltas de cada change, que hay que leer en orden para saber qué rige:

| Change | Estado |
|---|---|
| `mvp-match-teatral` | Implementado y desplegado. 8 capacidades, ~130 escenarios. |
| `perfil-dual-talento-creador` | Implementado y desplegado. Falta verificación en producción. |
| `ingreso-con-contrasena` | Implementado. Falta configurar Supabase Auth y verificar en producción. |
| `alcance-global-y-genero` | Código completo. Faltan Google Cloud, aplicar migraciones 0018–0021 y verificar. |

Comandos útiles: `openspec status --change <nombre>`, `openspec validate <nombre> --strict`.

---

## Cómo retomar desde otra máquina

1. `git clone git@github.com:kaelen-phoenix/soliloq.git && cd soliloq && npm install`
2. Copiar `.env.example` a `.env.local` y completar con los valores de **Supabase → Project
   Settings → API**:
   - `NEXT_PUBLIC_SUPABASE_URL` → `https://ydnafjmznntfmzrsijko.supabase.co`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` → la clave anónima (publishable) del proyecto
   - `NEXT_PUBLIC_SITE_URL` → `http://localhost:3000`
   - `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` → la key de **Google Cloud Console → APIs y servicios
     → Credenciales**, con Places API y Geocoding API habilitadas
3. `npm run dev`

**Ningún secreto está en el repo, a propósito.** Se obtienen del dashboard de Supabase o de
Vercel (`vercel env pull`).

### Aplicar migraciones nuevas

```bash
npx -y @fission-ai/openspec@latest --version   # CLI de OpenSpec, opcional
npx -y supabase db push --db-url "postgresql://postgres:<PASSWORD>@db.ydnafjmznntfmzrsijko.supabase.co:5432/postgres"
```

La contraseña de la base se obtiene o se regenera en **Supabase → Settings → Database**.

Cuidado con el nombrado: la CLI exige versiones numéricas **estrictamente crecientes** y
rechaza archivos que no matcheen `<numero>_nombre.sql`. Un archivo mal nombrado se saltea en
silencio y rompe las migraciones siguientes que dependan de él.

### Desplegar

El push a `main` dispara deploy automático en Vercel. Para forzarlo:
`npx -y vercel deploy --prod`.

---

## Estado de la verificación

Funciona confirmado en producción:

- Ingreso con Google.
- Alta de perfil de Talento con fotos, y de Creador.
- Migración de cuentas existentes al modelo de perfil dual.

Pendiente de verificar (tareas sin marcar en los `tasks.md` de cada change):

- **Todo el ingreso con contraseña**: alta con verificación por correo, ingreso, recuperación
  y cambio de contraseña. Requiere antes habilitar el proveedor Email con contraseña en
  Supabase. Ojo con las cuentas viejas creadas por magic link: **no tienen contraseña**, así
  que entran por "Olvidé mi contraseña" o con Google, no por el formulario.
- **Todo el alcance global**: ubicación con Google Places, feed filtrado por radio, cambio de
  unidad y géneros buscados en los roles. Requiere antes la key de Google Maps y aplicar las
  migraciones `0018`–`0021`.
- Crear el segundo perfil y conmutar entre modos.
- Ciclo completo: obra → roles → publicación → postulación → aprobación → sala de chat.
- Que una obra propia no aparezca en el feed propio.
- Realtime del chat entre dos dispositivos.
- Casos límite de vacantes: aprobación que excede el cupo, revocación que libera vacante.

## Advertencias operativas

- **Google Maps Platform es la única dependencia paga del proyecto.** Tiene free tier pero
  exige tarjeta. Dos cosas no son opcionales: la key restringida por HTTP referrer y por API,
  y una **cuota diaria tope** con alerta de presupuesto en Google Cloud Console. Con el tope,
  el peor caso de un abuso es que el autocompletado deje de responder un día, no una factura.
  El código usa *session tokens* de Places, que es lo que hace que Google cobre una sesión de
  tipeo completa como una sola búsqueda en vez de una por pulsación.
- **El proyecto Supabase Free se pausa tras 7 días de inactividad** y hay que reactivarlo a
  mano desde el dashboard. Antes de una demo agendada, abrir la app el día anterior.
- Límites del free tier a vigilar: 500 MB de base, 1 GB de Storage, 200 conexiones Realtime
  concurrentes.
- **El bloqueo entre usuarios existe en la base pero no en la interfaz.** La migración
  `0022_bloqueos.sql` define la tabla `bloqueos` y las políticas restrictivas que hacen que
  dos personas dejen de verse en todas las superficies de la app. No hay pantalla para
  usarlo: los bloqueos se cargan a mano desde el **SQL Editor de Supabase**, insertando en
  `bloqueos` con el par ordenado (`perfil_menor < perfil_mayor`) y `creado_por` en quien pide
  el bloqueo. Sirve para responder a un incidente durante una prueba, no como funcionalidad
  ofrecida. Sigue sin haber moderación ni reportes: riesgo aceptado para el prototipo, que se
  valida con usuarios invitados.

## Supuestos tomados (revisables)

- ~~Locaciones como lista cerrada del AMBA~~ — **revocado** por el change
  `alcance-global-y-genero`: la ubicación es cualquier lugar del mundo, elegido con Google
  Places y guardado con coordenadas, y el feed filtra por distancia real.
- Edad mínima de 16 años para el perfil de talento.
- Registro abierto, sin lista blanca de emails.
- Los perfiles de una misma cuenta son **independientes**: el nombre artístico y el de la
  compañía no tienen por qué coincidir.
