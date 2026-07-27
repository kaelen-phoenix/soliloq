## Context

La locación es hoy una lista cerrada de cinco valores del AMBA (`src/lib/constantes.ts`) que
se guarda como `text` en `perfiles_talento.locacion`, `perfiles_creador.locacion` y
`obras.locacion_ensayos`. El filtro del feed vive en el cliente
(`src/components/feed/pila-tarjetas.tsx`): compara `rol.locacion_ensayos === locacionPropia`
con igualdad de strings. Esa decisión está documentada como supuesto revisable — se tomó
justamente porque el texto libre rompe el filtro.

Restricciones que condicionan el diseño:

- **No hay backend propio.** El cliente habla directo con PostgREST; toda la seguridad es RLS.
  Cualquier cosa que necesite un secreto de servidor tiene que ir en una Route Handler de
  Next, y hoy no existe ninguna de ese tipo.
- **Supabase Free**: 500 MB de base, sin PostGIS habilitado por defecto (sí disponible).
- **El feed ya es una vista + función parametrizada** (`0012`, `0017`). El filtro etario y el
  de obras propias ya se resuelven en Postgres; el de locación es la excepción, y es la que
  este change corrige.
- Google Maps Platform es la primera dependencia paga del proyecto (free tier con tarjeta).

## Goals / Non-Goals

**Goals:**

- Que una persona en cualquier ciudad del mundo pueda cargar su ubicación real y recibir un
  feed pertinente.
- Que el filtro de cercanía sea por distancia real, en la unidad que la persona espera según
  dónde vive, y que ella pueda cambiarla.
- Registrar género de forma inclusiva y que el casting pueda usarlo sin volverlo obligatorio.
- Mantener el filtrado en Postgres, no en el cliente: es lo único que escala y lo único que
  no filtra datos de más.

**Non-Goals:**

- Mapa interactivo, pines arrastrables o vista de mapa del feed. Solo autocompletado de texto.
- Geolocalización del navegador (`navigator.geolocation`). La ubicación se elige a mano.
- Internacionalización de la interfaz: la app sigue en español rioplatense aunque el alcance
  sea mundial. Es un change aparte.
- Zonas horarias, monedas o cualquier otra consecuencia de la globalización más allá de la
  ubicación.
- Ordenar el feed por distancia. Se filtra por radio; el orden sigue siendo por obra más
  reciente.

## Decisions

### Ubicación: un lugar de Google, desnormalizado en columnas

Se guardan cinco columnas por ubicación, no un JSON ni una tabla `lugares` normalizada:

| Columna | Para qué |
|---|---|
| `ubicacion_texto` | Lo que se muestra. `formatted_address` acortado: "Córdoba, Argentina" |
| `ubicacion_place_id` | Identidad estable del lugar; permite re-geocodificar sin re-preguntar |
| `ubicacion_lat`, `ubicacion_lng` | El cálculo de distancia |
| `ubicacion_pais` | Código ISO-3166-1 alfa-2. Define la unidad por defecto |

**Por qué no una tabla `lugares` compartida**: dos personas en la misma ciudad no necesitan
compartir fila para nada, y la tabla agregaría un join a la vista del feed —que ya es la
query más caliente— a cambio de ahorrar unas decenas de bytes. Se descarta.

**Por qué se guarda el texto además del `place_id`**: mostrar una ubicación no puede depender
de una llamada a Google. Sin el texto, cada tarjeta del feed sería un request facturado.

### El autocompletado corre en el cliente con key restringida por dominio

Se usa la Places Autocomplete API desde el navegador con
`NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`, restringida por HTTP referrer y limitada a las APIs de
Places. La key es pública por diseño — igual que la anon key de Supabase.

**Alternativa descartada**: proxyear por una Route Handler de Next con una key de servidor.
Es más seguro contra abuso (nadie puede robar la key y consumir la cuota), pero agrega la
primera ruta de servidor del proyecto, latencia por pulsación y complejidad de rate limiting
que un prototipo no justifica. La restricción por referrer cubre el riesgo realista.

**Session tokens**: cada sesión de tipeo usa un `sessiontoken` de Places, que es lo que hace
que Google cobre la sesión completa como una sola búsqueda en vez de una por pulsación. Sin
esto la factura se multiplica por diez. No es opcional.

### Distancia: `earthdistance` sobre `cube`, no PostGIS

Se habilitan las extensiones `cube` y `earthdistance` y se calcula con
`earth_distance(ll_to_earth(lat1, lng1), ll_to_earth(lat2, lng2))`, que devuelve metros por
el gran círculo, con un índice GiST sobre `ll_to_earth(...)` en las tablas que se filtran.

**Por qué no PostGIS**: PostGIS es la respuesta correcta para geometría real (polígonos,
intersecciones, proyecciones). Acá solo hace falta "distancia entre dos puntos", que
`earthdistance` resuelve con una fracción del peso — PostGIS agrega decenas de MB al
esquema y una superficie de mantenimiento desproporcionada para un prototipo en el free tier.

**Por qué no calcular en el cliente**: obligaría a traer todos los roles del mundo al
navegador para descartarlos ahí. Es exactamente el bug que este change viene a arreglar.

### El filtro de distancia se muda a la función del feed

`feed_para_talento(p_talento_id)` gana un segundo parámetro: `p_radio_metros integer`, que
puede ser `null` (sin filtro de distancia, "todo el mundo"). La comparación se hace siempre
en **metros** dentro de Postgres; km y millas son exclusivamente una decisión de presentación
que vive en el cliente.

