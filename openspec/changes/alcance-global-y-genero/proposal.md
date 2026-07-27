## Why

Hoy la plataforma solo se puede usar en el AMBA: la locación es una lista cerrada de cinco
opciones (`src/lib/constantes.ts`) y el feed filtra comparando ese texto exacto. Eso vuelve
imposible que alguien de Córdoba, Madrid o Bogotá se cree un perfil útil, y frena la
validación del prototipo a un solo mercado.

Además, el casting teatral se organiza en buena medida por género del personaje, y el perfil
no registra ninguna forma de identidad de género. Sin ese dato, un rol escrito para un
personaje femenino le llega igual a todo el mundo y el feed pierde precisión — pero el dato
tiene que estar modelado de forma inclusiva, porque el gremio es justamente donde una lista
binaria excluye gente real.

## What Changes

- **BREAKING**: la locación deja de ser una lista cerrada de texto. Pasa a ser un lugar
  elegido con Google Places Autocomplete, del que se guarda el texto legible, el `place_id`,
  las coordenadas (lat/lng) y el código de país ISO. Aplica a perfil de Talento, perfil de
  Creador y locación de ensayos de una obra. Las locaciones existentes del AMBA se migran a
  coordenadas conocidas.
- **BREAKING**: el filtro del feed deja de ser "misma locación exacta" y pasa a ser un radio
  de distancia. La persona elige el radio; la unidad es kilómetros o millas.
- La unidad de distancia se deriva del país de la ubicación (millas en US, UK, LR y MM;
  kilómetros en el resto) y queda guardada en el perfil, editable en cualquier momento.
- El perfil de Talento incorpora **género**: una lista cerrada inclusiva (mujer, varón,
  no binarie, otro, prefiero no decirlo) más un campo de texto libre opcional para
  autodescribirse. Ambos son editables desde la edición de perfil.
- Cada **rol** de una convocatoria puede declarar uno o más géneros buscados, o ninguno.
  Sin especificar significa abierto a cualquier género, y es el estado por defecto.
- El feed cruza el género del talento con los géneros buscados por el rol: un rol sin
  géneros especificados le llega a todo el mundo; un rol con géneros solo le llega a quien
  coincide o a quien eligió "prefiero no decirlo".
- Se agrega una dependencia externa nueva: Google Maps Platform (Places + Geocoding), con
  su API key.

## Capabilities

### New Capabilities
- `ubicacion-geografica`: cómo se elige, se almacena y se consulta un lugar del mundo
  (autocompletado, coordenadas, país), y cómo se calcula y se expresa la distancia entre
  dos lugares en la unidad que corresponda.

### Modified Capabilities
- `perfil-talento`: la locación pasa a ser un lugar geográfico en vez de una opción de lista
  cerrada; se agregan género (lista cerrada), autodescripción de género (texto libre) y
  unidad de distancia preferida.
- `perfil-creador`: la locación pasa a ser un lugar geográfico en vez de una opción de lista
  cerrada; se agrega unidad de distancia preferida.
- `convocatorias`: la locación de ensayos pasa a ser un lugar geográfico; cada rol suma
  géneros buscados, opcionales y múltiples.
- `feed-postulacion`: el filtro de locación exacta se reemplaza por un filtro de radio de
  distancia configurable, y se agrega el cruce por género entre talento y rol.

## Impact

- **Base de datos**: nuevas columnas de ubicación en `perfiles_talento`, `perfiles_creador` y
  `obras`; columnas de género y unidad en `perfiles_talento`; géneros buscados en `roles`.
  Extensión geográfica de Postgres para el cálculo de distancia, índice geográfico, y
  reescritura de la vista del feed (`0012_vista_feed.sql`) para exponer coordenadas y género.
  Migración de datos de las cinco locaciones AMBA existentes.
- **Código**: `src/lib/constantes.ts` (se va `LOCACIONES`, entran los géneros), formularios de
  talento y creador, alta de obra y de roles, `src/components/feed/pila-tarjetas.tsx` (filtro),
  tarjetas y detalles que muestran locación, y `src/lib/supabase/types.ts`.
- **Configuración**: `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` en `.env.example`, local y Vercel, con
  restricción por dominio y por API. Es la primera dependencia de un servicio pago del
  proyecto (tiene free tier, requiere tarjeta).
- **Producto**: la app deja de estar acotada al AMBA; los textos de la interfaz que asumen
  Buenos Aires dejan de ser válidos.
