## MODIFIED Requirements

### Requirement: Ficha del creador

El sistema SHALL requerir nombre, tipo de creador y ubicación para dar de alta un perfil de creador, donde el tipo distingue entre `director_independiente` y `compania`, y SHALL admitir como ubicación cualquier lugar del mundo elegido por autocompletado, sin restricción por región.

#### Scenario: Alta como director independiente
- **WHEN** un creador elige el tipo `director_independiente`, completa nombre y ubicación, y guarda
- **THEN** el sistema crea el perfil y lo lleva a su tablero de obras

#### Scenario: Alta como compañía
- **WHEN** un creador elige el tipo `compania`, completa nombre de la compañía y ubicación, y guarda
- **THEN** el sistema crea el perfil identificándolo con el nombre de la compañía

#### Scenario: Alta desde cualquier país
- **WHEN** un creador elige una ubicación fuera de Argentina
- **THEN** el sistema la acepta sin restricciones y crea el perfil normalmente

#### Scenario: Falta un campo obligatorio
- **WHEN** el creador intenta guardar sin completar alguno de los campos obligatorios
- **THEN** el sistema no guarda y señala cada campo faltante

### Requirement: Edición del perfil propio

El sistema SHALL permitir al creador editar cualquier campo de su perfil después del alta, incluidas su ubicación y su unidad de distancia, y SHALL impedir que edite el perfil de otra persona.

#### Scenario: Edición exitosa
- **WHEN** el creador modifica campos de su perfil y guarda
- **THEN** el sistema persiste los cambios y los refleja donde su perfil se muestre

#### Scenario: Cambio de ubicación
- **WHEN** el creador elige una ubicación distinta y guarda
- **THEN** el sistema la persiste sin alterar la locación de ensayos de las obras ya creadas

#### Scenario: Intento de editar un perfil ajeno
- **WHEN** una persona intenta modificar el perfil de otro creador
- **THEN** el sistema rechaza la operación