Esto es deliberado: una unidad guardada en la base es una unidad que hay que convertir en
cada query y que tarde o temprano se compara contra otra unidad. Un solo valor canónico
elimina toda esa clase de bugs.

El radio elegido se guarda en `perfiles_talento.radio_busqueda_metros` para que persista
entre sesiones, con un default de 50 000 m (50 km ≈ 30 millas). `null` significa mundial.

### La unidad se deriva del país pero se guarda como elección

`perfiles_talento.unidad_distancia` es un enum `'km' | 'mi'`. Al crear el perfil se
inicializa desde `ubicacion_pais`: `mi` para `US`, `GB`, `LR`, `MM`; `km` para el resto.
Después es de la persona: **cambiar de ubicación no vuelve a pisar la unidad**, porque alguien
que se mudó de Chicago a Berlín puede seguir pensando en millas, y que la app le cambie la
unidad sola es exactamente el tipo de sorpresa que erosiona la confianza.

Los pasos del selector de radio son distintos por unidad (5/10/25/50/100/200 km contra
5/10/25/50/100 mi), y no se convierten entre sí: nadie quiere elegir "80,47 km".

### Género: enum cerrado para filtrar, texto libre para identificarse

Dos columnas en `perfiles_talento`:

- `genero genero_persona not null` — enum `('mujer', 'varon', 'no_binarie', 'otro', 'sin_especificar')`.
  Es lo único que participa del match.
- `genero_descripcion text` — hasta 60 caracteres, opcional, libre. Se muestra en el perfil y
  en la ficha del postulante. No se filtra ni se indexa jamás.

**Por qué las dos y no una sola**: un enum solo obliga a que alguien se autodescriba con la
etiqueta de otro; un texto libre solo hace imposible el filtro, que es el mismo problema que
tenemos hoy con la locación. La separación entre *dato de matching* y *dato de identidad* es
lo que permite que ambos hagan bien su trabajo.

`sin_especificar` no es "faltante": es una elección explícita y **hace match con todo**. Elegir
no declarar el género no puede costar oportunidades laborales.

### Géneros buscados por rol: array, vacío significa abierto

`roles.generos_buscados genero_persona[] not null default '{}'`. Un array vacío es "cualquier
género", y es el default — un rol al que no se le tocó nada le llega a todo el mundo, que es
el comportamiento actual y el que no debe cambiar para las obras ya cargadas.

La regla de match en la función del feed:

```sql
cardinality(f.generos_buscados) = 0
  or t.genero = 'sin_especificar'
  or t.genero = any (f.generos_buscados)
```

**Por qué array y no una tabla `roles_generos`**: son como mucho cinco valores de un enum por
rol, siempre se leen completos con el rol y nunca se consultan por sí solos. Una tabla
agregaría un join a la vista del feed sin ninguna ganancia.

No se ofrece `sin_especificar` como opción *buscable* en el rol: buscar gente que no declaró
su género no es un criterio de casting, es un criterio raro.

### Migración de las cinco locaciones del AMBA

Las filas existentes se mapean a coordenadas fijas escritas en la propia migración (CABA,
Zona Norte, Oeste, Sur, La Plata), con `ubicacion_pais = 'AR'` y `ubicacion_place_id = null`.
No se llama a Google desde una migración: sería no determinista, lento y facturado.

`ubicacion_place_id` queda nullable de forma permanente, no solo para la migración: una
ubicación puede existir sin haber pasado por Places.

## Risks / Trade-offs

- **La API key de Google se puede abusar aunque esté restringida por referrer** → El referrer
  se puede falsificar fuera del navegador. Mitigación: cuota diaria tope en Google Cloud
  Console y alerta de presupuesto. Con el free tier y el volumen de un prototipo, el peor caso
  es que el autocompletado deje de responder un día, no una factura.
- **Google Maps es una dependencia paga en un proyecto que hasta hoy era gratis** → Se
  concentra todo el acceso a Google en un único módulo (`src/lib/ubicacion.ts`), igual que
  `videoreel.ts` concentra YouTube/Vimeo, para que cambiar de proveedor de geocoding sea
  reemplazar un archivo y no auditar la app.
- **Un radio chico en una ciudad sin actividad deja el feed vacío** → El feed vacío tiene que
  decir explícitamente que el radio es la causa y ofrecer ampliarlo, en vez de mostrar el
  mismo mensaje que "ya viste todo". Es la falla más probable del change en producción.
- **El género introduce un criterio de exclusión en un match laboral** → Se acota a un filtro
  que el creador elige activar, con vacío por defecto y `sin_especificar` haciendo match
  siempre. La app no muestra el género en la tarjeta del feed del rol: es un criterio de
  casting, no una etiqueta pública de navegación.
- **La precisión de `earthdistance` es la de una esfera, no la de un elipsoide** → El error es
  de hasta ~0,5 %. Sobre un radio de 50 km son 250 m. Irrelevante para "¿me queda cerca el
  ensayo?".
- **Las columnas viejas `locacion` / `locacion_ensayos` conviven con las nuevas durante el
  deploy** → Se hace en dos migraciones: primero agregar y llenar, después borrar la vieja,
  para que el deploy de Vercel y el de la base no tengan que ser simultáneos.

## Open Questions

- ¿El creador puede filtrar su bandeja de postulantes por distancia, o el radio es solo del
  talento? Este change asume **solo del talento**: el creador ve a quien se postuló, y quien
  se postuló ya decidió que le queda cerca.
- ¿Se muestra la distancia concreta ("a 12 km") en la tarjeta del rol? Sería útil, pero
  expone la ubicación ajena con más precisión de la que hoy se comparte. Queda fuera hasta
  tener una decisión de privacidad.
