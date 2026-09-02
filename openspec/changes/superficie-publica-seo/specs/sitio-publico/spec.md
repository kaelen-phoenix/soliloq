## Purpose

Definir la parte de Yalope que se ve sin cuenta y que los buscadores pueden indexar —landing, páginas por rol y el catálogo público de convocatorias abiertas— junto con la plomería de indexación (robots, sitemap, datos estructurados, metadata canónica y verificación de Search Console), de modo que el dominio pueda posicionarse en búsquedas del medio teatral.

## ADDED Requirements

### Requirement: Portada pública sin sesión

El sistema SHALL servir la ruta raíz `/` a cualquier visita SIN pedir sesión ni redirigir a login, mostrando una portada que explica qué es Yalope, presenta las dos puertas (talento y creador), muestra una selección de convocatorias abiertas y ofrece un llamado a registrarse. Cuando la visita ya tiene sesión iniciada, el sistema SHALL redirigirla a la home autenticada (`/inicio`).

#### Scenario: Visita anónima a la raíz
- **WHEN** una persona sin sesión abre `/`
- **THEN** el sistema muestra la portada pública con la descripción del producto, las dos puertas, convocatorias abiertas y un llamado a registro, sin redirigir a login

#### Scenario: Visita con sesión a la raíz
- **WHEN** una persona con sesión abre `/`
- **THEN** el sistema la redirige a `/inicio` y muestra su tablero según el modo activo

#### Scenario: Rastreador de buscador en la raíz
- **WHEN** un rastreador de buscador accede a `/`
- **THEN** recibe el contenido de la portada pública con indicación de indexar y seguir enlaces

### Requirement: Páginas por rol públicas

El sistema SHALL servir sin sesión las rutas `/para-talento` y `/para-creadores`, cada una con contenido propio dirigido a ese público y un llamado a registrarse. Con sesión iniciada, estas rutas SHALL seguir siendo accesibles y no redirigir a login.

#### Scenario: Visita anónima a una página por rol
- **WHEN** una persona sin sesión abre `/para-talento` o `/para-creadores`
- **THEN** el sistema muestra la página con su contenido y su llamado a registro, sin pedir sesión

#### Scenario: Contenido diferenciado por rol
- **WHEN** se comparan `/para-talento` y `/para-creadores`
- **THEN** cada una tiene título, descripción y texto propios orientados a su público, y no son la misma página con otro encabezado

### Requirement: Catálogo público de convocatorias abiertas

El sistema SHALL servir sin sesión un índice en `/convocatorias` que lista las obras en estado publicada cuya publicación web está activada. El índice SHALL permitir filtrar por texto y por ciudad, y SHALL entregar los resultados por tramos sin traer todas las convocatorias en una sola respuesta, permitiendo pedir el tramo siguiente. Una obra que no está publicada, o que tiene la publicación web apagada, NO SHALL aparecer en el índice.

#### Scenario: Índice para visita anónima
- **WHEN** una persona sin sesión abre `/convocatorias`
- **THEN** el sistema muestra las convocatorias publicadas con publicación web activada, sin pedir sesión

#### Scenario: Filtro por ciudad
- **WHEN** la visita filtra el índice por una ciudad
- **THEN** el sistema devuelve solo convocatorias de esa ciudad

#### Scenario: Filtro por texto
- **WHEN** la visita escribe parte de un título
- **THEN** el sistema devuelve las convocatorias cuyo título contiene ese texto

#### Scenario: Paginación
- **WHEN** hay más convocatorias que las mostradas y la visita pide más
- **THEN** el sistema agrega el tramo siguiente sin repetir las ya mostradas

#### Scenario: Obra despublicada o sin publicación web
- **WHEN** una obra pasa a borrador o cerrada, o su creador apaga la publicación web
- **THEN** deja de aparecer en el índice público

### Requirement: Detalle público de convocatoria con datos acotados

El sistema SHALL servir sin sesión `/convocatorias/[id]` para una obra publicada con publicación web activada, mostrando únicamente: título, sinopsis, ciudad pública, fecha estimada de estreno si existe, la lista de roles con su nombre, tipo, rango etario y cantidad de vacantes, y el nombre artístico, las disciplinas y la ciudad del creador. El detalle NO SHALL mostrar la dirección de ensayo, coordenadas exactas, datos de contacto, identificadores internos, ni las postulaciones o sus conteos. Para una obra que no existe, no está publicada, o tiene la publicación web apagada, el sistema SHALL responder 404.

#### Scenario: Detalle de una convocatoria pública
- **WHEN** una persona sin sesión abre el detalle de una convocatoria publicada con publicación web activada
- **THEN** el sistema muestra título, sinopsis, ciudad pública, fecha estimada de estreno si existe, los roles con rango etario y vacantes, y el nombre, disciplinas y ciudad del creador

#### Scenario: Datos sensibles nunca en el detalle
- **WHEN** se muestra el detalle público de una convocatoria
- **THEN** no aparece la dirección de ensayo, ni coordenadas exactas, ni datos de contacto, ni identificadores internos, ni las postulaciones ni sus conteos

#### Scenario: Convocatoria inexistente o no pública
- **WHEN** alguien abre `/convocatorias/[id]` para una obra que no existe, está en borrador o cerrada, o tiene la publicación web apagada
- **THEN** el sistema responde 404

### Requirement: La publicación web de la convocatoria es opt-in del creador

