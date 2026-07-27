## ADDED Requirements

### Requirement: Elección de un lugar del mundo

El sistema SHALL permitir elegir una ubicación de cualquier parte del mundo mediante un campo de autocompletado que sugiere lugares a medida que se escribe, y SHALL aceptar únicamente una sugerencia elegida de la lista, nunca texto libre sin resolver.

#### Scenario: Elección de una sugerencia
- **WHEN** una persona escribe al menos tres caracteres en el campo de ubicación y elige una de las sugerencias
- **THEN** el sistema registra la ubicación con su texto legible, su identificador de lugar, sus coordenadas y su código de país

#### Scenario: Texto escrito sin elegir sugerencia
- **WHEN** una persona escribe texto en el campo de ubicación pero no elige ninguna sugerencia y guarda
- **THEN** el sistema no guarda y le indica que debe elegir un lugar de la lista

#### Scenario: Sin sugerencias para el texto ingresado
- **WHEN** el texto escrito no arroja ninguna sugerencia
- **THEN** el sistema lo informa y mantiene el campo sin ubicación resuelta

#### Scenario: El servicio de autocompletado no responde
- **WHEN** el servicio de sugerencias falla o no está disponible
- **THEN** el sistema lo informa y conserva la ubicación previamente guardada sin borrarla

#### Scenario: Cambio de una ubicación ya guardada
- **WHEN** una persona con ubicación guardada elige una sugerencia distinta y guarda
- **THEN** el sistema reemplaza texto, identificador de lugar, coordenadas y país por los del lugar nuevo

### Requirement: Almacenamiento de la ubicación

El sistema SHALL almacenar de cada ubicación su texto legible, su identificador de lugar, su latitud, su longitud y su código de país ISO-3166-1 alfa-2, y SHALL mostrar la ubicación usando el texto almacenado sin consultar ningún servicio externo.

#### Scenario: Presentación de una ubicación
- **WHEN** el sistema muestra la ubicación de un perfil o de una obra en cualquier pantalla
- **THEN** usa el texto almacenado, sin realizar llamadas al servicio de mapas

#### Scenario: Ubicación sin identificador de lugar
- **WHEN** una ubicación tiene coordenadas y país pero no tiene identificador de lugar
- **THEN** el sistema la considera válida y la usa para mostrar y para calcular distancias

### Requirement: Cálculo de distancia entre ubicaciones

El sistema SHALL calcular la distancia entre dos ubicaciones a partir de sus coordenadas, SHALL expresarla internamente en metros y SHALL resolver todo filtrado por distancia en la base de datos, nunca descartando resultados en el cliente.

#### Scenario: Distancia entre dos lugares
- **WHEN** el sistema compara dos ubicaciones con coordenadas conocidas
- **THEN** obtiene la distancia entre ellas en metros

#### Scenario: Filtrado por radio
- **WHEN** el sistema debe limitar un listado a las ubicaciones dentro de un radio dado
- **THEN** aplica la restricción en la consulta a la base de datos y solo devuelve las filas que la cumplen

#### Scenario: Una de las ubicaciones no tiene coordenadas
- **WHEN** una de las dos ubicaciones a comparar carece de coordenadas
- **THEN** el sistema no calcula distancia y no la incluye en un resultado filtrado por radio

### Requirement: Unidad de distancia según el país

El sistema SHALL expresar las distancias en kilómetros o en millas según la unidad elegida por la persona, SHALL inicializar esa unidad en millas cuando el país de su ubicación es Estados Unidos, Reino Unido, Liberia o Myanmar y en kilómetros en cualquier otro caso, y SHALL conservar la unidad elegida cuando la persona cambia de ubicación.

#### Scenario: Alta de perfil en un país métrico
- **WHEN** una persona crea su perfil con una ubicación en Argentina
- **THEN** el sistema deja su unidad de distancia en kilómetros

#### Scenario: Alta de perfil en un país imperial
- **WHEN** una persona crea su perfil con una ubicación en Estados Unidos
- **THEN** el sistema deja su unidad de distancia en millas

#### Scenario: Cambio manual de unidad
- **WHEN** una persona cambia su unidad de distancia
- **THEN** el sistema la guarda y expresa todas las distancias en esa unidad de ahí en adelante

#### Scenario: Mudanza a otro país
- **WHEN** una persona que eligió millas cambia su ubicación a un país métrico
- **THEN** el sistema conserva millas como su unidad y no la modifica sola
