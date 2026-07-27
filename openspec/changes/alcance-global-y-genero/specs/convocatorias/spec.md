## MODIFIED Requirements

### Requirement: Creación de una obra

El sistema SHALL permitir a un creador dar de alta una obra con título, sinopsis, locación de ensayos y fecha estimada de estreno, quedando en estado `borrador` hasta su publicación, y SHALL registrar la locación de ensayos como un lugar del mundo elegido por autocompletado, con coordenadas, sin restricción por región.

#### Scenario: Alta de obra con datos completos
- **WHEN** un creador completa título, sinopsis y locación de ensayos, y guarda
- **THEN** el sistema crea la obra en estado `borrador`, la asocia a su perfil y lo lleva a la pantalla de definición de roles

#### Scenario: Locación de ensayos en cualquier país
- **WHEN** el creador elige como locación de ensayos un lugar fuera de Argentina
- **THEN** el sistema la acepta y la guarda con sus coordenadas

#### Scenario: Locación de ensayos escrita sin elegir sugerencia
- **WHEN** el creador escribe una locación de ensayos pero no elige ninguna sugerencia del autocompletado
- **THEN** el sistema no crea la obra e indica que debe elegir un lugar de la lista

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

El sistema SHALL permitir al creador definir uno o más roles a cubrir dentro de una obra, cada uno con nombre, tipo, rango etario buscado, cantidad de vacantes, descripción y géneros buscados, donde los géneros buscados son opcionales y admiten más de un valor.

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

## ADDED Requirements

### Requirement: Géneros buscados por un rol

El sistema SHALL permitir al creador indicar en cada rol uno o más géneros buscados de la lista cerrada compuesta por mujer, varón, no binarie y otro, SHALL tratar la ausencia de géneros como abierto a cualquier género, y SHALL usar la ausencia como valor por defecto.

#### Scenario: Rol sin géneros especificados
- **WHEN** el creador da de alta un rol sin marcar ningún género buscado
- **THEN** el sistema lo crea como abierto a cualquier género

#### Scenario: Rol con un género buscado
- **WHEN** el creador marca un único género buscado en un rol
- **THEN** el sistema lo persiste y el rol queda dirigido a ese género

#### Scenario: Rol con varios géneros buscados
- **WHEN** el creador marca dos o más géneros buscados en un rol
- **THEN** el sistema los persiste todos y el rol queda dirigido a cualquiera de ellos

#### Scenario: Quitar los géneros de un rol existente
- **WHEN** el creador desmarca todos los géneros buscados de un rol y guarda
- **THEN** el sistema vuelve a tratar el rol como abierto a cualquier género

#### Scenario: Roles creados antes de esta capacidad
- **WHEN** el sistema evalúa un rol dado de alta antes de que existieran los géneros buscados
- **THEN** lo trata como abierto a cualquier género

#### Scenario: Cambio de géneros en un rol con postulaciones
- **WHEN** el creador modifica los géneros buscados de un rol que ya recibió postulaciones
- **THEN** el sistema aplica el cambio y conserva las postulaciones existentes, aunque el talento haya quedado fuera de los nuevos géneros
