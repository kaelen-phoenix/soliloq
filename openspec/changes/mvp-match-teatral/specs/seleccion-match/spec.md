## ADDED Requirements

### Requirement: Bandeja de postulantes por rol

El sistema SHALL presentar al creador los postulantes agrupados por rol de cada obra suya, priorizando la lectura visual inmediata: foto principal, nombre, edad y locación.

#### Scenario: Revisión de postulantes
- **WHEN** el creador abre un rol de una obra suya que tiene postulaciones
- **THEN** el sistema lista los postulantes con su foto principal, nombre, edad y locación, ordenados del más reciente al más antiguo

#### Scenario: Rol sin postulaciones
- **WHEN** el creador abre un rol que todavía no recibió postulaciones
- **THEN** el sistema muestra un estado vacío indicando que aún no hay postulantes

#### Scenario: Acceso rápido al material del postulante
- **WHEN** el creador toca un postulante de la lista
- **THEN** el sistema despliega sus fotos, su videoreel embebido, su experiencia y sus habilidades sin salir de la pantalla de revisión

#### Scenario: Aislamiento entre creadores
- **WHEN** un creador intenta abrir la bandeja de postulantes de un rol de otra obra que no le pertenece
- **THEN** el sistema deniega el acceso

### Requirement: Clasificación de postulantes

El sistema SHALL permitir al creador clasificar cada postulación en `rechazado`, `en_duda` o `aprobado`, y SHALL permitir cambiar esa clasificación mientras la obra no esté cerrada.

#### Scenario: Aprobación de un postulante
- **WHEN** el creador clasifica una postulación como `aprobado`
- **THEN** el sistema registra el estado, lo cuenta contra las vacantes del rol y genera la notificación de match para ese talento

#### Scenario: Rechazo de un postulante
- **WHEN** el creador clasifica una postulación como `rechazado`
- **THEN** el sistema registra el estado y no genera ninguna notificación para el talento

#### Scenario: Postulante marcado en duda
- **WHEN** el creador clasifica una postulación como `en_duda`
- **THEN** el sistema la mantiene disponible para revisión posterior y no genera notificación

#### Scenario: Cambio de decisión de en duda a aprobado
- **WHEN** el creador reclasifica como `aprobado` una postulación que estaba `en_duda`
- **THEN** el sistema actualiza el estado y genera la notificación de match

#### Scenario: Revocación de una aprobación
- **WHEN** el creador reclasifica como `rechazado` una postulación que estaba `aprobada`
- **THEN** el sistema libera la vacante correspondiente y quita al talento de la sala de proyecto si ya había sido incorporado

#### Scenario: Clasificación en una obra cerrada
- **WHEN** el creador intenta clasificar una postulación de una obra en estado `cerrada`
- **THEN** el sistema rechaza la operación

### Requirement: Control de vacantes por rol

El sistema SHALL impedir que la cantidad de postulaciones aprobadas de un rol supere sus vacantes definidas.

#### Scenario: Aprobación dentro de las vacantes
- **WHEN** el creador aprueba un postulante para un rol de 2 vacantes que tiene 1 aprobado
- **THEN** el sistema registra la aprobación y marca el rol como cubierto

#### Scenario: Aprobación que excede las vacantes
- **WHEN** el creador intenta aprobar un postulante para un rol cuyas vacantes ya están cubiertas
- **THEN** el sistema rechaza la aprobación e informa que debe liberar una vacante primero

#### Scenario: Indicador de progreso del casting
- **WHEN** el creador ve la lista de roles de una obra
- **THEN** el sistema muestra para cada rol cuántas vacantes están cubiertas sobre el total

### Requirement: Revisión ágil por lotes

El sistema SHALL permitir clasificar postulantes de forma consecutiva sin recargar la pantalla ni perder la posición en la lista.

#### Scenario: Clasificaciones consecutivas
- **WHEN** el creador clasifica un postulante
- **THEN** el sistema aplica el cambio de inmediato en la interfaz y presenta el postulante siguiente sin recargar la pantalla

#### Scenario: Fallo al guardar una clasificación
- **WHEN** una clasificación no puede persistirse por un error de red
- **THEN** el sistema revierte el cambio en pantalla, informa el fallo y permite reintentar