El sistema SHALL exponer una convocatoria en el catálogo público solo si su obra tiene activada la publicación web. La opción SHALL estar activada por defecto y SHALL poder cambiarse desde la edición de la obra, con una línea que explica que la convocatoria se muestra en el sitio público y puede aparecer en buscadores. Apagarla SHALL sacar la convocatoria del catálogo público y del sitemap, y SHALL conservarla en el feed interno de talento.

#### Scenario: Convocatoria pública por defecto
- **WHEN** un creador publica una obra sin tocar la opción de publicación web
- **THEN** la convocatoria aparece en el catálogo público y en el sitemap

#### Scenario: Creador que retira la convocatoria de la web
- **WHEN** un creador apaga la publicación web de su obra publicada
- **THEN** la convocatoria deja de aparecer en el catálogo público y en el sitemap, y sigue apareciendo en el feed interno de talento

### Requirement: Robots y sitemap

El sistema SHALL exponer un `robots.txt` que permite el rastreo de las rutas públicas y lo desalienta en las rutas privadas y en los enlaces de perfil compartido (`/p/*`), y que apunta al sitemap. El sistema SHALL exponer un `sitemap.xml` que incluye las rutas públicas estáticas y una entrada por cada convocatoria indexable, con su fecha de última modificación. Una convocatoria que deja de ser pública SHALL salir del sitemap.

#### Scenario: robots.txt
- **WHEN** un rastreador pide `/robots.txt`
- **THEN** recibe permiso de rastreo para las rutas públicas, exclusión de las privadas y de `/p/*`, y la URL del sitemap

#### Scenario: sitemap con convocatorias
- **WHEN** un rastreador pide `/sitemap.xml`
- **THEN** recibe las rutas públicas estáticas y una entrada por convocatoria publicada con publicación web activada, cada una con su fecha de última modificación

#### Scenario: Convocatoria fuera del sitemap
- **WHEN** una convocatoria deja de estar publicada o se le apaga la publicación web
- **THEN** su URL ya no figura en el sitemap

### Requirement: Metadata canónica y datos estructurados por página

Cada página pública SHALL emitir un título y una descripción propios y únicos, una URL canónica absoluta y metadatos Open Graph propios. La portada SHALL emitir datos estructurados de organización y de sitio web. El índice de convocatorias SHALL emitir datos estructurados de lista. El detalle de convocatoria SHALL emitir datos estructurados de evento cuando la obra tiene fecha estimada de estreno.

#### Scenario: Título y canónica por página
- **WHEN** un rastreador accede a cualquier página pública
- **THEN** recibe un `<title>` y una meta descripción propios de esa página y un enlace canónico absoluto a su URL

#### Scenario: Datos estructurados de la portada
- **WHEN** un rastreador procesa la portada pública
- **THEN** encuentra datos estructurados que identifican la organización y el sitio web

#### Scenario: Datos estructurados del detalle
- **WHEN** un rastreador procesa el detalle de una convocatoria con fecha estimada de estreno
- **THEN** encuentra datos estructurados de evento con el título y la fecha

### Requirement: Rutas públicas indexables; privadas y enlaces compartidos no

El sistema SHALL permitir que los buscadores indexen la portada, las páginas por rol, el índice y el detalle de convocatorias (indicación de indexar y seguir enlaces). El sistema NO SHALL permitir la indexación de las rutas que exigen sesión ni de los enlaces de perfil compartido `/p/*`.

#### Scenario: Ruta pública indexable
- **WHEN** un rastreador accede a la portada, una página por rol, el índice o el detalle de una convocatoria
- **THEN** no recibe ninguna indicación de no indexar

#### Scenario: Ruta privada no indexable
- **WHEN** un rastreador intenta acceder a una ruta que exige sesión
- **THEN** no obtiene contenido indexable de la aplicación, sino la redirección a login

### Requirement: Verificación de Search Console configurable

El sistema SHALL emitir la etiqueta de verificación de propiedad de Google cuando hay un token de verificación configurado en el entorno, y NO SHALL emitir ninguna etiqueta de verificación cuando no lo hay.

#### Scenario: Con token configurado
- **WHEN** el entorno tiene definido el token de verificación de Search Console y se carga cualquier página del sitio
- **THEN** la respuesta incluye la etiqueta de verificación de Google con ese token

#### Scenario: Sin token configurado
- **WHEN** el entorno no tiene definido el token de verificación
- **THEN** ninguna página emite una etiqueta de verificación

### Requirement: Acción de participar desde el detalle público lleva al registro

El detalle público de una convocatoria SHALL ofrecer una acción para participar. Cuando la activa alguien sin sesión, el sistema SHALL llevarlo al registro y, al terminar, SHALL devolverlo a esa misma convocatoria y no a la home.

#### Scenario: Participar sin sesión
- **WHEN** una persona sin sesión activa la acción de participar en el detalle de una convocatoria
- **THEN** el sistema la lleva al registro y, terminado el registro, la devuelve al detalle de esa convocatoria

### Requirement: Frescura del contenido público

El contenido público SHALL servirse de forma cacheada para velocidad y presupuesto de rastreo, y los cambios en una convocatoria (alta, baja, edición de sus datos visibles) SHALL reflejarse en el catálogo público y en el sitemap dentro de un plazo acotado sin requerir un nuevo despliegue.

#### Scenario: Alta de convocatoria visible pronto
- **WHEN** un creador publica una nueva obra con publicación web activada
- **THEN** la convocatoria aparece en el catálogo público y en el sitemap dentro de un plazo acotado, sin necesidad de redeploy

#### Scenario: Baja reflejada
- **WHEN** una obra publicada pasa a cerrada
- **THEN** su detalle público pasa a responder 404 y sale del catálogo y del sitemap dentro de un plazo acotado
