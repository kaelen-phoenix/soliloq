## MODIFIED Requirements

### Requirement: Ficha básica del talento

El sistema SHALL requerir nombre, fecha de nacimiento, ubicación y género para dar de alta un perfil de talento, SHALL derivar la edad a partir de la fecha de nacimiento, y SHALL admitir como ubicación cualquier lugar del mundo elegido por autocompletado, sin restricción por región.

#### Scenario: Alta con datos completos
- **WHEN** un talento completa nombre, fecha de nacimiento, ubicación y género, y guarda
- **THEN** el sistema crea el perfil, calcula su edad a partir de la fecha de nacimiento y lo lleva al feed

#### Scenario: Alta desde cualquier país
- **WHEN** un talento elige una ubicación fuera de Argentina
- **THEN** el sistema la acepta sin restricciones y crea el perfil normalmente

#### Scenario: Falta un campo obligatorio
- **WHEN** el talento intenta guardar sin completar alguno de los campos obligatorios
- **THEN** el sistema no guarda y señala cada campo faltante

#### Scenario: Edad menor a la permitida
- **WHEN** el talento ingresa una fecha de nacimiento que implica menos de 16 años
- **THEN** el sistema rechaza el alta e informa que la plataforma es para mayores de 16

#### Scenario: La edad se mantiene actualizada
- **WHEN** se consulta la edad de un talento en cualquier momento posterior al alta
- **THEN** el sistema la calcula desde la fecha de nacimiento contra la fecha actual, sin depender de un valor guardado

### Requirement: Edición del perfil propio

El sistema SHALL permitir al talento editar cualquier campo de su perfil después del alta, incluidos su ubicación, su género, su autodescripción de género y su unidad de distancia, y SHALL impedir que edite el perfil de otra persona.

#### Scenario: Edición exitosa
- **WHEN** el talento modifica campos de su perfil y guarda
- **THEN** el sistema persiste los cambios y los refleja en las convocatorias donde ya se postuló

#### Scenario: Cambio de género
- **WHEN** el talento cambia su género y guarda
- **THEN** el sistema lo persiste y aplica el nuevo valor al filtrado del feed desde la siguiente consulta

#### Scenario: Cambio de ubicación
- **WHEN** el talento elige una ubicación distinta y guarda
- **THEN** el sistema la persiste y el filtro de distancia del feed pasa a medirse desde el lugar nuevo

#### Scenario: Intento de editar un perfil ajeno
- **WHEN** una persona intenta modificar el perfil de otro talento
- **THEN** el sistema rechaza la operación

## ADDED Requirements

### Requirement: Género del talento

El sistema SHALL requerir que el talento elija su género de una lista cerrada compuesta por mujer, varón, no binarie, otro y prefiero no decirlo, y SHALL ofrecer además un campo de texto libre opcional de hasta 60 caracteres para que se autodescriba.

#### Scenario: Elección de una opción de la lista
- **WHEN** el talento elige una de las opciones de género disponibles y guarda
- **THEN** el sistema la persiste en su perfil

#### Scenario: Autodescripción libre
- **WHEN** el talento completa el campo de autodescripción de género
- **THEN** el sistema lo persiste y lo muestra junto al género en su perfil y en su ficha de postulante

#### Scenario: Autodescripción vacía
- **WHEN** el talento guarda sin completar la autodescripción
- **THEN** el sistema guarda el perfil igual, porque el campo es opcional

#### Scenario: Autodescripción demasiado larga
- **WHEN** el talento ingresa más de 60 caracteres en la autodescripción
- **THEN** el sistema no guarda e informa el límite

#### Scenario: Preferir no declarar el género
- **WHEN** el talento elige "prefiero no decirlo"
- **THEN** el sistema acepta el alta y lo trata como compatible con roles de cualquier género buscado

#### Scenario: La autodescripción no se usa para filtrar
- **WHEN** el sistema filtra el feed o cualquier listado por género
- **THEN** usa exclusivamente la opción de la lista cerrada y nunca el texto de autodescripción

### Requirement: Preferencias de búsqueda del talento

El sistema SHALL guardar en el perfil del talento su radio de búsqueda y su unidad de distancia, SHALL usar 50 kilómetros como radio inicial, y SHALL restaurar ambos valores al volver a abrir el feed.

#### Scenario: Radio inicial
- **WHEN** un talento entra al feed por primera vez tras crear su perfil
- **THEN** el sistema aplica un radio de 50 kilómetros, o su equivalente en millas si su unidad es millas

#### Scenario: Persistencia del radio elegido
- **WHEN** el talento cambia su radio de búsqueda y más tarde vuelve a abrir el feed
- **THEN** el sistema aplica el radio que había elegido

#### Scenario: Búsqueda sin límite de distancia
- **WHEN** el talento elige buscar en todo el mundo
- **THEN** el sistema guarda esa elección y no aplica ningún filtro de distancia al feed
