## ADDED Requirements

### Requirement: Búsqueda de talento por el creador

El sistema SHALL ofrecer una pantalla de búsqueda de talento accesible desde la navegación, disponible SOLO para la sesión que opera en modo creador, y SHALL rechazar el acceso de una sesión en modo talento.

#### Scenario: Acceso desde el modo creador
- **WHEN** una persona en modo creador abre la búsqueda de talento
- **THEN** el sistema muestra la grilla de resultados

#### Scenario: Acceso desde el modo talento
- **WHEN** una persona en modo talento intenta abrir la ruta de búsqueda de talento
- **THEN** el sistema la redirige fuera de esa pantalla y no expone resultados

### Requirement: Presentación de resultados con la foto primero

El sistema SHALL presentar los resultados como una grilla donde la foto principal del talento es el elemento dominante de la tarjeta, y cada tarjeta SHALL mostrar únicamente foto principal, nombre, edad, ubicación pública y habilidades. Al activar una tarjeta el sistema SHALL abrir el perfil completo de ese talento.

#### Scenario: Contenido de la tarjeta
- **WHEN** el creador ve un resultado de la búsqueda
- **THEN** la tarjeta muestra la foto principal de forma dominante y, en segundo plano, nombre, edad, ubicación pública y habilidades, y nada más

#### Scenario: Abrir el perfil completo
- **WHEN** el creador activa una tarjeta de resultado
- **THEN** el sistema abre el perfil completo del talento

#### Scenario: Foto principal
- **WHEN** un talento tiene varias fotos cargadas
- **THEN** la tarjeta usa como foto principal la primera según el orden de sus fotos

### Requirement: Filtrado y búsqueda por texto

El sistema SHALL permitir filtrar los resultados por ubicación, rango de edad, género y habilidades, y SHALL permitir buscar por texto sobre el nombre. El filtrado SHALL resolverse del lado del servidor.

#### Scenario: Filtro por habilidades
- **WHEN** el creador filtra por una o más habilidades
- **THEN** el sistema devuelve solo talento que tenga al menos una de esas habilidades

#### Scenario: Filtro por rango de edad
- **WHEN** el creador fija una edad mínima y/o máxima
- **THEN** el sistema devuelve solo talento cuya edad cae dentro del rango

#### Scenario: Búsqueda por nombre
- **WHEN** el creador escribe parte de un nombre
- **THEN** el sistema devuelve el talento cuyo nombre contiene ese texto

#### Scenario: Sin filtros
- **WHEN** el creador abre la búsqueda sin fijar ningún filtro
- **THEN** el sistema devuelve talento visible ordenado de forma estable

### Requirement: Paginación de resultados

El sistema SHALL entregar los resultados por tramos y NO SHALL traer todos los perfiles en una sola respuesta. El sistema SHALL permitir pedir el tramo siguiente.

#### Scenario: Traer más resultados
- **WHEN** hay más resultados que los mostrados y el creador pide más
- **THEN** el sistema agrega el tramo siguiente sin repetir los ya mostrados

### Requirement: Aparecer en el buscador es opt-in del talento

El sistema SHALL incluir a un talento en los resultados de búsqueda solo si ese talento tiene activada la opción de aparecer en el buscador. La opción SHALL estar activada por defecto y SHALL poder cambiarse desde la edición del perfil. Un talento que la desactiva SHALL conservar la capacidad de postularse.

#### Scenario: Talento visible por defecto
- **WHEN** un talento completa su perfil sin tocar la opción de visibilidad
- **THEN** el talento puede aparecer en los resultados de búsqueda

#### Scenario: Talento que se oculta
- **WHEN** un talento desactiva la opción de aparecer en el buscador y guarda
- **THEN** el sistema deja de incluirlo en los resultados, y el talento sigue pudiendo postularse a convocatorias

### Requirement: Talento sin fotos fuera de la búsqueda

El sistema NO SHALL incluir en los resultados de búsqueda a un talento que no tiene ninguna foto cargada, y la edición del perfil SHALL advertir que hace falta al menos una foto para ser encontrado.

#### Scenario: Talento sin fotos
- **WHEN** un talento tiene la visibilidad activada pero no cargó ninguna foto
- **THEN** el talento no aparece en los resultados de búsqueda

### Requirement: La búsqueda respeta los bloqueos

El sistema NO SHALL mostrar en los resultados ni permitir abrir desde la búsqueda el perfil de un talento que bloqueó al creador o a quien el creador bloqueó.

#### Scenario: Talento bloqueado
- **WHEN** existe un bloqueo entre el creador y un talento
- **THEN** ese talento no aparece en los resultados y su perfil no se abre desde la búsqueda
