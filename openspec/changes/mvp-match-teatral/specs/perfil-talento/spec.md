## ADDED Requirements

### Requirement: Ficha básica del talento

El sistema SHALL requerir nombre, fecha de nacimiento y locación para dar de alta un perfil de talento, y SHALL derivar la edad a partir de la fecha de nacimiento.

#### Scenario: Alta con datos completos
- **WHEN** un talento completa nombre, fecha de nacimiento y locación, y guarda
- **THEN** el sistema crea el perfil, calcula su edad a partir de la fecha de nacimiento y lo lleva al feed

#### Scenario: Falta un campo obligatorio
- **WHEN** el talento intenta guardar sin completar alguno de los campos obligatorios
- **THEN** el sistema no guarda y señala cada campo faltante

#### Scenario: Edad menor a la permitida
- **WHEN** el talento ingresa una fecha de nacimiento que implica menos de 16 años
- **THEN** el sistema rechaza el alta e informa que la plataforma es para mayores de 16

#### Scenario: La edad se mantiene actualizada
- **WHEN** se consulta la edad de un talento en cualquier momento posterior al alta
- **THEN** el sistema la calcula desde la fecha de nacimiento contra la fecha actual, sin depender de un valor guardado

### Requirement: Portfolio de fotos

El sistema SHALL permitir al talento cargar entre 3 y 5 fotos, y SHALL exigir al menos 3 para considerar el perfil completo.

#### Scenario: Carga de fotos dentro del rango
- **WHEN** el talento carga 3 fotos válidas
- **THEN** el sistema las almacena, las muestra en su portfolio y considera el requisito de fotos cumplido

#### Scenario: Intento de guardar con menos de 3 fotos
- **WHEN** el talento intenta guardar su perfil con menos de 3 fotos cargadas
- **THEN** el sistema no completa el alta e indica cuántas fotos faltan

#### Scenario: Intento de cargar una sexta foto
- **WHEN** el talento ya tiene 5 fotos e intenta agregar otra
- **THEN** el sistema rechaza la carga e informa que el máximo es 5

#### Scenario: Archivo no admitido o demasiado grande
- **WHEN** el talento selecciona un archivo que no es una imagen JPEG, PNG o WebP, o que supera los 5 MB
- **THEN** el sistema rechaza la carga e indica el motivo

#### Scenario: Eliminación de una foto
- **WHEN** el talento elimina una foto de su portfolio
- **THEN** el sistema la quita del portfolio y del almacenamiento

#### Scenario: Foto principal
- **WHEN** el talento reordena sus fotos
- **THEN** el sistema usa la primera como foto principal en las tarjetas y listados donde aparezca el talento

### Requirement: Link a videoreel externo

El sistema SHALL permitir asociar al perfil un enlace a un videoreel alojado en YouTube o Vimeo, y NO SHALL almacenar archivos de video.

#### Scenario: Enlace válido de YouTube o Vimeo
- **WHEN** el talento ingresa una URL de YouTube o Vimeo
- **THEN** el sistema la guarda y muestra el video embebido en el perfil

#### Scenario: Enlace de una plataforma no admitida
- **WHEN** el talento ingresa una URL que no corresponde a YouTube ni a Vimeo
- **THEN** el sistema no la guarda e informa qué plataformas están admitidas

#### Scenario: Perfil sin videoreel
- **WHEN** el talento guarda su perfil sin cargar un enlace de videoreel
- **THEN** el sistema completa el alta igual, porque el videoreel es opcional

### Requirement: CV en texto y habilidades

El sistema SHALL permitir al talento describir su experiencia en texto libre y declarar habilidades desde una lista predefinida.

#### Scenario: Carga de experiencia
- **WHEN** el talento escribe su experiencia en el campo de texto libre y guarda
- **THEN** el sistema la almacena y la muestra en su perfil

#### Scenario: Límite de extensión del texto
- **WHEN** el talento escribe más de 2000 caracteres de experiencia
- **THEN** el sistema impide seguir escribiendo e indica el límite

#### Scenario: Selección de habilidades
- **WHEN** el talento marca habilidades de la lista predefinida, como canto, danza, acrobacia, manejo de instrumentos o idiomas
- **THEN** el sistema las guarda y las muestra como etiquetas en su perfil

#### Scenario: Perfil sin habilidades declaradas
- **WHEN** el talento guarda su perfil sin marcar ninguna habilidad
- **THEN** el sistema completa el alta igual, porque las habilidades son opcionales

### Requirement: Edición del perfil propio

El sistema SHALL permitir al talento editar cualquier campo de su perfil después del alta, y SHALL impedir que edite el perfil de otra persona.

#### Scenario: Edición exitosa
- **WHEN** el talento modifica campos de su perfil y guarda
- **THEN** el sistema persiste los cambios y los refleja en las convocatorias donde ya se postuló

#### Scenario: Intento de editar un perfil ajeno
- **WHEN** una persona intenta modificar el perfil de otro talento
- **THEN** el sistema rechaza la operación

### Requirement: Visibilidad del perfil de talento

El sistema SHALL exponer el perfil de un talento a un creador únicamente cuando ese talento se haya postulado a alguno de los roles de ese creador.

#### Scenario: Creador con una postulación recibida
- **WHEN** un creador abre el perfil de un talento que se postuló a un rol de una obra suya
- **THEN** el sistema le muestra la ficha completa: fotos, videoreel, experiencia y habilidades

#### Scenario: Creador sin postulación de ese talento
- **WHEN** un creador intenta acceder al perfil de un talento que no se postuló a ninguna de sus obras
- **THEN** el sistema deniega el acceso
