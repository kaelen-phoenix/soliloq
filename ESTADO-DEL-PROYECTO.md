# Estado del proyecto y guía de continuidad

Documento de traspaso: qué se construyó, por qué se decidió así, qué falta y cómo retomar
desde otra máquina. Complementa al `README.md`, que cubre la instalación.

Última actualización: 25 de julio de 2026.

---

## Qué es

**Yalope** — prototipo (MVP) de plataforma de match teatral que conecta Talento
(actores, actrices, técnicos) con Creadores (directores, compañías) mediante una mecánica
de swipe. El objetivo del prototipo es **validar si los actores se crean perfiles y si los
directores publican convocatorias**, no ser un producto terminado.

Desde agosto de 2026 hace dos cosas, no una: **postularse a convocatorias** (obra → roles →
match) y **armar equipo sin proyecto**, que conecta personas que todavía no tienen obra pero
quieren hacer algo. La segunda es la que el estudio de mercado pone como el corazón de la
propuesta: la app opera antes del casting.

Fuera de alcance deliberado: pagos, planes premium, B2B, blockchain, perfiles de "grandes
ligas", push notifications y notificaciones por email. Existe un documento de producto con
tres niveles de suscripción; **no se implementó nada de eso a propósito**, porque diseñar
precios antes de saber si la gente se crea el perfil es optimizar lo que todavía no se sabe
si funciona.

### El nombre comercial y el identificador técnico son distintos a propósito

La app se llama **Yalope** de cara al usuario. Por dentro, todo lo técnico sigue llamándose
**soliloq**: el proyecto de Supabase y su ref, el proyecto de Vercel, el repositorio, el
`name` de `package.json` y el callback `__soliloqPlacesListo` de `ubicacion.ts`.

No es una migración a medias, es la separación deliberada: el nombre comercial es una
hipótesis que puede cambiar, y el identificador técnico es una dependencia de la que cuelgan
la base, el deploy y las migraciones ya aplicadas. Atarlos convierte cualquier cambio de
marca en una migración de infraestructura.

Regla al tocar esto: si lo lee un usuario, va **Yalope**; si lo lee una máquina, queda
**soliloq**. La URL era la única filtración entre los dos mundos, y se resolvió con el
dominio propio `yalope.com` — no renombrando el proyecto de Vercel.

El alias viejo `soliloq-one.vercel.app` **se eliminó**. Se intentó primero redirigirlo desde
`next.config.mjs`, y no funciona: con Deployment Protection activa, esa URL cuenta como
preview y Vercel la manda al login antes de que la petición llegue a la app. Como el
proyecto nunca se lanzó bajo ese nombre, no hay enlaces viejos que preservar y borrarlo es
más limpio que dejar un muro de autenticación.

Los dominios `soliloq-kaelen-dev.vercel.app` y `soliloq-git-main-kaelen-dev.vercel.app` los
asigna Vercel solo y siguen la producción: no se tocan.

El callback de auth **no** sale de `NEXT_PUBLIC_SITE_URL` (esa variable no se usa en el
código): se arma con `window.location.origin` en `src/lib/clave.ts`. Por eso cada dominio
nuevo desde el que se entre tiene que estar en la lista de *Redirect URLs* de Supabase, o el
ingreso falla entero.

## Dónde vive

| Recurso | Ubicación |
|---|---|
| App en producción | https://yalope.com |
| Dominio | `yalope.com`, registrado y administrado en Vercel |
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

### Dos tipografías, con fronteras estrictas

Inter es la fuente de **interfaz** y Fraunces la de **marca**. Fraunces (`font-display`) se
usa solo en el logotipo, los títulos de sección y el título de una obra; si aparece en un
botón, un label o un campo, está mal usada. Es lo que le da a la app el registro editorial
de programa de mano sin resignar la legibilidad de Inter donde se lee de verdad.

Va como fuente **variable**, sin `weight` ni ejes decorativos: declarar un peso fijo la
convierte en estática y ahí `axes` deja de ser válido — el build falla con "Axes can only be
defined for variable fonts".

La marca vive en un solo lugar, `src/components/ui/logotipo.tsx`. Cualquier pantalla que
escriba "Yalope" a mano es una segunda versión del logo esperando a desincronizarse.

### Armar equipo: una sala ya no necesita una obra

Hasta `0033`, para cruzarte con alguien había que inventar una obra con roles. Quien dice
"tengo tiempo y ganas de armar algo" no tenía puerta de entrada, que es justo el caso que el
estudio de mercado pone en el centro: la app opera *antes* del casting.

