## ADDED Requirements

### Requirement: Notificación de match al talento

El sistema SHALL generar una notificación in-app dirigida al talento cuando un creador aprueba su postulación.

#### Scenario: Aprobación genera notificación
- **WHEN** un creador clasifica una postulación como `aprobado`
- **THEN** el sistema crea una notificación de tipo `match` para ese talento, con el nombre de la obra, el rol y el creador

#### Scenario: Contenido accionable
- **WHEN** el talento abre una notificación de match
- **THEN** el sistema lo lleva al detalle de la obra y del rol para el que fue aprobado

#### Scenario: Rechazo no notifica
- **WHEN** un creador clasifica una postulación como `rechazado` o `en_duda`
- **THEN** el sistema no crea ninguna notificación para ese talento

#### Scenario: Reaprobación tras una revocación
- **WHEN** un creador revoca una aprobación y luego vuelve a aprobar al mismo talento para el mismo rol
- **THEN** el sistema genera una nueva notificación de match

### Requirement: Notificación de apertura de sala de proyecto

El sistema SHALL notificar a todos los integrantes de una obra cuando se crea su sala de proyecto.

#### Scenario: Creación de la sala
- **WHEN** se crea la sala de proyecto de una obra
- **THEN** el sistema crea una notificación de tipo `sala_creada` para cada talento aprobado y para el creador

#### Scenario: Incorporación posterior a la sala
- **WHEN** un talento es aprobado después de que la sala ya existe y queda incorporado a ella
- **THEN** el sistema le crea una notificación de tipo `sala_creada` con acceso directo a la sala

### Requirement: Bandeja de notificaciones con badge

El sistema SHALL exponer una bandeja de notificaciones accesible desde toda la aplicación, con un badge que indique la cantidad de notificaciones no leídas.

#### Scenario: Badge con notificaciones pendientes
- **WHEN** una persona tiene notificaciones no leídas
- **THEN** el sistema muestra el badge con la cantidad exacta sobre el ícono de la campanita

#### Scenario: Sin notificaciones pendientes
- **WHEN** una persona no tiene notificaciones no leídas
- **THEN** el sistema no muestra el badge

#### Scenario: Lectura de la bandeja
- **WHEN** la persona abre la bandeja
- **THEN** el sistema lista sus notificaciones de la más reciente a la más antigua, distinguiendo visualmente las no leídas

#### Scenario: Marcado como leída
- **WHEN** la persona abre una notificación
- **THEN** el sistema la marca como leída y actualiza el badge

#### Scenario: Marcar todas como leídas
- **WHEN** la persona elige "marcar todas como leídas"
- **THEN** el sistema marca como leídas todas sus notificaciones y oculta el badge

#### Scenario: Bandeja vacía
- **WHEN** una persona sin notificaciones abre la bandeja
- **THEN** el sistema muestra un estado vacío explicando qué tipo de avisos va a recibir ahí

### Requirement: Aislamiento y alcance de las notificaciones

El sistema SHALL entregar a cada persona únicamente sus propias notificaciones y NO SHALL enviar avisos por email ni push en este prototipo.

#### Scenario: Aislamiento entre cuentas
- **WHEN** una persona consulta su bandeja
- **THEN** el sistema no incluye notificaciones dirigidas a otras cuentas

#### Scenario: Sin canales externos
- **WHEN** se genera cualquier notificación
- **THEN** el sistema la entrega únicamente dentro de la aplicación, sin enviar correo ni push
