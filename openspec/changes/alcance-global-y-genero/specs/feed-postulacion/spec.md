## MODIFIED Requirements

### Requirement: Filtrado del feed según el perfil del talento

El sistema SHALL mostrar en el feed únicamente roles de obras publicadas cuyo rango etario contenga la edad del talento, cuyos géneros buscados sean compatibles con el género del talento y cuya locación de ensayos esté dentro del radio de búsqueda del talento, excluyendo aquellos a los que ya se postuló, los que ya descartó y los pertenecientes a obras de su propio perfil de creador.

#### Scenario: Rol dentro del rango etario
- **WHEN** un talento de 25 años recorre el feed y existe un rol publicado que busca de 20 a 30 años
- **THEN** el sistema incluye ese rol entre las tarjetas

#### Scenario: Rol fuera del rango etario
- **WHEN** un talento de 45 años recorre el feed y existe un rol publicado que busca de 20 a 30 años
- **THEN** el sistema no le muestra ese rol

#### Scenario: Rol sin rango etario definido
- **WHEN** existe un rol técnico publicado sin rango etario
- **THEN** el sistema lo muestra a cualquier talento, sin importar su edad

#### Scenario: Rol ya clasificado
- **WHEN** un talento vuelve a abrir el feed tras haberse postulado o haber descartado un rol
- **THEN** el sistema no vuelve a mostrarle ese rol

#### Scenario: Rol de una obra propia
- **WHEN** una persona con ambos perfiles recorre el feed en modo `talento` y tiene una obra publicada con roles vacantes
- **THEN** el sistema no le muestra ninguno de los roles de esa obra

#### Scenario: Rol dentro del radio de búsqueda
- **WHEN** un talento recorre el feed y existe un rol publicado cuya locación de ensayos está a menos distancia que su radio de búsqueda
- **THEN** el sistema incluye ese rol entre las tarjetas

#### Scenario: Rol fuera del radio de búsqueda
- **WHEN** un talento con radio de 50 kilómetros recorre el feed y existe un rol publicado cuya locación de ensayos está a 400 kilómetros
- **THEN** el sistema no le muestra ese rol

#### Scenario: Búsqueda sin límite de distancia
- **WHEN** el talento elige buscar en todo el mundo
- **THEN** el sistema le muestra roles de cualquier locación, sin filtrar por distancia

#### Scenario: Rol compatible por género
- **WHEN** un talento cuyo género es no binarie recorre el feed y existe un rol publicado que busca no binarie y mujer
- **THEN** el sistema incluye ese rol entre las tarjetas

#### Scenario: Rol incompatible por género
- **WHEN** un talento cuyo género es varón recorre el feed y existe un rol publicado que busca únicamente mujer
- **THEN** el sistema no le muestra ese rol

#### Scenario: Rol sin géneros buscados
- **WHEN** existe un rol publicado sin géneros buscados especificados
- **THEN** el sistema lo muestra a cualquier talento, sin importar su género

#### Scenario: Talento que prefirió no declarar su género
- **WHEN** un talento que eligió "prefiero no decirlo" recorre el feed y existe un rol publicado que busca únicamente mujer
- **THEN** el sistema le muestra ese rol igual, porque no declarar el género no restringe qué convocatorias recibe

#### Scenario: Todo el filtrado ocurre en la base de datos
- **WHEN** el sistema arma el feed de un talento
- **THEN** aplica los filtros de edad, género, distancia, obras propias y roles ya clasificados en la consulta, y no descarta tarjetas ya traídas al dispositivo

## ADDED Requirements

### Requirement: Control del radio de búsqueda en el feed

El sistema SHALL permitir al talento ajustar desde el feed su radio de búsqueda y su unidad de distancia, SHALL expresar el radio en la unidad elegida sin conversiones intermedias visibles, y SHALL guardar ambos valores en su perfil.

#### Scenario: Ajuste del radio
- **WHEN** el talento elige un radio distinto desde el feed
- **THEN** el sistema recarga las tarjetas con el radio nuevo y lo guarda en su perfil

#### Scenario: Cambio de unidad desde el feed
- **WHEN** el talento cambia la unidad de kilómetros a millas
- **THEN** el sistema presenta las opciones de radio expresadas en millas y guarda la unidad elegida

#### Scenario: Feed vacío por radio demasiado chico
- **WHEN** no queda ninguna tarjeta porque todos los roles disponibles están fuera del radio elegido
- **THEN** el sistema informa que la causa es el radio y ofrece ampliarlo, distinguiéndolo del caso en que ya se recorrieron todas las convocatorias

#### Scenario: Feed vacío por haber recorrido todo
- **WHEN** no queda ninguna tarjeta porque el talento ya se postuló o descartó todos los roles compatibles
- **THEN** el sistema informa que no hay convocatorias nuevas, sin sugerir ampliar el radio