`salas.obra_id` pasa a ser nullable y aparece `salas.titulo` para las que no tienen obra que
se lo preste. `intereses_equipo` es el espejo de `postulaciones` + `descartes` pero de
persona a persona; cuando el interés es mutuo, un trigger crea la sala y avisa a los dos.

**Nadie ve quién lo marcó a él.** Enterarte de que alguien te eligió antes de elegirlo
cambia la decisión, y ahí se pierde el sentido del match mutuo.

Dos decisiones de privacidad que conviene no revertir sin entenderlas:

- **Esto no abrió los perfiles de talento.** Un feed de personas resuelto con una vista
  `security_invoker` habría exigido que `perfiles_talento` fuera legible por cualquiera con
  sesión, y ahí viven fotos y fecha de nacimiento. En su lugar `feed_equipo()` es
  `SECURITY DEFINER` y devuelve una **proyección acotada** —nombre, pitch, disciplinas,
  ciudad— y solo de quienes se anotaron. Sin fotos de talento, sin edad, sin ubicación exacta.
- **Compartir sala sí habilita ver el perfil completo** (`0034`). Sin eso, dos personas que
  se eligieron entraban a un chat donde la otra figuraba como "Integrante", sin nombre ni
  cara. La política es angosta a propósito: alcanza a quien ya está en la misma sala, es
  decir a quien la otra persona ya aceptó. El bloqueo sigue mandando por encima.

Aparecer es **opt-in** (`perfiles.busca_equipo`), y ver exige aparecer: un feed de personas
donde se puede mirar sin exponerse convierte a la otra mitad en catálogo.

### Denunciar existe; moderar automáticamente, no

`0029` agrega `denuncias`, accesible desde el perfil público, la sala y —vía el perfil del
creador— las convocatorias. Registra y avisa; **no bloquea ni esconde nada solo**. La
moderación automática por cantidad de denuncias es un vector de abuso: alcanza con que
varios se pongan de acuerdo para silenciar a alguien.

Quien denuncia ve lo suyo; **el denunciado no ve nada**, y eso es deliberado: saber quién lo
denunció es lo que habilita la represalia. No hay política de update ni delete — el estado
del caso solo se toca con la conexión de servicio. Cómo revisarlas está en el skill
`consultar-base`.

Falta la pieza humana: nadie recibe un aviso automático, así que hay que mirar la tabla.

### Aprobar una postulación vieja no arma el equipo de una

`0031`: si la postulación tiene más de 7 días (`dias_para_reconfirmar()`), aprobarla no crea
la sala — la deja en `esperando_confirmacion` y le pregunta al talento si sigue disponible.
Alguien que se postuló hace semanas puede estar en otra obra, y enterarse por un chat que se
abrió solo es la forma más rápida de que un elenco arranque con alguien que ya no está.

La vacante **no** se descuenta mientras se espera la confirmación, porque la persona todavía
puede decir que no. Sí se controla el cupo antes de convocar: no tiene sentido llamar a
alguien para un rol lleno.

Consecuencia en el cliente: la bandeja de postulantes **relee el estado** que quedó guardado
en vez de confiar en el que mandó. Es el único lugar donde el optimismo mentiría, porque la
base puede devolver un estado distinto del que se pidió.

Y a los 30 días (`dias_para_vencer_espera()`), una postulación que nadie decidió se cierra
sola y se avisa, por `pg_cron`. El silencio indefinido es justamente lo que la app existe
para no repetir del casting tradicional.

Al talento nunca se le muestra la palabra "en duda": ve **"Te tienen en cuenta"**. Que
alguien dude de vos no es información accionable, solo desalienta.

### El perfil de creador son disciplinas, no un tipo

`perfiles_creador.tipo` (director independiente / compañía) se dio de baja en `0028`. No
gobernaba nada —solo cambiaba una etiqueta— y obligaba a encasillarse en dos casilleros que
dejan afuera a casi todo el oficio: un vestuarista que quiere convocar gente no es ninguno
de los dos.

Lo reemplaza `disciplinas`, un array del enum `disciplina_artistica`, más `otro_detalle`
para lo que la lista cerrada no contempla. Es **lista y no valor único** porque en el medio
se hace más de una cosa a la vez: dirigir y actuar es la norma, no la excepción.

### El perfil propio se ve como lo ven los demás

`/perfil` muestra la vista pública; el formulario vive detrás de `?editar=1`. Entrar directo
al formulario hacía que nadie viera nunca cómo se presenta ante el resto, que es justamente
lo que decide si lo eligen para un proyecto. El modo edición tiene salida propia sin
guardar: sin eso, la única forma de volver era guardar o irse a otra sección, que es cuando
se pierden los cambios.

