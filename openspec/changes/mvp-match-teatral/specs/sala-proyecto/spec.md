## ADDED Requirements

### Requirement: Creación automática de la sala de proyecto

El sistema SHALL crear automáticamente una sala de chat grupal por obra en cuanto exista al menos una postulación aprobada, incorporando al creador y a los talentos aprobados.

#### Scenario: Primera aprobación de la obra
- **WHEN** un creador aprueba la primera postulación de una obra
- **THEN** el sistema crea la sala de proyecto de esa obra e incorpora al creador y al talento aprobado

#### Scenario: Aprobaciones siguientes
- **WHEN** el creador aprueba otro talento en una obra que ya tiene sala
- **THEN** el sistema lo incorpora a la sala existente sin crear una sala nueva

#### Scenario: Una sala por obra
- **WHEN** una obra tiene varios roles con talentos aprobados
- **THEN** el sistema mantiene una única sala compartida por todo el elenco de esa obra

#### Scenario: Obra sin aprobados
- **WHEN** una obra publicada no tiene ninguna postulación aprobada
- **THEN** el sistema no crea sala de proyecto para esa obra

### Requirement: Integrantes de la sala

El sistema SHALL restringir el acceso a la sala al creador de la obra y a los talentos con postulación `aprobada` en ella.

#### Scenario: Acceso de un integrante
- **WHEN** un talento aprobado abre la sala de proyecto de esa obra
- **THEN** el sistema le muestra el historial de mensajes y le permite escribir

#### Scenario: Acceso de un no integrante
- **WHEN** una persona que no es el creador ni un talento aprobado intenta abrir la sala
- **THEN** el sistema deniega el acceso

#### Scenario: Salida por revocación de aprobación
- **WHEN** el creador revoca la aprobación de un talento que integraba la sala
- **THEN** el sistema lo quita de los integrantes, le corta el acceso y conserva los mensajes que ya había escrito

#### Scenario: Listado de integrantes
- **WHEN** un integrante abre la información de la sala
- **THEN** el sistema lista a los participantes con su nombre, su foto y el rol que ocupan en la obra

### Requirement: Mensajería en tiempo real

El sistema SHALL entregar los mensajes de la sala a todos los integrantes conectados sin que necesiten recargar la pantalla.

#### Scenario: Envío de un mensaje
- **WHEN** un integrante envía un mensaje de texto
- **THEN** el sistema lo persiste y lo muestra a todos los integrantes conectados en el momento

#### Scenario: Mensaje vacío
- **WHEN** un integrante intenta enviar un mensaje sin contenido o solo con espacios
- **THEN** el sistema no lo envía

#### Scenario: Límite de extensión
- **WHEN** un integrante intenta enviar un mensaje de más de 2000 caracteres
- **THEN** el sistema impide el envío e indica el límite

#### Scenario: Fallo de envío
- **WHEN** un mensaje no puede persistirse por un error de red
- **THEN** el sistema lo marca como no enviado y ofrece reintentar

#### Scenario: Reconexión
- **WHEN** un integrante pierde y recupera la conexión
- **THEN** el sistema restablece la escucha en tiempo real y recupera los mensajes que se perdió

### Requirement: Historial de la sala

El sistema SHALL conservar el historial completo de mensajes de la sala, ordenado cronológicamente e identificando autor y momento de envío.

#### Scenario: Apertura de una sala con historial
- **WHEN** un integrante abre una sala que ya tiene mensajes
- **THEN** el sistema muestra el historial en orden cronológico, con el nombre y la foto del autor y la hora de cada mensaje, posicionado en el mensaje más reciente

#### Scenario: Sala recién creada
- **WHEN** un integrante abre una sala sin mensajes
- **THEN** el sistema muestra un mensaje de bienvenida que explica para qué sirve la sala

#### Scenario: Persistencia tras el cierre de la obra
- **WHEN** el creador cierra la obra
- **THEN** el sistema mantiene la sala y su historial accesibles para los integrantes

### Requirement: Listado de salas

El sistema SHALL ofrecer a cada persona el listado de las salas que integra.

#### Scenario: Listado con salas
- **WHEN** una persona abre su listado de salas
- **THEN** el sistema muestra cada sala con el título de la obra y una vista previa del último mensaje

#### Scenario: Listado vacío
- **WHEN** una persona que no integra ninguna sala abre el listado
- **THEN** el sistema muestra un estado vacío explicando que las salas se abren al concretarse un match
