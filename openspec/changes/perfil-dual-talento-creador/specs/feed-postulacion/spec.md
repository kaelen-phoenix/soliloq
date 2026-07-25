## MODIFIED Requirements

### Requirement: Filtrado del feed según el perfil del talento

El sistema SHALL mostrar en el feed únicamente roles de obras publicadas cuyo rango etario contenga la edad del talento, excluyendo aquellos a los que ya se postuló, los que ya descartó y los pertenecientes a obras de su propio perfil de creador.

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

#### Scenario: Filtro opcional por locación
- **WHEN** el talento activa el filtro de locación
- **THEN** el sistema limita las tarjetas a roles de obras cuya locación de ensayos coincide con la suya

### Requirement: Postulación a un rol

El sistema SHALL registrar una postulación cuando el talento manifiesta interés en un rol, en estado inicial `pendiente`, SHALL admitir una única postulación por talento y rol, y SHALL rechazar la postulación a un rol de una obra propia.

#### Scenario: Postulación exitosa
- **WHEN** el talento desliza la tarjeta hacia la derecha o toca el botón de postularse
- **THEN** el sistema crea la postulación en estado `pendiente`, confirma visualmente la acción y avanza a la tarjeta siguiente

#### Scenario: Postulación duplicada
- **WHEN** llega una segunda postulación del mismo talento al mismo rol
- **THEN** el sistema no crea un registro nuevo y conserva la postulación y el estado existentes

#### Scenario: Postulación con perfil incompleto
- **WHEN** una persona sin perfil de talento creado intenta postularse
- **THEN** el sistema no registra la postulación y la deriva a crear su perfil de talento

#### Scenario: Postulación a un rol sin vacantes disponibles
- **WHEN** el talento intenta postularse a un rol cuyas vacantes ya fueron cubiertas
- **THEN** el sistema rechaza la postulación e informa que el rol ya está cubierto

#### Scenario: Postulación a una obra propia
- **WHEN** llega una postulación de una persona a un rol de una obra cuyo creador es esa misma persona
- **THEN** el sistema la rechaza

#### Scenario: Postulación a varios roles de la misma obra
- **WHEN** el talento se postula a dos roles distintos de la misma obra
- **THEN** el sistema registra ambas postulaciones de forma independiente