### Las métricas se calculan en una función, por privacidad

El alcance de un rol sale de `descartes`, y esa tabla solo la puede leer el propio talento.
Abrirle la política al creador le mostraría **quién** lo descartó, que no es información
suya. Por eso `metricas_obra` (`0026`, corregida en `0027`) es `SECURITY DEFINER` y devuelve
únicamente conteos agregados, con chequeo de propiedad adentro.

Los conteos se castean a `int` a propósito: `count(*)` devuelve `bigint`, que no entra en el
entero seguro de JavaScript y viaja como texto — sumar dos de esos en el cliente concatena en
vez de sumar, sin fallar. Verificado con sesiones simuladas: el dueño ve sus métricas y un
tercero recibe cero filas.

### Web en la computadora, app en el teléfono

Dos tratamientos distintos y deliberados, no un diseño estirado:

- **Las pantallas públicas** (ingreso, recuperación, cambio de clave) usan `MarcoAcceso`: en
  móvil una columna centrada; en escritorio se parten en dos, con un panel de marca oscuro a
  la izquierda y el formulario a la derecha. El panel oscuro es la misma idea que la tarjeta
  del feed —la caja negra teatral— para no inventar un segundo lenguaje visual.
- **Dentro de la app** hay tres formas según el ancho: teléfono con barra abajo al alcance
  del pulgar; tablet con la columna centrada sobre fondo teñido; y escritorio con
  **navegación lateral fija** (`BarraLateral`) y la columna de contenido más ancha.

`BarraNavegacion` y `BarraLateral` son dos componentes distintos a propósito —una fila de
íconos abajo y una lista vertical con logo no son la misma forma con otras clases— pero leen
los ítems de `items-navegacion.tsx`. Si cada una tuviera su lista, la app terminaría con dos
navegaciones distintas según el tamaño de pantalla, que es el bug clásico de este patrón.

**Lo que se ensancha es el marco, no el texto.** La tarjeta del feed se capea sola en
`max-w-sm` dentro de `pila-tarjetas.tsx`, así que la columna ancha le da aire a las listas,
los formularios y el chat sin deformarla.

**El marco no tiene tope, y no le impone un ancho a nadie.** Cada componente declara el suyo:

| Componente | Tope | Por qué |
|---|---|---|
| Tarjeta del feed | `max-w-sm` | Está pensada para el pulgar |
| Formularios | `max-w-2xl` | Un input de 2000px no es más usable, es peor |
| Mensajes del chat | `max-w-3xl` | Se leen en columna, no cruzando la pantalla |
| Párrafos largos | `max-w-prose` | La legibilidad depende de los caracteres por renglón |
| Listas de tarjetas | ninguno | Suman columnas cuando entran |

Es al revés de como estaba: el contenedor capeaba todo por igual, y eso obligaba a elegir un
número que a las listas les quedaba chico y a los formularios grande. **Si algo se estira mal
en una pantalla ancha, el arreglo va en ese componente, no en el layout.**

Antes de esto el ancho subía por saltos (`lg`, `xl`), lo que dejaba los tamaños intermedios
—una tablet apaisada, una ventana a medio maximizar— con espacio libre esperando a cruzar un
número elegido a mano.

Las listas de tarjetas usan `repeat(auto-fill, minmax(18rem, 1fr))`: suman columnas **cuando
entran**, medido sobre el ancho real del contenedor y no del viewport. Es lo que hace que
también funcione dentro de la columna angosta de un teléfono sin una sola regla extra.

Los párrafos largos —sinopsis, descripción de perfil, experiencia— llevan `max-w-prose`. Un
renglón de 200 caracteres es ilegible; que sobre margen en un monitor de 27 pulgadas está
bien y es lo que hace cualquier producto serio.

Lo único que sigue siendo por breakpoint es la **navegación**, y ahí corresponde: una barra
abajo y una lateral no son la misma forma con otro tamaño.

Quedan fuera de la grilla a propósito el chat (es cronológico), los integrantes de la sala
(lista corta), las métricas por rol (las barras se comparan mejor apiladas) y la bandeja de
postulantes (las filas se expanden y romperían la grilla).

Ojo con la sala de chat: calcula su alto restando la barra inferior, que en escritorio no
existe. Ese descuento vive en la variable CSS `--alto-barra`, que en `lg` pasa a cero.

### La escala tipográfica es cerrada

