## ADDED Requirements

### Requirement: Creación de una obra

El sistema SHALL permitir a un creador dar de alta una obra con título, sinopsis, locación de ensayos y fecha estimada de estreno, quedando en estado `borrador` hasta su publicación.

#### Scenario: Alta de obra con datos completos
- **WHEN** un creador completa título, sinopsis y locación de ensayos, y guarda
- **THEN** el sistema crea la obra en estado `borrador`, la asocia a su perfil y lo lleva a la pantalla de definición de roles

#### Scenario: Falta un campo obligatorio
- **WHEN** el creador intenta guardar una obra sin título o sin locación de ensayos
- **THEN** el sistema no la crea y señala los campos faltantes

#### Scenario: Fecha de estreno opcional
- **WHEN** el creador guarda una obra sin fecha estimada de estreno
- **THEN** el sistema la crea igual, porque la fecha es opcional

#### Scenario: Un talento intenta crear una obra
- **WHEN** una persona con rol `talento` intenta crear una obra
- **THEN** el sistema rechaza la operación

### Requirement: Definición de roles de una obra

El sistema SHALL permitir al creador definir uno o más roles a cubrir dentro de una obra, cada uno con nombre, tipo, rango etario buscado, cantidad de vacantes y descripción.

#### Scenario: Alta de un rol
- **WHEN** el creador agrega un rol con nombre, tipo `actuacion` o `tecnica`, rango etario, vacantes y descripción
- **THEN** el sistema lo asocia a la obra y lo muestra en su lista de roles

#### Scenario: Rango etario inválido
- **WHEN** el creador define un rango cuya edad mínima es mayor que la máxima
- **THEN** el sistema rechaza el alta del rol e informa el error

#### Scenario: Cantidad de vacantes inválida
- **WHEN** el creador define un rol con cero o menos vacantes
- **THEN** el sistema rechaza el alta e informa que debe haber al menos una vacante

#### Scenario: Rol técnico sin rango etario
- **WHEN** el creador da de alta un rol de tipo `tecnica` sin especificar rango etario
- **THEN** el sistema lo crea igual y lo trata como abierto a cualquier edad

#### Scenario: Edición de un rol sin postulaciones
- **WHEN** el creador modifica un rol que todavía no recibió postulaciones
- **THEN** el sistema aplica los cambios

#### Scenario: Edición de un rol con postulaciones
- **WHEN** el creador modifica el rango etario de un rol que ya recibió postulaciones
- **THEN** el sistema aplica los cambios y conserva las postulaciones existentes, aunque el talento haya quedado fuera del nuevo rango

### Requirement: Publicación de una obra

El sistema SHALL exigir al menos un rol definido para pasar una obra de `borrador` a `publicada`, y solo las obras publicadas SHALL aparecer en el feed de los talentos.

#### Scenario: Publicación con roles definidos
- **WHEN** el creador publica una obra que tiene al menos un rol
- **THEN** el sistema la pasa a estado `publicada` y sus roles pasan a estar disponibles en el feed

#### Scenario: Intento de publicar sin roles
- **WHEN** el creador intenta publicar una obra sin ningún rol definido
- **THEN** el sistema no la publica e indica que debe definir al menos un rol

#### Scenario: Obra en borrador no visible
- **WHEN** un talento recorre el feed
- **THEN** el sistema no le muestra roles de obras en estado `borrador`

### Requirement: Cierre de una obra

El sistema SHALL permitir al creador cerrar una obra publicada, retirándola del feed sin borrar sus postulaciones ni su sala de proyecto.

#### Scenario: Cierre de obra
- **WHEN** el creador cierra una obra publicada
- **THEN** el sistema la pasa a estado `cerrada` y deja de mostrar sus roles en el feed

#### Scenario: Postulación a un rol de obra cerrada
- **WHEN** un talento intenta postularse a un rol de una obra que fue cerrada mientras la tenía en pantalla
- **THEN** el sistema rechaza la postulación e informa que la convocatoria ya cerró

#### Scenario: La sala sobrevive al cierre
- **WHEN** se cierra una obra que ya tiene sala de proyecto
- **THEN** el sistema mantiene la sala accesible para sus integrantes

### Requirement: Tablero de obras del creador

El sistema SHALL ofrecer al creador un tablero con sus obras, su estado y el conteo de postulaciones pendientes de revisión.

#### Scenario: Tablero con obras
- **WHEN** el creador abre su tablero
- **THEN** el sistema lista sus obras con título, estado y cantidad de postulaciones sin clasificar

#### Scenario: Tablero vacío
- **WHEN** un creador recién registrado abre su tablero
- **THEN** el sistema muestra un estado vacío que invita a crear su primera obra

#### Scenario: Aislamiento entre creadores
- **WHEN** un creador abre su tablero
- **THEN** el sistema no incluye obras de otros creadores
