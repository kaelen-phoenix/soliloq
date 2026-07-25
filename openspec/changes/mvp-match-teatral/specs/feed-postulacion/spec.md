## ADDED Requirements

### Requirement: Feed de tarjetas deslizables

El sistema SHALL presentar al talento las convocatorias disponibles como una pila de tarjetas de a una por vez, priorizando la lectura visual: título de la obra, nombre del rol, creador, locación y rango etario.

#### Scenario: Recorrido del feed
- **WHEN** un talento con perfil completo abre el feed
- **THEN** el sistema le muestra la primera tarjeta de rol disponible y precarga las siguientes para que el avance sea inmediato

#### Scenario: Descarte de una tarjeta
- **WHEN** el talento desliza la tarjeta hacia la izquierda o toca el botón de descartar
- **THEN** el sistema registra el descarte, avanza a la tarjeta siguiente y no vuelve a mostrarle ese rol

#### Scenario: Detalle de la convocatoria
- **WHEN** el talento toca la tarjeta
- **THEN** el sistema despliega la descripción completa del rol, la sinopsis de la obra y un acceso al perfil del creador, sin sacarlo del feed

#### Scenario: Feed agotado
- **WHEN** el talento clasificó todas las tarjetas disponibles
- **THEN** el sistema muestra un estado vacío que indica que no hay convocatorias nuevas por ahora

### Requirement: Filtrado del feed según el perfil del talento

El sistema SHALL mostrar en el feed únicamente roles de obras publicadas cuyo rango etario contenga la edad del talento, excluyendo aquellos a los que ya se postuló o que ya descartó.

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

#### Scenario: Filtro opcional por locación
- **WHEN** el talento activa el filtro de locación
- **THEN** el sistema limita las tarjetas a roles de obras cuya locación de ensayos coincide con la suya

### Requirement: Postulación a un rol

El sistema SHALL registrar una postulación cuando el talento manifiesta interés en un rol, en estado inicial `pendiente`, y SHALL admitir una única postulación por talento y rol.

#### Scenario: Postulación exitosa
- **WHEN** el talento desliza la tarjeta hacia la derecha o toca el botón de postularse
- **THEN** el sistema crea la postulación en estado `pendiente`, confirma visualmente la acción y avanza a la tarjeta siguiente

#### Scenario: Postulación duplicada
- **WHEN** llega una segunda postulación del mismo talento al mismo rol
- **THEN** el sistema no crea un registro nuevo y conserva la postulación y el estado existentes

#### Scenario: Postulación con perfil incompleto
- **WHEN** un talento sin perfil completo intenta postularse
- **THEN** el sistema no registra la postulación y lo deriva a completar su perfil

#### Scenario: Postulación a un rol sin vacantes disponibles
- **WHEN** el talento intenta postularse a un rol cuyas vacantes ya fueron cubiertas
- **THEN** el sistema rechaza la postulación e informa que el rol ya está cubierto

#### Scenario: Postulación a varios roles de la misma obra
- **WHEN** el talento se postula a dos roles distintos de la misma obra
- **THEN** el sistema registra ambas postulaciones de forma independiente

### Requirement: Listado de postulaciones del talento

El sistema SHALL ofrecer al talento un listado de sus postulaciones con el estado de cada una.

#### Scenario: Consulta de postulaciones
- **WHEN** el talento abre su listado de postulaciones
- **THEN** el sistema muestra cada una con obra, rol, creador y estado: `pendiente`, `en_duda`, `aprobado` o `rechazado`

#### Scenario: Sin postulaciones
- **WHEN** un talento que nunca se postuló abre el listado
- **THEN** el sistema muestra un estado vacío que lo invita a recorrer el feed

#### Scenario: Aislamiento entre talentos
- **WHEN** el talento abre su listado
- **THEN** el sistema no incluye postulaciones de otros talentos