Ocho escalones (`text-2xs` a `text-3xl`), cada uno con su interlineado. Antes había **17
tamaños sueltos** y ocho se usaban una sola vez: cada pantalla elegía su número, que es el
delator más visible de una interfaz hecha a mano.

No hay escalón por debajo de 11px **a propósito**: existían textos de 9px y 10px que no se
leen en un teléfono. Si hace falta algo más chico, el problema es la jerarquía, no el tamaño.

Un `text-[Npx]` suelto en el código es un error, no una excepción.

### Los estados tienen color propio

`error`, `alerta` y `exito` viven en la paleta, con tres pasos cada uno — fondo, borde y
texto. Antes eran `red-600` y `amber-800` crudos de Tailwind, fuera del sistema: el próximo
rojo iba a ser otro y nadie lo iba a notar.

### Las pantallas de error son parte del producto

`error.tsx`, `not-found.tsx` y `global-error.tsx`. Antes no había ninguna en 18 rutas y
cualquier falla caía en la pantalla por defecto de Next.js, en inglés.

El caso más probable no es un bug: **el proyecto Supabase se pausa tras 7 días de
inactividad**, así que el texto empuja a reintentar en vez de disculparse.

`global-error.tsx` reemplaza el `<html>` entero, así que **no usa Tailwind ni las fuentes**:
sus estilos van en línea. Tiene que seguir así — cualquier dependencia ahí puede fallar justo
cuando todo lo demás ya falló.

### Diseño: minimalismo por restricción

El acento magenta se usa **solo** en la acción de postularse, en los contadores de
pendientes, en el filete del logotipo y en el segmento "Match" de las métricas. Todo lo demás es una escala neutra con matiz cálido. Los estados seleccionados
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
| `ingreso-con-contrasena` | Implementado y desplegado. Falta recorrer los flujos con cuentas reales. |
| `alcance-global-y-genero` | Implementado y desplegado. Falta recorrer los flujos con cuentas reales. |

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

Verificado contra la base de producción (no contra la interfaz):

- Migraciones `0018`–`0022` aplicadas y registradas en `schema_migrations`. Las 15 filas
  preexistentes quedaron con coordenadas, y las columnas `locacion` / `locacion_ensayos` ya
  no existen.
- `feed_para_talento` devuelve tarjetas con radio y sin radio, y el índice GiST se usa cuando
  el planner lo elige (con 5 obras prefiere seq scan, que a ese tamaño es lo correcto).
- El bloqueo corta en las dos direcciones, y con una tercera persona da `false`.

Pendiente de verificar (tareas sin marcar en los `tasks.md` de cada change):

- **Todos los flujos de contraseña con cuentas reales**: alta con verificación por correo,
  ingreso, recuperación y cambio. Ojo con las cuentas viejas creadas por magic link: **no
  tienen contraseña**, así que entran por "Olvidé mi contraseña" o con Google.
- **La interfaz del alcance global**: el autocompletado de Places, el control de radio y
  unidad, y los géneros buscados en el alta de roles. La base está lista; lo que no se probó
  es la pantalla.
- **Que las políticas de bloqueo filtren de verdad desde la app.** Se comprobó la función
  `hay_bloqueo`, no las políticas: las consultas de verificación corren como `postgres`, que
  saltea RLS. Hace falta una sesión real de una de las dos cuentas.
- Las plantillas de correo de Supabase siguen en inglés.
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
- **La sala de proyecto también respeta el bloqueo, desde `0023_bloqueos_en_salas.sql`.** La
  sala es grupal, así que el bloqueo no expulsa a nadie: filtra **por espectador**. Dos
  bloqueados que quedan en el mismo elenco no se ven en la lista de integrantes ni se leen
  los mensajes, y para el resto del elenco la sala sigue completa. Caso a tener presente: si
  alguien bloqueó al creador de la obra, la sala se le sigue mostrando (con el resto del
  elenco) pero sin título, porque la fila de `obras` ya la esconde `0022`. Se muestra
  "Proyecto" en su lugar.

## Supuestos tomados (revisables)

- ~~Locaciones como lista cerrada del AMBA~~ — **revocado** por el change
  `alcance-global-y-genero`: la ubicación es cualquier lugar del mundo, elegido con Google
  Places y guardado con coordenadas, y el feed filtra por distancia real.
- Edad mínima de 16 años para el perfil de talento.
- Registro abierto, sin lista blanca de emails.
- Los perfiles de una misma cuenta son **independientes**: el nombre artístico y el de la
  compañía no tienen por qué coincidir.
