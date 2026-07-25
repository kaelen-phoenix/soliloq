## ADDED Requirements

### Requirement: Ficha del creador

El sistema SHALL requerir nombre, tipo de creador y locación para dar de alta un perfil de creador, donde el tipo distingue entre `director_independiente` y `compania`.

#### Scenario: Alta como director independiente
- **WHEN** un creador elige el tipo `director_independiente`, completa nombre y locación, y guarda
- **THEN** el sistema crea el perfil y lo lleva a su tablero de obras

#### Scenario: Alta como compañía
- **WHEN** un creador elige el tipo `compania`, completa nombre de la compañía y locación, y guarda
- **THEN** el sistema crea el perfil identificándolo con el nombre de la compañía

#### Scenario: Falta un campo obligatorio
- **WHEN** el creador intenta guardar sin completar alguno de los campos obligatorios
- **THEN** el sistema no guarda y señala cada campo faltante

### Requirement: Descripción y foto del creador

El sistema SHALL permitir al creador cargar una descripción en texto libre y una imagen de perfil, ambas opcionales.

#### Scenario: Carga de descripción
- **WHEN** el creador escribe una descripción de hasta 1000 caracteres y guarda
- **THEN** el sistema la almacena y la muestra en su perfil y en las convocatorias que publique

#### Scenario: Carga de imagen de perfil
- **WHEN** el creador carga una imagen JPEG, PNG o WebP de hasta 5 MB
- **THEN** el sistema la almacena y la muestra junto a su nombre en las tarjetas de convocatoria

#### Scenario: Perfil sin descripción ni imagen
- **WHEN** el creador guarda su perfil sin descripción ni imagen
- **THEN** el sistema completa el alta igual y muestra un avatar genérico con su inicial

### Requirement: Historial de obras previas

El sistema SHALL permitir al creador registrar obras previas como respaldo de su trayectoria, de forma opcional e independiente de las convocatorias activas.

#### Scenario: Alta de una obra previa
- **WHEN** el creador agrega una obra previa con título, año y rol desempeñado
- **THEN** el sistema la guarda y la muestra en su historial ordenada del año más reciente al más antiguo

#### Scenario: Año inválido
- **WHEN** el creador ingresa un año futuro o anterior a 1900
- **THEN** el sistema rechaza el alta de esa obra e informa el rango admitido

#### Scenario: Eliminación de una obra previa
- **WHEN** el creador elimina una obra de su historial
- **THEN** el sistema la quita del historial sin afectar sus convocatorias activas

#### Scenario: Creador sin historial
- **WHEN** un talento ve el perfil de un creador que no cargó obras previas
- **THEN** el sistema omite la sección de historial en lugar de mostrarla vacía

### Requirement: Edición del perfil propio

El sistema SHALL permitir al creador editar su perfil después del alta, y SHALL impedir que edite el perfil de otro creador.

#### Scenario: Edición exitosa
- **WHEN** el creador modifica campos de su perfil y guarda
- **THEN** el sistema persiste los cambios y los refleja en sus convocatorias publicadas

#### Scenario: Intento de editar un perfil ajeno
- **WHEN** una persona intenta modificar el perfil de otro creador
- **THEN** el sistema rechaza la operación

### Requirement: Visibilidad pública del perfil de creador

El sistema SHALL exponer el perfil de un creador a cualquier talento autenticado, para que pueda evaluar a quién se está postulando.

#### Scenario: Talento consulta el creador de una convocatoria
- **WHEN** un talento abre el perfil del creador desde una tarjeta del feed
- **THEN** el sistema le muestra nombre, tipo, locación, descripción, imagen e historial de obras previas
